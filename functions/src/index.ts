/**
 * Firebase Cloud Functions for Stammtisch Web App
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
// import * as logger from 'firebase-functions/logger';
import * as admin from 'firebase-admin';
import * as cloudinary from 'cloudinary';
import { addDays, startOfDay, endOfDay, format } from 'date-fns';
import { de } from 'date-fns/locale';

import {
    sendPushToUsers,
    queueEmail,
    getMembersWithPreference
} from './notificationHelpers';

import {
    eventReminderTemplate,
    votingReminderTemplate,
    monthlyOverviewTemplate
} from './emailTemplates';

import {
    fetchPayPalBalance,
    fetchPayPalTransactions,
    paypalClientId,
    paypalClientSecret
} from './paypalService';

import {
    categorizeTransaction,
    findMemberIdByEmail
} from './categorization';

admin.initializeApp();
const db = admin.firestore();

// --- Cloudinary Configuration ---
const CLOUDINARY_CONFIG = {
    cloud_name: "doasrf18u",
    api_key: "271343821461348",
    api_secret: "Q6EA3q2rGrJ1glAMF4_koOoqAiA"
};

cloudinary.v2.config(CLOUDINARY_CONFIG);

// --- Cloudinary Functions (Migrated to V2) ---

export const deleteCloudinaryImage = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Login erforderlich");
    }

    const { publicId } = request.data;
    if (!publicId) {
        throw new HttpsError("invalid-argument", "publicId fehlt");
    }

    try {
        const result = await cloudinary.v2.uploader.destroy(publicId, {
            resource_type: "image",
            invalidate: true,
        });

        if (result.result === "ok" || result.result === "not found") {
            return { success: true, result: result.result };
        } else {
            return { success: false, result: result.result };
        }
    } catch (error: any) {
        throw new HttpsError("internal", `Cloudinary Fehler: ${error.message}`);
    }
});

export const bulkDeleteCloudinaryImages = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Login erforderlich");
    }

    const { publicIds } = request.data;
    if (!publicIds || !Array.isArray(publicIds) || publicIds.length === 0) {
        throw new HttpsError("invalid-argument", "publicIds Array fehlt oder leer");
    }

    const results = [];
    for (const publicId of publicIds) {
        try {
            const result = await cloudinary.v2.uploader.destroy(publicId, {
                resource_type: "image",
                invalidate: true,
            });
            results.push({ publicId, success: result.result === "ok" || result.result === "not found", result: result.result });
        } catch (error: any) {
            results.push({ publicId, success: false, error: error.message });
        }
    }

    const successCount = results.filter(r => r.success).length;
    return { results, successCount, totalCount: publicIds.length };
});

// --- Scheduled Notification Functions (Migrated to V2) ---

// 1. Daily Event Reminder Check (09:00 Europe/Berlin)
export const dailyEventReminderCheck = onSchedule({
    schedule: "0 9 * * *",
    timeZone: "Europe/Berlin"
}, async (event) => {
    const today = new Date();
    const in7Days = addDays(today, 7);
    const tomorrow = addDays(today, 1);

    // Fetch events for 7 days (dates stored as "yyyy-MM-dd" strings)
    const in7DaysStr = format(in7Days, 'yyyy-MM-dd');
    const events7DaysSnap = await db.collection('set_events')
        .where('date', '==', in7DaysStr)
        .get();

    // Fetch events for tomorrow
    const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');
    const events1DaySnap = await db.collection('set_events')
        .where('date', '==', tomorrowStr)
        .get();

    // Process 7-day reminders
    if (!events7DaysSnap.empty) {
        const users = await getMembersWithPreference('eventReminder7Days');

        for (const doc of events7DaysSnap.docs) {
            const eventData = doc.data();
            const dateStr = new Date(eventData.date).toLocaleDateString('de-DE');
            const timeStr = eventData.time || 'Ganztägig';

            const pushPayload = {
                title: `In einer Woche: ${eventData.title}`,
                body: `Am ${dateStr} ist ${eventData.title} in ${eventData.location || 'Location tbd'}.`,
                url: '/events'
            };

            const emailContent = eventReminderTemplate(eventData.title, dateStr, timeStr, 7, 'https://stammtisch-web-app.web.app/events');

            // Send Pushes
            const pushTokens = users.filter(u => u.pushEnabled && u.fcmToken).map(u => u.fcmToken!);
            if (pushTokens.length > 0) await sendPushToUsers(pushTokens, pushPayload);

            // Queue Emails
            for (const user of users.filter(u => u.emailEnabled && u.email)) {
                await queueEmail(user.email, emailContent.subject, emailContent.html, emailContent.text);
            }
        }
    }

    // Process 1-day reminders
    if (!events1DaySnap.empty) {
        const users = await getMembersWithPreference('eventReminder1Day');

        for (const doc of events1DaySnap.docs) {
            const eventData = doc.data();
            const dateStr = new Date(eventData.date).toLocaleDateString('de-DE');
            const timeStr = eventData.time || 'Ganztägig';

            const pushPayload = {
                title: `Morgen: ${eventData.title}`,
                body: `Vergiss nicht, morgen ist ${eventData.title}!`,
                url: '/events'
            };

            const emailContent = eventReminderTemplate(eventData.title, dateStr, timeStr, 1, 'https://stammtisch-web-app.web.app/events');

            // Send Pushes
            const pushTokens = users.filter(u => u.pushEnabled && u.fcmToken).map(u => u.fcmToken!);
            if (pushTokens.length > 0) await sendPushToUsers(pushTokens, pushPayload);

            // Queue Emails
            for (const user of users.filter(u => u.emailEnabled && u.email)) {
                await queueEmail(user.email, emailContent.subject, emailContent.html, emailContent.text);
            }
        }
    }
});

// 2. Voting Reminder (24th of month, 10:00 Europe/Berlin)
export const votingReminder = onSchedule({
    schedule: "0 10 24 * *",
    timeZone: "Europe/Berlin"
}, async (event) => {
    const today = new Date();
    // Calculate next month
    let targetMonth = today.getMonth() + 1;
    let targetYear = today.getFullYear();
    if (targetMonth > 11) {
        targetMonth = 0;
        targetYear++;
    }

    const nextMonthIndex = targetMonth; // 0-11
    const nextMonthName = format(new Date(targetYear, nextMonthIndex, 1), 'MMMM', { locale: de });

    // Get all votes for that month/year
    const votesSnap = await db.collection('stammtisch_votes')
        .where('month', '==', nextMonthIndex)
        .where('year', '==', targetYear)
        .get();

    const voterIds = new Set(votesSnap.docs.map(d => d.data().userId));

    // Get users who want reminder
    const candidateUsers = await getMembersWithPreference('votingReminder');

    // Filter those who haven't voted
    const usersToNotify = candidateUsers.filter(u => !voterIds.has(u.id));

    if (usersToNotify.length > 0) {
        const pushPayload = {
            title: `Abstimmung für ${nextMonthName} noch offen`,
            body: `Du hast noch nicht für den Stammtisch im ${nextMonthName} abgestimmt.`,
            url: '/events' // or where voting is
        };

        const emailContent = votingReminderTemplate(nextMonthName, 'https://stammtisch-web-app.web.app/events');

        // Send Pushes
        const pushTokens = usersToNotify.filter(u => u.pushEnabled && u.fcmToken).map(u => u.fcmToken!);
        if (pushTokens.length > 0) await sendPushToUsers(pushTokens, pushPayload);

        // Queue Emails
        for (const user of usersToNotify.filter(u => u.emailEnabled && u.email)) {
            await queueEmail(user.email, emailContent.subject, emailContent.html, emailContent.text);
        }
    }
});

// 3. Monthly Overview (1st of month, 09:00 Europe/Berlin)
export const monthlyOverview = onSchedule({
    schedule: "0 9 1 * *",
    timeZone: "Europe/Berlin"
}, async (event) => {
    const today = new Date();
    const startOfMonthDate = startOfDay(new Date(today.getFullYear(), today.getMonth(), 1));
    const endOfMonthDate = endOfDay(new Date(today.getFullYear(), today.getMonth() + 1, 0));

    const monthName = format(today, 'MMMM', { locale: de });
    const year = today.getFullYear();

    // Dates stored as "yyyy-MM-dd" strings — use string range comparison
    const startStr = format(startOfMonthDate, 'yyyy-MM-dd');
    const endStr = format(endOfMonthDate, 'yyyy-MM-dd');
    const eventsSnap = await db.collection('set_events')
        .where('date', '>=', startStr)
        .where('date', '<=', endStr)
        .orderBy('date', 'asc')
        .get();

    if (eventsSnap.empty) return;

    const events = eventsSnap.docs.map(doc => {
        const d = doc.data();
        return {
            name: d.title,
            date: new Date(d.date).toLocaleDateString('de-DE'),
            time: d.time || ''
        };
    });

    const users = await getMembersWithPreference('monthlyOverview');

    const pushPayload = {
        title: `Events im ${monthName} ${year}`,
        body: `${events.length} Events diesen Monat: ${events.map(e => e.name).join(', ')}`,
        url: '/dashboard'
    };

    const emailContent = monthlyOverviewTemplate(monthName, year, events, 'https://stammtisch-web-app.web.app/dashboard');

    // Send Pushes
    const pushTokens = users.filter(u => u.pushEnabled && u.fcmToken).map(u => u.fcmToken!);
    if (pushTokens.length > 0) await sendPushToUsers(pushTokens, pushPayload);

    // Queue Emails
    for (const user of users.filter(u => u.emailEnabled && u.email)) {
        await queueEmail(user.email, emailContent.subject, emailContent.html, emailContent.text);
    }
});

// --- PayPal Functions ---

export const getPayPalBalance = onCall({
    secrets: [paypalClientId, paypalClientSecret]
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Login erforderlich");
    }

    try {
        const balance = await fetchPayPalBalance();
        return { success: true, balance };
    } catch (error: any) {
        console.error('PayPal Balance Error:', error);
        throw new HttpsError("internal", `PayPal Fehler: ${error.message}`);
    }
});

export const syncPayPalTransactions = onCall({
    secrets: [paypalClientId, paypalClientSecret]
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Login erforderlich");
    }

    // Default to last 3 days if no dates provided
    const now = new Date();
    const defaultStart = format(addDays(now, -3), "yyyy-MM-dd'T'HH:mm:ss'Z'");
    const defaultEnd = format(now, "yyyy-MM-dd'T'HH:mm:ss'Z'");

    const startDate = request.data.startDate || defaultStart;
    const endDate = request.data.endDate || defaultEnd;

    try {
        const rawTransactions = await fetchPayPalTransactions(startDate, endDate);
        const results = [];

        for (const raw of rawTransactions) {
            const info = raw.transaction_info;
            const payer = raw.payer_info;
            const tid = info.transaction_id;

            // Check if exists
            const docRef = db.collection('paypal_transactions').doc(tid);
            const doc = await docRef.get();

            if (doc.exists) continue;

            const amount = parseFloat(info.transaction_amount.value);
            const fee = info.fee_amount ? parseFloat(info.fee_amount.value) : 0;
            const note = info.transaction_subject || info.transaction_note || '';
            const payerEmail = payer?.email_address;

            const category = categorizeTransaction(amount, note, payerEmail);
            const memberId = await findMemberIdByEmail(db, payerEmail);

            const tx: any = {
                id: tid,
                amount,
                fee,
                net: amount - fee,
                currency: info.transaction_amount.currency_code,
                payerEmail,
                payerName: payer?.payer_name?.alternate_full_name,
                note,
                date: info.transaction_updated_date,
                status: info.transaction_status,
                category,
                assignedMemberId: memberId,
                isReconciled: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            };

            // Reconciliation Logic
            if (memberId && (category === 'penalty' || category === 'contribution')) {
                const reconciled = await performReconciliation(memberId, category, amount, tid);
                if (reconciled) {
                    tx.isReconciled = true;
                    tx.reconciledAt = admin.firestore.FieldValue.serverTimestamp();
                    tx.linkedDocId = reconciled;
                }
            }

            await docRef.set(tx);
            results.push(tx);
        }

        return { success: true, count: results.length, transactions: results };
    } catch (error: any) {
        console.error('PayPal Sync Error:', error);
        throw new HttpsError("internal", `PayPal Sync Fehler: ${error.message}`);
    }
});

async function performReconciliation(memberId: string, category: string, amount: number, paypalTxId: string) {
    if (category === 'penalty') {
        const penaltiesSnap = await db.collection('penalties')
            .where('userId', '==', memberId)
            .where('isPaid', '==', false)
            .orderBy('date', 'asc')
            .limit(1)
            .get();

        if (!penaltiesSnap.empty) {
            const pDoc = penaltiesSnap.docs[0];
            await pDoc.ref.update({
                isPaid: true,
                paidViaReconciliation: true,
                reconciledAt: admin.firestore.FieldValue.serverTimestamp(),
                paypalTxId: paypalTxId
            });
            return pDoc.id;
        }
    } else if (category === 'contribution') {
        // Find oldest contribution not paid
        const contributionsSnap = await db.collection('contributions')
            .where('userId', '==', memberId)
            .where('isPaid', '==', false)
            .orderBy('year', 'asc')
            .orderBy('month', 'asc')
            .limit(1)
            .get();

        if (!contributionsSnap.empty) {
            const cDoc = contributionsSnap.docs[0];
            await cDoc.ref.update({
                isPaid: true,
                paypalTxId: paypalTxId
            });
            return cDoc.id;
        }
    }
    return null;
}
