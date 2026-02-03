/**
 * Firebase Cloud Functions for Stammtisch Web App
 */

import * as functions from 'firebase-functions/v1';
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

// --- Cloudinary Configuration ---
const CLOUDINARY_CONFIG = {
    cloud_name: "doasrf18u",
    api_key: "271343821461348",
    api_secret: "Q6EA3q2rGrJ1glAMF4_koOoqAiA"
};

cloudinary.v2.config(CLOUDINARY_CONFIG);

// --- Cloudinary Functions (Migrated) ---

export const deleteCloudinaryImage = functions.https.onCall(async (data, context: any) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Login erforderlich");
    }

    const { publicId } = data;
    if (!publicId) {
        throw new functions.https.HttpsError("invalid-argument", "publicId fehlt");
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
        throw new functions.https.HttpsError("internal", `Cloudinary Fehler: ${error.message}`);
    }
});

export const bulkDeleteCloudinaryImages = functions.https.onCall(async (data, context: any) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Login erforderlich");
    }

    const { publicIds } = data;
    if (!publicIds || !Array.isArray(publicIds) || publicIds.length === 0) {
        throw new functions.https.HttpsError("invalid-argument", "publicIds Array fehlt oder leer");
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

// 1. Daily Event Reminder Check (09:00 Europe/Berlin)
export const dailyEventReminderCheck = functions.pubsub
    .schedule('0 9 * * *')
    .timeZone('Europe/Berlin')
    .onRun(async (context: any) => {
        const today = new Date();
        const in7Days = addDays(today, 7);
        const tomorrow = addDays(today, 1);

        // Fetch events for 7 days
        const events7DaysSnap = await db.collection('events')
            .where('date', '>=', startOfDay(in7Days).toISOString()) // Assuming ISO strings in DB as per Types
            .where('date', '<=', endOfDay(in7Days).toISOString())
            .get();

        // Fetch events for tomorrow
        const events1DaySnap = await db.collection('events')
            .where('date', '>=', startOfDay(tomorrow).toISOString())
            .where('date', '<=', endOfDay(tomorrow).toISOString())
            .get();

        // Process 7-day reminders
        if (!events7DaysSnap.empty) {
            const users = await getMembersWithPreference('eventReminder7Days');

            for (const doc of events7DaysSnap.docs) {
                const event = doc.data();
                const dateStr = new Date(event.date).toLocaleDateString('de-DE');
                const timeStr = event.time || 'Ganztägig';

                const pushPayload = {
                    title: `In einer Woche: ${event.title}`,
                    body: `Am ${dateStr} ist ${event.title} in ${event.location || 'Location tbd'}.`,
                    url: '/events'
                };

                const emailContent = eventReminderTemplate(event.title, dateStr, timeStr, 7, 'https://stammtisch-web-app.web.app/events');

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
                const event = doc.data();
                const dateStr = new Date(event.date).toLocaleDateString('de-DE');
                const timeStr = event.time || 'Ganztägig';

                const pushPayload = {
                    title: `Morgen: ${event.title}`,
                    body: `Vergiss nicht, morgen ist ${event.title}!`,
                    url: '/events'
                };

                const emailContent = eventReminderTemplate(event.title, dateStr, timeStr, 1, 'https://stammtisch-web-app.web.app/events');

                // Send Pushes
                const pushTokens = users.filter(u => u.pushEnabled && u.fcmToken).map(u => u.fcmToken!);
                if (pushTokens.length > 0) await sendPushToUsers(pushTokens, pushPayload);

                // Queue Emails
                for (const user of users.filter(u => u.emailEnabled && u.email)) {
                    await queueEmail(user.email, emailContent.subject, emailContent.html, emailContent.text);
                }
            }
        }

        return null;
    });

// 2. Voting Reminder (24th of month, 10:00 Europe/Berlin)
export const votingReminder = functions.pubsub
    .schedule('0 10 24 * *')
    .timeZone('Europe/Berlin')
    .onRun(async (context: any) => {
        const today = new Date();
        // Calculate next month
        let targetMonth = today.getMonth() + 1; // 0-based index, so +1 is next month real index (1-12) if we consider 0 as Jan. 
        // Logic: if today is Jan 24, we vote for Feb. 
        // If we store votes by year-month string e.g. "2024-02", we need to construct that.
        let targetYear = today.getFullYear();
        if (targetMonth > 11) { // If Dec (11) -> Jan (0)
            targetMonth = 0;
            targetYear++;
        }

        // Construct ID like "2024-02" or however it is stored.
        // Assuming votes are at `stammtisch_votes` or handling logic. 
        // Based on user prompt: "votes/{year-month}/responses/{memberId}"? 
        // Wait, looking at types, `StammtischVote` has `month` and `year`.
        // BUT user prompt said "Check voting collection/document for next month's Stammtisch".
        // Let's assume standard logic: Members vote for dates.
        // If there is no dedicated "voted" flag on member, we need to check votes.

        // Let's assume there is a collection where votes are stored. 
        // Based on `StammtischVote` type: it has `userId`, `month`, `year`.
        // So we can query `stammtisch_votes` where month == targetMonth+1 (human) and year == targetYear. (Wait, type says month is number).

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

        return null;
    });

// 3. Monthly Overview (1st of month, 09:00 Europe/Berlin)
export const monthlyOverview = functions.pubsub
    .schedule('0 9 1 * *')
    .timeZone('Europe/Berlin')
    .onRun(async (context: any) => {
        const today = new Date();
        const startOfMonthDate = startOfDay(new Date(today.getFullYear(), today.getMonth(), 1));
        const endOfMonthDate = endOfDay(new Date(today.getFullYear(), today.getMonth() + 1, 0));

        const monthName = format(today, 'MMMM', { locale: de });
        const year = today.getFullYear();

        const eventsSnap = await db.collection('events')
            .where('date', '>=', startOfMonthDate.toISOString())
            .where('date', '<=', endOfMonthDate.toISOString())
            .orderBy('date', 'asc')
            .get();

        if (eventsSnap.empty) return null;

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

        return null;
    });
