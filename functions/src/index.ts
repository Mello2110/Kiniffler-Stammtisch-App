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
        const memberData = memberDoc.data();

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

            const updateField = isShiny ? 'tokenShinyBalance' : 'tokenBalance';
            const currentBalance = memberData[updateField] || 0;
            batch.update(memberDoc.ref, {
                [updateField]: currentBalance + 1
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

    const { fromMonth, fromYear, toMonth, toYear } = request.data as {
        fromMonth: number; fromYear: number; toMonth: number; toYear: number;
    };

    const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
        'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

    const membersSnap = await db.collection('members').get();
    const results: string[] = [];
    const batch = db.batch();

    // Iterate over months from → to
    let year = fromYear;
    let month = fromMonth;

    while (year < toYear || (year === toYear && month <= toMonth)) {
        for (const memberDoc of membersSnap.docs) {
            const memberId = memberDoc.id;

            // Check if contribution already exists
            const existingContrib = await db.collection('contributions')
                .where('userId', '==', memberId)
                .where('month', '==', month)
                .where('year', '==', year)
                .limit(1)
                .get();

            if (!existingContrib.empty) {
                results.push(`Skip: ${memberId} ${monthNames[month]}/${year} — already exists`);
                continue;
            }

            // Create contribution document (unpaid)
            const contribRef = db.collection('contributions').doc();
            batch.set(contribRef, {
                id: contribRef.id,
                userId: memberId,
                month,
                year,
                isPaid: true,
                paidViaReconciliation: true,
                reconciledAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // Immediately deduct from ledger
            const entryRef = db.collection('ledger_entries').doc();
            batch.set(entryRef, {
                id: entryRef.id,
                userId: memberId,
                amount: -15, // Fixed 15 EUR contribution
                type: 'contribution',
                description: `Monatsbeitrag ${monthNames[month]} ${year}`,
                date: new Date().toISOString(),
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                linkedDocId: contribRef.id,
            });

            results.push(`Created: ${memberId} ${monthNames[month]}/${year}`);
        }

        // Next month
        month++;
        if (month > 11) { month = 0; year++; }
    }
    
    await batch.commit();

    return { results, count: results.length };
});

// --- Monthly Contribution Deduction (1st of each month at 00:05) ---

export const monthlyContributionDeduction = onSchedule({
    schedule: "5 0 1 * *",
    timeZone: "Europe/Berlin"
}, async (event) => {
    const now = new Date();
    const month = now.getMonth(); // 0-11
    const year = now.getFullYear();
    const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
        'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

    console.log(`Running monthly contribution deduction for ${monthNames[month]} ${year}`);

    // Get all members
    const membersSnap = await db.collection('members').get();
    const batch = db.batch();

    for (const memberDoc of membersSnap.docs) {
        const memberId = memberDoc.id;

        // Check if contribution already exists for this month/year
        const existingContrib = await db.collection('contributions')
            .where('userId', '==', memberId)
            .where('month', '==', month)
            .where('year', '==', year)
            .limit(1)
            .get();

        if (!existingContrib.empty) {
            console.log(`Contribution for ${memberId} already exists for ${month}/${year}, skipping.`);
            continue;
        }

        // Create contribution document (marked as paid instantly)
        const contribRef = db.collection('contributions').doc();
        batch.set(contribRef, {
            id: contribRef.id,
            userId: memberId,
            month,
            year,
            isPaid: true,
            paidViaReconciliation: true,
            reconciledAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Immediately deduct from ledger
        const entryRef = db.collection('ledger_entries').doc();
        batch.set(entryRef, {
            id: entryRef.id,
            userId: memberId,
            amount: -15, // Fixed 15 EUR contribution
            type: 'contribution',
            description: `Monatsbeitrag ${monthNames[month]} ${year}`,
            date: new Date().toISOString(),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            linkedDocId: contribRef.id,
        });

        console.log(`Created contribution + ledger deduction for member ${memberId}`);
    }

    await batch.commit();
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
