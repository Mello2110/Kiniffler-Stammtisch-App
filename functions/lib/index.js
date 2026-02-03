"use strict";
/**
 * Firebase Cloud Functions for Stammtisch Web App
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.monthlyOverview = exports.votingReminder = exports.dailyEventReminderCheck = exports.bulkDeleteCloudinaryImages = exports.deleteCloudinaryImage = void 0;
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin = __importStar(require("firebase-admin"));
const cloudinary = __importStar(require("cloudinary"));
const date_fns_1 = require("date-fns");
const locale_1 = require("date-fns/locale");
const notificationHelpers_1 = require("./notificationHelpers");
const emailTemplates_1 = require("./emailTemplates");
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
exports.deleteCloudinaryImage = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Login erforderlich");
    }
    const { publicId } = request.data;
    if (!publicId) {
        throw new https_1.HttpsError("invalid-argument", "publicId fehlt");
    }
    try {
        const result = await cloudinary.v2.uploader.destroy(publicId, {
            resource_type: "image",
            invalidate: true,
        });
        if (result.result === "ok" || result.result === "not found") {
            return { success: true, result: result.result };
        }
        else {
            return { success: false, result: result.result };
        }
    }
    catch (error) {
        throw new https_1.HttpsError("internal", `Cloudinary Fehler: ${error.message}`);
    }
});
exports.bulkDeleteCloudinaryImages = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Login erforderlich");
    }
    const { publicIds } = request.data;
    if (!publicIds || !Array.isArray(publicIds) || publicIds.length === 0) {
        throw new https_1.HttpsError("invalid-argument", "publicIds Array fehlt oder leer");
    }
    const results = [];
    for (const publicId of publicIds) {
        try {
            const result = await cloudinary.v2.uploader.destroy(publicId, {
                resource_type: "image",
                invalidate: true,
            });
            results.push({ publicId, success: result.result === "ok" || result.result === "not found", result: result.result });
        }
        catch (error) {
            results.push({ publicId, success: false, error: error.message });
        }
    }
    const successCount = results.filter(r => r.success).length;
    return { results, successCount, totalCount: publicIds.length };
});
// --- Scheduled Notification Functions (Migrated to V2) ---
// 1. Daily Event Reminder Check (09:00 Europe/Berlin)
exports.dailyEventReminderCheck = (0, scheduler_1.onSchedule)({
    schedule: "0 9 * * *",
    timeZone: "Europe/Berlin"
}, async (event) => {
    const today = new Date();
    const in7Days = (0, date_fns_1.addDays)(today, 7);
    const tomorrow = (0, date_fns_1.addDays)(today, 1);
    // Fetch events for 7 days
    const events7DaysSnap = await db.collection('events')
        .where('date', '>=', (0, date_fns_1.startOfDay)(in7Days).toISOString()) // Assuming ISO strings in DB as per Types
        .where('date', '<=', (0, date_fns_1.endOfDay)(in7Days).toISOString())
        .get();
    // Fetch events for tomorrow
    const events1DaySnap = await db.collection('events')
        .where('date', '>=', (0, date_fns_1.startOfDay)(tomorrow).toISOString())
        .where('date', '<=', (0, date_fns_1.endOfDay)(tomorrow).toISOString())
        .get();
    // Process 7-day reminders
    if (!events7DaysSnap.empty) {
        const users = await (0, notificationHelpers_1.getMembersWithPreference)('eventReminder7Days');
        for (const doc of events7DaysSnap.docs) {
            const eventData = doc.data();
            const dateStr = new Date(eventData.date).toLocaleDateString('de-DE');
            const timeStr = eventData.time || 'Ganztägig';
            const pushPayload = {
                title: `In einer Woche: ${eventData.title}`,
                body: `Am ${dateStr} ist ${eventData.title} in ${eventData.location || 'Location tbd'}.`,
                url: '/events'
            };
            const emailContent = (0, emailTemplates_1.eventReminderTemplate)(eventData.title, dateStr, timeStr, 7, 'https://stammtisch-web-app.web.app/events');
            // Send Pushes
            const pushTokens = users.filter(u => u.pushEnabled && u.fcmToken).map(u => u.fcmToken);
            if (pushTokens.length > 0)
                await (0, notificationHelpers_1.sendPushToUsers)(pushTokens, pushPayload);
            // Queue Emails
            for (const user of users.filter(u => u.emailEnabled && u.email)) {
                await (0, notificationHelpers_1.queueEmail)(user.email, emailContent.subject, emailContent.html, emailContent.text);
            }
        }
    }
    // Process 1-day reminders
    if (!events1DaySnap.empty) {
        const users = await (0, notificationHelpers_1.getMembersWithPreference)('eventReminder1Day');
        for (const doc of events1DaySnap.docs) {
            const eventData = doc.data();
            const dateStr = new Date(eventData.date).toLocaleDateString('de-DE');
            const timeStr = eventData.time || 'Ganztägig';
            const pushPayload = {
                title: `Morgen: ${eventData.title}`,
                body: `Vergiss nicht, morgen ist ${eventData.title}!`,
                url: '/events'
            };
            const emailContent = (0, emailTemplates_1.eventReminderTemplate)(eventData.title, dateStr, timeStr, 1, 'https://stammtisch-web-app.web.app/events');
            // Send Pushes
            const pushTokens = users.filter(u => u.pushEnabled && u.fcmToken).map(u => u.fcmToken);
            if (pushTokens.length > 0)
                await (0, notificationHelpers_1.sendPushToUsers)(pushTokens, pushPayload);
            // Queue Emails
            for (const user of users.filter(u => u.emailEnabled && u.email)) {
                await (0, notificationHelpers_1.queueEmail)(user.email, emailContent.subject, emailContent.html, emailContent.text);
            }
        }
    }
});
// 2. Voting Reminder (24th of month, 10:00 Europe/Berlin)
exports.votingReminder = (0, scheduler_1.onSchedule)({
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
    const nextMonthName = (0, date_fns_1.format)(new Date(targetYear, nextMonthIndex, 1), 'MMMM', { locale: locale_1.de });
    // Get all votes for that month/year
    const votesSnap = await db.collection('stammtisch_votes')
        .where('month', '==', nextMonthIndex)
        .where('year', '==', targetYear)
        .get();
    const voterIds = new Set(votesSnap.docs.map(d => d.data().userId));
    // Get users who want reminder
    const candidateUsers = await (0, notificationHelpers_1.getMembersWithPreference)('votingReminder');
    // Filter those who haven't voted
    const usersToNotify = candidateUsers.filter(u => !voterIds.has(u.id));
    if (usersToNotify.length > 0) {
        const pushPayload = {
            title: `Abstimmung für ${nextMonthName} noch offen`,
            body: `Du hast noch nicht für den Stammtisch im ${nextMonthName} abgestimmt.`,
            url: '/events' // or where voting is
        };
        const emailContent = (0, emailTemplates_1.votingReminderTemplate)(nextMonthName, 'https://stammtisch-web-app.web.app/events');
        // Send Pushes
        const pushTokens = usersToNotify.filter(u => u.pushEnabled && u.fcmToken).map(u => u.fcmToken);
        if (pushTokens.length > 0)
            await (0, notificationHelpers_1.sendPushToUsers)(pushTokens, pushPayload);
        // Queue Emails
        for (const user of usersToNotify.filter(u => u.emailEnabled && u.email)) {
            await (0, notificationHelpers_1.queueEmail)(user.email, emailContent.subject, emailContent.html, emailContent.text);
        }
    }
});
// 3. Monthly Overview (1st of month, 09:00 Europe/Berlin)
exports.monthlyOverview = (0, scheduler_1.onSchedule)({
    schedule: "0 9 1 * *",
    timeZone: "Europe/Berlin"
}, async (event) => {
    const today = new Date();
    const startOfMonthDate = (0, date_fns_1.startOfDay)(new Date(today.getFullYear(), today.getMonth(), 1));
    const endOfMonthDate = (0, date_fns_1.endOfDay)(new Date(today.getFullYear(), today.getMonth() + 1, 0));
    const monthName = (0, date_fns_1.format)(today, 'MMMM', { locale: locale_1.de });
    const year = today.getFullYear();
    const eventsSnap = await db.collection('events')
        .where('date', '>=', startOfMonthDate.toISOString())
        .where('date', '<=', endOfMonthDate.toISOString())
        .orderBy('date', 'asc')
        .get();
    if (eventsSnap.empty)
        return;
    const events = eventsSnap.docs.map(doc => {
        const d = doc.data();
        return {
            name: d.title,
            date: new Date(d.date).toLocaleDateString('de-DE'),
            time: d.time || ''
        };
    });
    const users = await (0, notificationHelpers_1.getMembersWithPreference)('monthlyOverview');
    const pushPayload = {
        title: `Events im ${monthName} ${year}`,
        body: `${events.length} Events diesen Monat: ${events.map(e => e.name).join(', ')}`,
        url: '/dashboard'
    };
    const emailContent = (0, emailTemplates_1.monthlyOverviewTemplate)(monthName, year, events, 'https://stammtisch-web-app.web.app/dashboard');
    // Send Pushes
    const pushTokens = users.filter(u => u.pushEnabled && u.fcmToken).map(u => u.fcmToken);
    if (pushTokens.length > 0)
        await (0, notificationHelpers_1.sendPushToUsers)(pushTokens, pushPayload);
    // Queue Emails
    for (const user of users.filter(u => u.emailEnabled && u.email)) {
        await (0, notificationHelpers_1.queueEmail)(user.email, emailContent.subject, emailContent.html, emailContent.text);
    }
});
//# sourceMappingURL=index.js.map