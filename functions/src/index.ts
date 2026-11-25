/**
 * Firebase Cloud Functions for Stammtisch Web App
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { setGlobalOptions } from 'firebase-functions/v2';
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



admin.initializeApp();
const db = admin.firestore();

// Set global options for all functions
setGlobalOptions({
    region: 'us-central1'
});

// --- Cloudinary Configuration ---
const CLOUDINARY_CONFIG = {
    cloud_name: "doasrf18u",
    api_key: "271343821461348",
    api_secret: "Q6EA3q2rGrJ1glAMF4_koOoqAiA"
};

cloudinary.v2.config(CLOUDINARY_CONFIG);

// --- Cloudinary Functions ---

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

// --- Scheduled Notification Functions ---

export const dailyEventReminderCheck = onSchedule({
    schedule: "0 9 * * *",
    timeZone: "Europe/Berlin"
}, async (event) => {
    const today = new Date();
    const in7Days = addDays(today, 7);
    const tomorrow = addDays(today, 1);

    const in7DaysStr = format(in7Days, 'yyyy-MM-dd');
    const events7DaysSnap = await db.collection('set_events')
        .where('date', '==', in7DaysStr)
        .get();

    const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');
    const events1DaySnap = await db.collection('set_events')
        .where('date', '==', tomorrowStr)
        .get();

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
            const pushTokens = users.filter(u => u.pushEnabled && u.fcmToken).map(u => u.fcmToken!);
            if (pushTokens.length > 0) await sendPushToUsers(pushTokens, pushPayload);
            for (const user of users.filter(u => u.emailEnabled && u.email)) {
                await queueEmail(user.email, emailContent.subject, emailContent.html, emailContent.text);
            }
        }
    }

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
            const pushTokens = users.filter(u => u.pushEnabled && u.fcmToken).map(u => u.fcmToken!);
            if (pushTokens.length > 0) await sendPushToUsers(pushTokens, pushPayload);
            for (const user of users.filter(u => u.emailEnabled && u.email)) {
                await queueEmail(user.email, emailContent.subject, emailContent.html, emailContent.text);
            }
        }
    }
});

export const votingReminder = onSchedule({
    schedule: "0 10 24 * *",
    timeZone: "Europe/Berlin"
}, async (event) => {
    const today = new Date();
    let targetMonth = today.getMonth() + 1;
    let targetYear = today.getFullYear();
    if (targetMonth > 11) {
        targetMonth = 0;
        targetYear++;
    }
    const nextMonthIndex = targetMonth;
    const nextMonthName = format(new Date(targetYear, nextMonthIndex, 1), 'MMMM', { locale: de });
    const votesSnap = await db.collection('stammtisch_votes')
        .where('month', '==', nextMonthIndex)
        .where('year', '==', targetYear)
        .get();
    const voterIds = new Set(votesSnap.docs.map(d => d.data().userId));
    const candidateUsers = await getMembersWithPreference('votingReminder');
    const usersToNotify = candidateUsers.filter(u => !voterIds.has(u.id));

    if (usersToNotify.length > 0) {
        const pushPayload = {
            title: `Abstimmung für ${nextMonthName} noch offen`,
            body: `Du hast noch nicht für den Stammtisch im ${nextMonthName} abgestimmt.`,
            url: '/events'
        };
        const emailContent = votingReminderTemplate(nextMonthName, 'https://stammtisch-web-app.web.app/events');
        const pushTokens = usersToNotify.filter(u => u.pushEnabled && u.fcmToken).map(u => u.fcmToken!);
        if (pushTokens.length > 0) await sendPushToUsers(pushTokens, pushPayload);
        for (const user of usersToNotify.filter(u => u.emailEnabled && u.email)) {
            await queueEmail(user.email, emailContent.subject, emailContent.html, emailContent.text);
        }
    }
});

export const monthlyOverview = onSchedule({
    schedule: "0 9 1 * *",
    timeZone: "Europe/Berlin"
}, async (event) => {
    const today = new Date();
    const startOfMonthDate = startOfDay(new Date(today.getFullYear(), today.getMonth(), 1));
    const endOfMonthDate = endOfDay(new Date(today.getFullYear(), today.getMonth() + 1, 0));
    const monthName = format(today, 'MMMM', { locale: de });
    const year = today.getFullYear();
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
    const pushTokens = users.filter(u => u.pushEnabled && u.fcmToken).map(u => u.fcmToken!);
    if (pushTokens.length > 0) await sendPushToUsers(pushTokens, pushPayload);
    for (const user of users.filter(u => u.emailEnabled && u.email)) {
        await queueEmail(user.email, emailContent.subject, emailContent.html, emailContent.text);
    }
});

export const earlyVoterTokenBonus = onSchedule({
    schedule: "1 0 1 * *",
    timeZone: "Europe/Berlin"
}, async (event) => {
    // 1. Get current month/year in Europe/Berlin
    const berlinDateStr = new Date().toLocaleString("en-US", { timeZone: "Europe/Berlin" });
    const berlinDate = new Date(berlinDateStr);
    const currentMonth = berlinDate.getMonth(); // 0-11
    const currentYear = berlinDate.getFullYear();
    const bonusKey = `Early Voter Bonus ${currentMonth + 1}/${currentYear}`;

    console.log(`Running earlyVoterTokenBonus for ${bonusKey} at ${berlinDateStr}`);

    // Calculate start of this month in Berlin time
    const getBerlinStartOfMonthUTC = (year: number, m: number) => {
        const utcDate = new Date(Date.UTC(year, m, 1, 0, 0, 0));
        const tzStr = utcDate.toLocaleString("en-US", { timeZone: "Europe/Berlin" });
        const tzDate = new Date(tzStr);
        const diffMs = tzDate.getTime() - utcDate.getTime();
        return new Date(utcDate.getTime() - diffMs);
    };

    const monthStart = getBerlinStartOfMonthUTC(currentYear, currentMonth);
    const monthStartTimestamp = admin.firestore.Timestamp.fromDate(monthStart);

    // 2. Fetch all members
    const membersSnap = await db.collection('members').get();
    
    // 3. Fetch all votes for this month to filter in memory (safer, avoids composite index requirement)
    const votesSnap = await db.collection('stammtisch_votes')
        .where('month', '==', currentMonth)
        .where('year', '==', currentYear)
        .get();

    // Group votes by userId in memory
    const votesByMember: { [memberId: string]: any[] } = {};
    votesSnap.docs.forEach(docSnap => {
        const vote = docSnap.data();
        const createdAt = vote.createdAt;
        if (createdAt && createdAt.toMillis() < monthStartTimestamp.toMillis()) {
            if (!votesByMember[vote.userId]) {
                votesByMember[vote.userId] = [];
            }
            votesByMember[vote.userId].push(vote);
        }
    });

    const SHINY_CHANCE = 8192;
    const rollForShiny = () => Math.floor(Math.random() * SHINY_CHANCE) === 0;

    for (const memberDoc of membersSnap.docs) {
        const memberId = memberDoc.id;

        // Check if member already received the early voter bonus for this month
        const existingTxSnap = await db.collection('tokenTransactions')
            .where('memberId', '==', memberId)
            .where('category', '==', 'planning')
            .where('reason', '==', bonusKey)
            .limit(1)
            .get();

        if (!existingTxSnap.empty) {
            console.log(`Member ${memberId} already received bonus for ${bonusKey}`);
            continue;
        }

        const memberVotesCount = votesByMember[memberId]?.length || 0;
        if (memberVotesCount >= 2) {
            console.log(`Member ${memberId} voted for ${memberVotesCount} dates before start of month. Awarding token...`);
            
            const isShiny = rollForShiny();
            const tokenType = isShiny ? 'shiny' : 'regular';
            
            const transRef = db.collection('tokenTransactions').doc();
            const batch = db.batch();
            
            batch.set(transRef, {
                id: transRef.id,
                memberId,
                amount: 1,
                type: tokenType,
                category: 'planning',
                reason: bonusKey,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                year: currentYear
            });

            // Use atomic increment to avoid race conditions with stale snapshot data
            const updateField = isShiny ? 'tokenShinyBalance' : 'tokenBalance';
            batch.update(memberDoc.ref, {
                [updateField]: admin.firestore.FieldValue.increment(1)
            });

            await batch.commit();
            console.log(`Successfully awarded ${tokenType} token to member ${memberId}`);
        }
    }
});

import { processPayPalEmails } from './imapService';



// --- Automated PayPal (IMAP) Sync (every 5 minutes, 540s timeout) ---

export const syncPayPalEmailsCron = onSchedule({
    schedule: "every 5 minutes",
    timeZone: "Europe/Berlin",
    timeoutSeconds: 540,
    memory: "512MiB"
}, async (event) => {
    console.log('Running PayPal IMAP Sync...');
    await processPayPalEmails(db);
    console.log('PayPal IMAP Sync complete.');
});

// --- Manual HTTP Trigger for testing / debugging IMAP ---

export const triggerPayPalSync = onCall({ timeoutSeconds: 540 }, async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Login required');
    console.log('Manual PayPal sync triggered by:', request.auth.uid);
    await processPayPalEmails(db);
    return { success: true, message: 'Sync complete. Check logs for details.' };
});

export const migrateLegacyBalances = onCall(async (request) => {
    
    console.log("Starting legacy balance migration...");
    const membersSnap = await db.collection('members').get();
    let migratedCount = 0;
    
    for (const doc of membersSnap.docs) {
        const member = doc.data();
        const memberId = doc.id;
        
        // Fetch expenses for this member
        const expensesSnap = await db.collection('expenses').where('memberId', '==', memberId).get();
        let totalExpenses = 0;
        expensesSnap.forEach(e => totalExpenses += e.data().amount);
        
        // Fetch PAID penalties for this member (in old system, if they existed)
        const paidPenaltiesSnap = await db.collection('penalties')
            .where('userId', '==', memberId)
            .where('isPaid', '==', true)
            .get();
            
        let totalPaidPenalties = 0;
        paidPenaltiesSnap.forEach(p => totalPaidPenalties += p.data().amount);
        
        // Net starting balance based on old dashboard logic
        const netStartingBalance = totalExpenses - totalPaidPenalties;
        
        if (totalExpenses > 0 || totalPaidPenalties > 0) {
            const existingSnap = await db.collection('ledger_entries')
                .where('userId', '==', memberId)
                .where('description', '==', 'Übertrag Einzahlungen (Altsystem)')
                .get();
                
            if (existingSnap.empty) {
                await db.collection('ledger_entries').add({
                    userId: memberId,
                    amount: netStartingBalance,
                    type: 'paypal_deposit', 
                    description: 'Übertrag Einzahlungen (Altsystem)',
                    date: new Date().toISOString(),
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    isReconciled: true
                });
                console.log(`✅ Created ledger entry for ${member.name}: ${netStartingBalance}€`);
                migratedCount++;
            }
        }
    }
    
    return { success: true, message: `Migrated ${migratedCount} members.` };
});

// --- Backfill past monthly contributions (callable by admin) ---

export const backfillMonthlyContributions = onCall({ timeoutSeconds: 300 }, async (request) => {

    const { fromMonth, fromYear, toMonth, toYear, clubId = 'club_original' } = request.data as {
        fromMonth: number; fromYear: number; toMonth: number; toYear: number; clubId?: string;
    };

    const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
        'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

    const clubRef = db.collection('clubs').doc(clubId);
    const membersSnap = await clubRef.collection('members').get();
    const results: string[] = [];
    const batch = db.batch();

    // Iterate over months from → to
    let year = fromYear;
    let month = fromMonth;

    while (year < toYear || (year === toYear && month <= toMonth)) {
        // Exakter 1. des Monats um 12:00:00 UTC -> fällt in jeder Zeitzone (UTC & Europe/Berlin) garantiert auf den 01.MM.YYYY!
        const firstOfMonthDate = new Date(Date.UTC(year, month, 1, 12, 0, 0));
        const firstOfMonthIso = firstOfMonthDate.toISOString();
        const firstOfMonthTs = admin.firestore.Timestamp.fromDate(firstOfMonthDate);

        for (const memberDoc of membersSnap.docs) {
            const memberId = memberDoc.id;

            // Check if contribution already exists
            const existingContrib = await clubRef.collection('contributions')
                .where('userId', '==', memberId)
                .where('month', '==', month)
                .where('year', '==', year)
                .limit(1)
                .get();

            if (!existingContrib.empty) {
                results.push(`Skip: ${memberId} ${monthNames[month]}/${year} — already exists`);
                continue;
            }

            const compositeId = `${memberId}_${year}_${month}`;
            const contribRef = clubRef.collection('contributions').doc(compositeId);
            const contribPayload = {
                id: compositeId,
                userId: memberId,
                month,
                year,
                isPaid: true,
                paidViaReconciliation: true,
                reconciledAt: firstOfMonthTs,
            };
            batch.set(contribRef, contribPayload);

            // Immediately deduct from ledger dated on the 1st of the target month
            const entryRef = clubRef.collection('ledger_entries').doc();
            const ledgerPayload = {
                id: entryRef.id,
                userId: memberId,
                amount: -15,
                type: 'contribution',
                description: `Monatsbeitrag ${monthNames[month]} ${year}`,
                date: firstOfMonthIso,
                createdAt: firstOfMonthTs,
                linkedDocId: compositeId,
            };
            batch.set(entryRef, ledgerPayload);

            if (clubId === 'club_original') {
                batch.set(db.collection('contributions').doc(compositeId), contribPayload);
                batch.set(db.collection('ledger_entries').doc(entryRef.id), ledgerPayload);
            }

            results.push(`Created: ${memberId} ${monthNames[month]}/${year} (${firstOfMonthIso})`);
        }

        // Next month
        month++;
        if (month > 11) { month = 0; year++; }
    }
    
    await batch.commit();

    return { results, count: results.length };
});

// --- Monthly Contribution Deduction (Daily at 00:05 Europe/Berlin, per-club schedule & amount) ---

export const monthlyContributionDeduction = onSchedule({
    schedule: "5 0 * * *",
    timeZone: "Europe/Berlin"
}, async () => {
    const berlinParts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Berlin',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(new Date());

    const year = Number(berlinParts.find(p => p.type === 'year')?.value || new Date().getFullYear());
    const month1Based = Number(berlinParts.find(p => p.type === 'month')?.value || (new Date().getMonth() + 1));
    const dayOfMonth = Number(berlinParts.find(p => p.type === 'day')?.value || new Date().getDate());
    const month = month1Based - 1; // 0-11
    const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

    const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
        'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

    const bookingDate = new Date(Date.UTC(year, month, dayOfMonth, 12, 0, 0));
    const bookingIso = bookingDate.toISOString();
    const bookingTs = admin.firestore.Timestamp.fromDate(bookingDate);

    const clubsSnap = await db.collection('clubs').get();
    for (const clubDoc of clubsSnap.docs) {
        const clubData = clubDoc.data();
        const paymentConfig = clubData.paymentConfig || {};
        if (paymentConfig.autoBookContributions === false) continue;

        const configuredDay: number = typeof paymentConfig.monthlyContributionDay === 'number'
            ? paymentConfig.monthlyContributionDay
            : 1;
        const shouldRunToday = configuredDay === 0
            ? dayOfMonth === lastDayOfMonth
            : dayOfMonth === configuredDay;
        if (!shouldRunToday) continue;

        const amountEur: number = typeof paymentConfig.monthlyContributionEur === 'number'
            ? paymentConfig.monthlyContributionEur
            : 15;
        if (amountEur <= 0) continue;

        const clubRef = clubDoc.ref;
        const membersSnap = await clubRef.collection('members').get();
        const batch = db.batch();
        let writes = 0;

        for (const memberDoc of membersSnap.docs) {
            const memberId = memberDoc.id;
            const existingContrib = await clubRef.collection('contributions')
                .where('userId', '==', memberId)
                .where('month', '==', month)
                .where('year', '==', year)
                .limit(1)
                .get();

            if (!existingContrib.empty) continue;

            const compositeId = `${memberId}_${year}_${month}`;
            const contribRef = clubRef.collection('contributions').doc(compositeId);
            const contribPayload = {
                id: compositeId,
                userId: memberId,
                month,
                year,
                isPaid: true,
                paidViaReconciliation: true,
                reconciledAt: bookingTs,
            };
            batch.set(contribRef, contribPayload);

            const entryRef = clubRef.collection('ledger_entries').doc();
            const ledgerPayload = {
                id: entryRef.id,
                userId: memberId,
                amount: -amountEur,
                type: 'contribution',
                description: `Monatsbeitrag ${monthNames[month]} ${year}`,
                date: bookingIso,
                createdAt: bookingTs,
                linkedDocId: compositeId,
            };
            batch.set(entryRef, ledgerPayload);
            writes += 2;

            if (clubDoc.id === 'club_original') {
                batch.set(db.collection('contributions').doc(compositeId), contribPayload);
                batch.set(db.collection('ledger_entries').doc(entryRef.id), ledgerPayload);
                writes += 2;
            }
        }

        if (writes > 0) {
            await batch.commit();
            console.log(`[${clubDoc.id}] Booked monthly contribution (${amountEur}€) for ${monthNames[month]} ${year}`);
        }
    }
});

export const revertPre2026Contributions = onCall({ timeoutSeconds: 300 }, async (request) => {
    // 1. Find all contributions before 2026
    const contribsSnap = await db.collection('contributions').where('year', '<', 2026).get();
    
    let deletedContribs = 0;
    let deletedLedgerEntries = 0;
    let refundedLedgerEntries = 0;
    
    for (const doc of contribsSnap.docs) {
        const contribId = doc.id;
        
        // 2. Find any ledger_entries linked to this contribution
        const ledgerSnap = await db.collection('ledger_entries')
            .where('linkedDocId', '==', contribId)
            .get();
            
        // 3. Delete the ledger entries to restore the member's balance
        for (const ledgerDoc of ledgerSnap.docs) {
            await ledgerDoc.ref.delete();
            deletedLedgerEntries++;
            refundedLedgerEntries += Math.abs(ledgerDoc.data().amount);
        }
        
        // 4. Delete the contribution itself
        await doc.ref.delete();
        deletedContribs++;
    }
    
    return { 
        success: true, 
        message: `Deleted ${deletedContribs} pre-2026 contributions and ${deletedLedgerEntries} ledger entries (totaling ${refundedLedgerEntries} euro refunded).` 
    };
});

export const refundJanFeb2026Contributions = onCall({ timeoutSeconds: 300 }, async (request) => {
    // 1. Find all contributions for Jan (0) and Feb (1) of 2026
    const contribsSnap = await db.collection('contributions')
        .where('year', '==', 2026)
        .where('month', 'in', [0, 1])
        .get();
        
    let refundedLedgerEntries = 0;
    let count = 0;
    
    const batch = db.batch();
    
    for (const doc of contribsSnap.docs) {
        const contribId = doc.id;
        
        // 2. Find any ledger_entries linked to this contribution
        const ledgerSnap = await db.collection('ledger_entries')
            .where('linkedDocId', '==', contribId)
            .get();
            
        // 3. Delete the ledger entries to restore the member's balance
        for (const ledgerDoc of ledgerSnap.docs) {
            batch.delete(ledgerDoc.ref);
            refundedLedgerEntries += Math.abs(ledgerDoc.data().amount);
        }
        
        // 4. Ensure the contribution remains marked as paid so it's not charged again
        batch.update(doc.ref, { 
            isPaid: true,
            note: 'Bereits vor der Umstellung bezahlt'
        });
        
        count++;
    }
    
    await batch.commit();
    
    return { 
        success: true, 
        message: `Refunded ${count} contributions for Jan/Feb 2026 (totaling ${refundedLedgerEntries} euro added back to ledger balances).` 
    };
});
import { onRequest } from 'firebase-functions/v2/https';

export const migrateLedgerHttp = onRequest({ timeoutSeconds: 300 }, async (req, res) => {
    const batch = db.batch();
    let count = 0;

    // Migrate Penalties
    const pensSnap = await db.collection('penalties').where('isPaid', '==', false).get();
    for (const penDoc of pensSnap.docs) {
        const penData = penDoc.data();
        const amount = penData.amount || 0;
        
        batch.update(penDoc.ref, { isPaid: true, paidViaReconciliation: true, reconciledAt: admin.firestore.FieldValue.serverTimestamp() });
        
        const entryRef = db.collection('ledger_entries').doc();
        batch.set(entryRef, {
            id: entryRef.id,
            userId: penData.userId,
            amount: -amount,
            type: 'penalty',
            description: `Strafe: ${penData.reason || 'Kniffel-Strafe'}`,
            date: new Date().toISOString(),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            linkedDocId: penDoc.id,
        });
        count++;
    }

    // Migrate Contributions
    const contribSnap = await db.collection('contributions').where('isPaid', '==', false).get();
    const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
    for (const contribDoc of contribSnap.docs) {
        const cData = contribDoc.data();
        const amount = 15;
        
        batch.update(contribDoc.ref, { isPaid: true, paidViaReconciliation: true, reconciledAt: admin.firestore.FieldValue.serverTimestamp() });
        
        const entryRef = db.collection('ledger_entries').doc();
        batch.set(entryRef, {
            id: entryRef.id,
            userId: cData.userId,
            amount: -amount,
            type: 'contribution',
            description: `Monatsbeitrag ${monthNames[cData.month] || cData.month} ${cData.year}`,
            date: new Date().toISOString(),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            linkedDocId: contribDoc.id,
        });
        count++;
    }

    await batch.commit();
    res.json({ success: true, message: `Migrated ${count} unpaid items to ledger entries.` });
});



export const checkBalancesHttp = onRequest({ timeoutSeconds: 300 }, async (req, res) => {
    const ledgers = await db.collection('ledger_entries').get();
    const members = await db.collection('members').get();
    
    const balances: { [uid: string]: number } = {};
    const details: { [uid: string]: any[] } = {};

    ledgers.forEach(d => {
        const data = d.data();
        balances[data.userId] = (balances[data.userId] || 0) + data.amount;
        if (!details[data.userId]) details[data.userId] = [];
        details[data.userId].push(data);
    });

    const mdata: any = {};
    let negSum = 0;
    let posSum = 0;

    members.forEach(m => {
        const bal = balances[m.id] || 0;
        if (bal < 0) negSum += Math.abs(bal);
        if (bal > 0) posSum += bal;
        mdata[m.data().name] = { balance: bal, entries: details[m.id] };
    });

    res.json({ negSum, posSum, mdata });
});

export const fixLegacyDepositsV2 = onRequest({ timeoutSeconds: 300 }, async (req, res) => {
    const batch = db.batch();
    const pensSnap = await db.collection('penalties').where('isPaid', '==', true).get();
    const userSums: Record<string, number> = {};
    pensSnap.forEach(p => {
        const data = p.data();
        if (data.reconciledAt && data.reconciledAt._seconds < 1779800000) {
            userSums[data.userId] = (userSums[data.userId] || 0) + (data.amount || 0);
        }
    });
    const ledgersSnap = await db.collection('ledger_entries').where('type', '==', 'paypal_deposit').get();
    let count = 0;
    ledgersSnap.forEach(l => {
        const data = l.data();
        if (data.description && data.description.includes('(Altsystem)')) {
            const userId = data.userId;
            if (userSums[userId]) {
                const newAmount = data.amount + userSums[userId];
                batch.update(l.ref, { amount: newAmount, originalAmount: data.amount, adjustedForPrepaidPenalties: true });
                count++;
            }
        }
    });
    await batch.commit();
    res.json({ success: true, count, userSums });
});
export const checkMarcelPens = onRequest({ timeoutSeconds: 300 }, async (req, res) => { const s = await db.collection('penalties').where('userId', '==', 'VA4Rfwi83sYfbNYfPxrquz2SHcr1').get(); res.json(s.docs.map(d=>d.data())); });

export const fixMarcelBalanceAndCashPot = onRequest({ cors: true }, async (req, res) => {
    try {
        await db.collection('ledger_entries').doc('HEffqcFFVgcubLX6dnyO').delete();
        await db.doc('config/cash').set({ startingBalance: 645.66 }, { merge: true });
        res.json({ success: true, message: 'Deleted ledger HEffqcFFVgcubLX6dnyO and updated startingBalance to 645.66' });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

export const cleanDuplicates = onRequest({ cors: true, timeoutSeconds: 120 }, async (req, res) => {
    try {
        const penSnap = await db.collection('penalties').where('isPaid', '==', false).get();
        if (penSnap.empty) {
            res.json({ success: true, message: 'No unpaid penalties found.' });
            return;
        }

        let deletedCount = 0;
        const batch = db.batch();

        for (const penDoc of penSnap.docs) {
            const penId = penDoc.id;

            // Get all ledger entries for this penalty
            const ledgers = await db.collection('ledger_entries')
                .where('linkedDocId', '==', penId)
                .get();

            // If there's more than 1, delete the extras
            if (ledgers.docs.length > 1) {
                // Sort by createdAt just to be deterministic, keep the first one
                const sorted = ledgers.docs.sort((a, b) => {
                    const tA = a.data().createdAt?._seconds || 0;
                    const tB = b.data().createdAt?._seconds || 0;
                    return tA - tB;
                });

                // Delete all but the first
                for (let i = 1; i < sorted.length; i++) {
                    batch.delete(sorted[i].ref);
                    deletedCount++;
                }
            }
        }

        await batch.commit();

        res.json({ success: true, deletedCount, message: `Deleted ${deletedCount} duplicate ledger entries.` });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// =========================================================================
// PHASE 5: FAIL-SAFE SELF-SERVICE PAYMENT WEBHOOK / INBOUND MAIL ENDPOINT
// =========================================================================
import { createLedgerEntry } from './ledgerService';

export const inboundPaymentWebhook = onRequest({ cors: true, timeoutSeconds: 60 }, async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method Not Allowed' });
        return;
    }

    try {
        const body = req.body || {};
        // Unterstützt sowohl JSON-Payloads (Webhook/IPN) als auch weitergeleitete E-Mail-Payloads (Cloudflare/SendGrid/Mailgun)
        const rawNote = String(
            body.note ||
            body.custom ||
            body.memo ||
            body.subject ||
            body.text ||
            body.html ||
            JSON.stringify(body)
        );

        const txId = String(body.txn_id || body.transactionId || body.id || `webhook_${Date.now()}`);
        let rawAmount = parseFloat(String(body.mc_gross || body.amount?.value || body.amount || 0));
        if (!rawAmount || isNaN(rawAmount) || rawAmount <= 0) {
            // Fallback: Deutscher PayPal-Mail-Text ("15,00 €" oder "15.00 EUR")
            const amtMatch = rawNote.match(/(\d+(?:[.,]\d{1,2})?)\s*(?:€|EUR)/i);
            if (amtMatch) {
                rawAmount = parseFloat(amtMatch[1].replace(',', '.'));
            }
        }
        const txDateIso = body.payment_date
            ? new Date(body.payment_date).toISOString()
            : (body.dateIso || new Date().toISOString());

        const tokenMatch = rawNote.match(/\bKP-([A-Z0-9]{2,12})-([A-Z0-9]{4,8})-([A-F0-9]{4})\b/i);
        const queryClubId = typeof req.query.clubId === 'string' ? req.query.clubId.trim() : '';

        // 1. Resolve Club (entweder explizit über ?clubId= oder über das KP-Token)
        let targetClubId = queryClubId || 'club_original';
        if (!queryClubId && tokenMatch) {
            const clubPrefix = tokenMatch[1].toUpperCase();
            const clubsSnap = await db.collection('clubs').get();
            for (const cDoc of clubsSnap.docs) {
                const slugClean = String(cDoc.data().slug || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
                if (slugClean === clubPrefix || cDoc.id.toUpperCase().includes(clubPrefix)) {
                    targetClubId = cDoc.id;
                    break;
                }
            }
        }

        // 2. Verify Webhook Secret if configured on Club
        const targetClubSnap = await db.collection('clubs').doc(targetClubId).get();
        if (!targetClubSnap.exists) {
            res.status(404).json({ error: 'Target club not found.' });
            return;
        }
        const expectedSecret = targetClubSnap.data()?.paymentConfig?.webhookSecret;
        const providedSecret = String(req.query.secret || req.headers['x-kanpai-secret'] || body.secret || '');
        if (expectedSecret && providedSecret !== expectedSecret) {
            res.status(401).json({ error: 'Unauthorized: Invalid webhook secret.' });
            return;
        }

        // 3. Resolve Member inside Club (per KP-Token oder Absendername-Fallback)
        let matchedMemberId = 'system';
        let matchedMemberName = 'System / Kasse';
        const membersSnap = await db.collection('clubs').doc(targetClubId).collection('members').get();
        if (tokenMatch) {
            const userShort = tokenMatch[2].toUpperCase();
            for (const mDoc of membersSnap.docs) {
                const uidClean = mDoc.id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
                if (uidClean === userShort) {
                    matchedMemberId = mDoc.id;
                    matchedMemberName = mDoc.data().name || mDoc.id;
                    break;
                }
            }
        }
        if (matchedMemberId === 'system') {
            const noteLower = rawNote.toLowerCase();
            for (const mDoc of membersSnap.docs) {
                const mName = String(mDoc.data().name || '').trim();
                const pName = String(mDoc.data().paypalName || '').trim();
                if ((pName && noteLower.includes(pName.toLowerCase())) || (mName.length >= 3 && noteLower.includes(mName.toLowerCase()))) {
                    matchedMemberId = mDoc.id;
                    matchedMemberName = mName || mDoc.id;
                    break;
                }
            }
        }

        if (matchedMemberId === 'system' && !tokenMatch) {
            res.status(202).json({
                received: true,
                matched: false,
                message: 'No KP-[CLUB]-[USER]-[HASH] token or matching member name found in payload.'
            });
            return;
        }

        if (!rawAmount || isNaN(rawAmount) || rawAmount <= 0) {
            res.status(400).json({ error: 'Invalid positive payment amount required.' });
            return;
        }

        const description = tokenMatch
            ? `Smart-Pay Einzahlung von ${matchedMemberName} (${tokenMatch[0]})`
            : `Webhook-Einzahlung von ${matchedMemberName}`;
        const created = await createLedgerEntry(
            db,
            matchedMemberId,
            rawAmount,
            'paypal_deposit',
            description,
            txId,
            undefined,
            txDateIso,
            targetClubId
        );

        res.status(200).json({
            success: true,
            created,
            clubId: targetClubId,
            memberId: matchedMemberId,
            amount: rawAmount,
            txId,
            token: tokenMatch ? tokenMatch[0] : null
        });
    } catch (err: any) {
        console.error('Error in inboundPaymentWebhook:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});



// =========================================================================
// MULTI-TENANT INVITE & MEMBERSHIP LIFECYCLE (JOIN / LEAVE WITH LAST-ADMIN GUARD)
// =========================================================================

export const joinClubByInvite = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Bitte zuerst anmelden, um einem Verein beizutreten.');
    }

    const uid = request.auth.uid;
    const rawCode = typeof request.data?.code === 'string' ? request.data.code.trim().toUpperCase() : '';
    const displayName = typeof request.data?.displayName === 'string' ? request.data.displayName.trim() : '';

    if (!rawCode) {
        throw new HttpsError('invalid-argument', 'Ungültiger Einladungscode.');
    }

    const inviteRef = db.collection('club_invites').doc(rawCode);
    const inviteSnap = await inviteRef.get();
    if (!inviteSnap.exists) {
        throw new HttpsError('not-found', 'Dieser Einladungslink existiert nicht oder wurde widerrufen.');
    }

    const invite = inviteSnap.data()!;
    if (invite.active === false) {
        throw new HttpsError('failed-precondition', 'Dieser Einladungslink wurde deaktiviert.');
    }
    if (invite.expiresAt && typeof invite.expiresAt.toDate === 'function' && invite.expiresAt.toDate() < new Date()) {
        throw new HttpsError('failed-precondition', 'Dieser Einladungslink ist abgelaufen.');
    }
    if (typeof invite.maxUses === 'number' && invite.maxUses > 0 && (invite.usedCount || 0) >= invite.maxUses) {
        throw new HttpsError('resource-exhausted', 'Das maximale Nutzungslimit dieses Einladungslinks wurde erreicht.');
    }

    const clubId = invite.clubId as string;
    const clubRef = db.collection('clubs').doc(clubId);
    const clubSnap = await clubRef.get();
    if (!clubSnap.exists) {
        throw new HttpsError('not-found', 'Der zugehörige Verein wurde nicht gefunden.');
    }
    const clubName = (clubSnap.data()?.name as string) || invite.clubName || clubId;

    const memberRef = clubRef.collection('members').doc(uid);
    const userRef = db.collection('users').doc(uid);

    await db.runTransaction(async (tx) => {
        const [memberSnap, userSnap] = await Promise.all([tx.get(memberRef), tx.get(userRef)]);

        const resolvedName =
            displayName ||
            (request.auth!.token?.name as string) ||
            (request.auth!.token?.email ? String(request.auth!.token.email).split('@')[0] : '') ||
            'Neues Mitglied';

        if (!memberSnap.exists) {
            const memberPayload = {
                name: resolvedName,
                email: request.auth!.token?.email || '',
                role: 'Mitglied',
                roles: ['Mitglied'],
                isAdmin: false,
                points: 0,
                joinYear: new Date().getFullYear(),
                joinedAt: admin.firestore.FieldValue.serverTimestamp(),
            };
            tx.set(memberRef, memberPayload);
            tx.update(inviteRef, { usedCount: admin.firestore.FieldValue.increment(1) });
        }

        if (userSnap.exists) {
            tx.update(userRef, {
                clubIds: admin.firestore.FieldValue.arrayUnion(clubId),
                defaultClubId: userSnap.data()?.defaultClubId || clubId,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        } else {
            tx.set(userRef, {
                uid,
                name: resolvedName,
                email: request.auth!.token?.email || '',
                defaultClubId: clubId,
                clubIds: [clubId],
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
    });

    return { success: true, clubId, clubName };
});

export const leaveClub = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Anmeldung erforderlich.');
    }

    const uid = request.auth.uid;
    const clubId = typeof request.data?.clubId === 'string' ? request.data.clubId.trim() : '';
    if (!clubId) {
        throw new HttpsError('invalid-argument', 'clubId erforderlich.');
    }

    const clubRef = db.collection('clubs').doc(clubId);
    const membersSnap = await clubRef.collection('members').get();
    const myDoc = membersSnap.docs.find((d) => d.id === uid);
    if (!myDoc) {
        throw new HttpsError('not-found', 'Du bist kein Mitglied dieses Vereins.');
    }

    const amIAdmin = myDoc.data()?.isAdmin === true || myDoc.data()?.role === 'Admin';
    const otherAdmins = membersSnap.docs.filter(
        (d) => d.id !== uid && (d.data()?.isAdmin === true || d.data()?.role === 'Admin')
    );

    if (amIAdmin && otherAdmins.length === 0 && membersSnap.size > 1) {
        throw new HttpsError(
            'failed-precondition',
            'Du bist der einzige Admin dieses Vereins. Bitte übertrage die Admin-Rechte zuerst an ein anderes Mitglied.'
        );
    }

    const userRef = db.collection('users').doc(uid);
    const batch = db.batch();
    batch.delete(myDoc.ref);
    batch.set(
        userRef,
        {
            clubIds: admin.firestore.FieldValue.arrayRemove(clubId),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
    );
    await batch.commit();

    return { success: true };
});

export const createClub = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Bitte zuerst anmelden, um einen Verein zu gründen.');
    }

    const uid = request.auth.uid;
    const rawName = typeof request.data?.name === 'string' ? request.data.name.trim() : '';
    if (!rawName || rawName.length < 2) {
        throw new HttpsError('invalid-argument', 'Bitte gib einen gültigen Vereinsnamen (min. 2 Zeichen) ein.');
    }
    const clubName = rawName.slice(0, 60);

    const rawSlug = typeof request.data?.slug === 'string' && request.data.slug.trim()
        ? request.data.slug
        : clubName;
    const cleanSlug = rawSlug
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || `club-${Date.now()}`;

    const allowedGames = new Set(['kniffel', 'schocken', 'kegeln']);
    const requestedGames = Array.isArray(request.data?.enabledGames)
        ? request.data.enabledGames.filter((g: unknown) => typeof g === 'string' && allowedGames.has(g))
        : [];
    const enabledGames: string[] = requestedGames.length > 0 ? requestedGames : ['kniffel', 'schocken', 'kegeln'];

    const primaryColor = typeof request.data?.primaryColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(request.data.primaryColor)
        ? request.data.primaryColor
        : '#854d59';
    const accentColor = typeof request.data?.accentColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(request.data.accentColor)
        ? request.data.accentColor
        : '#578d8e';

    const displayNameInput = typeof request.data?.displayName === 'string' ? request.data.displayName.trim() : '';
    const resolvedMemberName =
        displayNameInput ||
        (request.auth.token?.name as string) ||
        (request.auth.token?.email ? String(request.auth.token.email).split('@')[0] : '') ||
        'Admin';

    const paypalMeHandle = typeof request.data?.paypalMeHandle === 'string' ? request.data.paypalMeHandle.trim() : '';
    const treasuryEmail = typeof request.data?.treasuryEmail === 'string' && request.data.treasuryEmail.trim()
        ? request.data.treasuryEmail.trim()
        : (request.auth.token?.email || '');
    const monthlyContributionEur =
        typeof request.data?.monthlyContributionEur === 'number' && request.data.monthlyContributionEur >= 0
            ? request.data.monthlyContributionEur
            : 15;
    const currentYear = new Date().getFullYear();
    const rawFoundingYear = Number(request.data?.foundingYear);
    const foundingYear =
        Number.isInteger(rawFoundingYear) && rawFoundingYear >= 1900 && rawFoundingYear <= currentYear + 1
            ? rawFoundingYear
            : currentYear;

    const randSuffix = Math.random().toString(36).slice(2, 7);
    const newClubId = `club_${cleanSlug}_${randSuffix}`;

    const slugPart = (cleanSlug.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4) || 'CLUB').toUpperCase();
    const inviteCode = `${slugPart}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    const clubRef = db.collection('clubs').doc(newClubId);
    const memberRef = clubRef.collection('members').doc(uid);
    const cashConfigRef = clubRef.collection('config').doc('cash');
    const settingsGeneralRef = clubRef.collection('settings').doc('general');
    const userRef = db.collection('users').doc(uid);
    const inviteRef = db.collection('club_invites').doc(inviteCode);

    const newClubData = {
        id: newClubId,
        slug: cleanSlug,
        name: clubName,
        subtitle: 'KANPAI Club Workspace',
        foundingYear,
        creatorUid: uid,
        enabledGames,
        defaultGame: enabledGames[0],
        theme: {
            primaryColor,
            accentColor,
            mode: 'dark',
        },
        paymentConfig: {
            paypalMeHandle,
            treasuryEmail,
            monthlyContributionEur,
            defaultPenaltyEur: 1,
            currency: 'EUR',
            paymentSyncMode: 'manual_confirm',
        },
        cashConfig: {
            startingBalance: 0,
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.runTransaction(async (tx) => {
        const userSnap = await tx.get(userRef);

        tx.set(clubRef, newClubData);
        tx.set(memberRef, {
            id: uid,
            name: resolvedMemberName,
            email: request.auth!.token?.email || '',
            role: 'Admin',
            roles: ['Admin'],
            isAdmin: true,
            points: 0,
            tokenBalance: 5,
            tokenShinyBalance: 0,
            joinYear: new Date().getFullYear(),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        tx.set(cashConfigRef, { startingBalance: 0 });
        tx.set(settingsGeneralRef, { title: clubName });
        tx.set(inviteRef, {
            code: inviteCode,
            clubId: newClubId,
            clubName,
            createdBy: uid,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: null,
            maxUses: null,
            usedCount: 0,
            active: true,
        });

        if (userSnap.exists) {
            const existingClubs = Array.isArray(userSnap.data()?.clubIds) ? userSnap.data()!.clubIds : [];
            const nextClubs = Array.from(new Set([...existingClubs, newClubId]));
            tx.update(userRef, {
                clubIds: nextClubs,
                defaultClubId: newClubId,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        } else {
            tx.set(userRef, {
                uid,
                name: resolvedMemberName,
                email: request.auth!.token?.email || '',
                clubIds: [newClubId],
                defaultClubId: newClubId,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
    });

    return {
        success: true,
        clubId: newClubId,
        slug: cleanSlug,
        clubName,
        inviteCode,
    };
});

export const removeClubMember = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Anmeldung erforderlich.');
    }

    const callerUid = request.auth.uid;
    const clubId = typeof request.data?.clubId === 'string' ? request.data.clubId.trim() : '';
    const targetMemberId = typeof request.data?.targetMemberId === 'string' ? request.data.targetMemberId.trim() : '';

    if (!clubId || !targetMemberId) {
        throw new HttpsError('invalid-argument', 'clubId und targetMemberId sind erforderlich.');
    }

    const clubRef = db.collection('clubs').doc(clubId);
    const [callerSnap, targetSnap, allMembersSnap] = await Promise.all([
        clubRef.collection('members').doc(callerUid).get(),
        clubRef.collection('members').doc(targetMemberId).get(),
        clubRef.collection('members').get(),
    ]);

    if (!callerSnap.exists) {
        throw new HttpsError('permission-denied', 'Du bist kein Mitglied dieses Vereins.');
    }

    const callerData = callerSnap.data() || {};
    const callerIsAdmin =
        callerData.isAdmin === true ||
        callerData.role === 'Admin' ||
        (Array.isArray(callerData.roles) && callerData.roles.includes('Admin'));

    if (!callerIsAdmin) {
        throw new HttpsError('permission-denied', 'Nur Vereins-Admins dürfen Mitglieder aus dem Verein entfernen.');
    }

    if (!targetSnap.exists) {
        throw new HttpsError('not-found', 'Dieses Mitglied existiert in diesem Verein nicht.');
    }

    const targetData = targetSnap.data() || {};
    const targetIsAdmin =
        targetData.isAdmin === true ||
        targetData.role === 'Admin' ||
        (Array.isArray(targetData.roles) && targetData.roles.includes('Admin'));

    const otherAdmins = allMembersSnap.docs.filter((d) => {
        if (d.id === targetMemberId) return false;
        const data = d.data() || {};
        return data.isAdmin === true || data.role === 'Admin' || (Array.isArray(data.roles) && data.roles.includes('Admin'));
    });

    if (targetIsAdmin && otherAdmins.length === 0) {
        throw new HttpsError(
            'failed-precondition',
            'Der letzte Admin kann nicht entfernt werden. Bitte übertrage die Admin-Rechte zuerst auf ein anderes Mitglied.'
        );
    }

    const userRef = db.collection('users').doc(targetMemberId);
    await db.runTransaction(async (tx) => {
        const userSnap = await tx.get(userRef);

        tx.delete(targetSnap.ref);
        if (clubId === 'club_original') {
            tx.delete(db.collection('members').doc(targetMemberId));
        }

        if (userSnap.exists) {
            const existingClubIds: string[] = Array.isArray(userSnap.data()?.clubIds) ? userSnap.data()!.clubIds : [];
            const nextClubIds = existingClubIds.filter((id) => id !== clubId);
            const currentDefault = userSnap.data()?.defaultClubId;
            const nextDefault = currentDefault === clubId ? (nextClubIds[0] || '') : (currentDefault || nextClubIds[0] || '');

            tx.update(userRef, {
                clubIds: nextClubIds,
                defaultClubId: nextDefault,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
    });

    return { success: true };
});

export const deleteOwnAccount = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Anmeldung erforderlich.');
    }

    const uid = request.auth.uid;
    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();

    const clubIds = new Set<string>();
    if (userSnap.exists && Array.isArray(userSnap.data()?.clubIds)) {
        for (const cid of userSnap.data()!.clubIds) {
            if (typeof cid === 'string' && cid.trim()) {
                clubIds.add(cid.trim());
            }
        }
    }

    // Check legacy club_original membership as well
    const originalMemberSnap = await db.collection('clubs').doc('club_original').collection('members').doc(uid).get();
    if (originalMemberSnap.exists) {
        clubIds.add('club_original');
    }

    // Last-admin guard across all clubs the user belongs to
    for (const clubId of clubIds) {
        const clubRef = db.collection('clubs').doc(clubId);
        const membersSnap = await clubRef.collection('members').get();
        const myDoc = membersSnap.docs.find((d) => d.id === uid);
        if (!myDoc) continue;

        const myData = myDoc.data() || {};
        const amIAdmin =
            myData.isAdmin === true ||
            myData.role === 'Admin' ||
            (Array.isArray(myData.roles) && myData.roles.includes('Admin'));
        const otherAdmins = membersSnap.docs.filter((d) => {
            if (d.id === uid) return false;
            const data = d.data() || {};
            return data.isAdmin === true || data.role === 'Admin' || (Array.isArray(data.roles) && data.roles.includes('Admin'));
        });

        if (amIAdmin && otherAdmins.length === 0 && membersSnap.size > 1) {
            const clubSnap = await clubRef.get();
            const clubName = clubSnap.data()?.name || clubId;
            throw new HttpsError(
                'failed-precondition',
                `Du bist der einzige Admin in "${clubName}". Bitte übertrage die Admin-Rechte dort zuerst an ein anderes Mitglied, bevor du deinen Account löschst.`
            );
        }
    }

    const batch = db.batch();
    for (const clubId of clubIds) {
        batch.delete(db.collection('clubs').doc(clubId).collection('members').doc(uid));
    }
    batch.delete(db.collection('members').doc(uid));
    if (userSnap.exists) {
        batch.delete(userRef);
    }
    await batch.commit();

    // Delete the Firebase Authentication user record
    await admin.auth().deleteUser(uid);

    return { success: true };
});
