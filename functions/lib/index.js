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
exports.syncPayPalTransactions = exports.getPayPalBalance = exports.monthlyOverview = exports.votingReminder = exports.dailyEventReminderCheck = exports.bulkDeleteCloudinaryImages = exports.deleteCloudinaryImage = void 0;
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const v2_1 = require("firebase-functions/v2");
const admin = __importStar(require("firebase-admin"));
const cloudinary = __importStar(require("cloudinary"));
const date_fns_1 = require("date-fns");
const locale_1 = require("date-fns/locale");
const notificationHelpers_1 = require("./notificationHelpers");
const emailTemplates_1 = require("./emailTemplates");
const paypalService_1 = require("./paypalService");
const categorization_1 = require("./categorization");
admin.initializeApp();
const db = admin.firestore();
// Set global options for all functions
(0, v2_1.setGlobalOptions)({
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
// --- Scheduled Notification Functions ---
exports.dailyEventReminderCheck = (0, scheduler_1.onSchedule)({
    schedule: "0 9 * * *",
    timeZone: "Europe/Berlin"
}, async (event) => {
    const today = new Date();
    const in7Days = (0, date_fns_1.addDays)(today, 7);
    const tomorrow = (0, date_fns_1.addDays)(today, 1);
    const in7DaysStr = (0, date_fns_1.format)(in7Days, 'yyyy-MM-dd');
    const events7DaysSnap = await db.collection('set_events')
        .where('date', '==', in7DaysStr)
        .get();
    const tomorrowStr = (0, date_fns_1.format)(tomorrow, 'yyyy-MM-dd');
    const events1DaySnap = await db.collection('set_events')
        .where('date', '==', tomorrowStr)
        .get();
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
            const pushTokens = users.filter(u => u.pushEnabled && u.fcmToken).map(u => u.fcmToken);
            if (pushTokens.length > 0)
                await (0, notificationHelpers_1.sendPushToUsers)(pushTokens, pushPayload);
            for (const user of users.filter(u => u.emailEnabled && u.email)) {
                await (0, notificationHelpers_1.queueEmail)(user.email, emailContent.subject, emailContent.html, emailContent.text);
            }
        }
    }
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
            const pushTokens = users.filter(u => u.pushEnabled && u.fcmToken).map(u => u.fcmToken);
            if (pushTokens.length > 0)
                await (0, notificationHelpers_1.sendPushToUsers)(pushTokens, pushPayload);
            for (const user of users.filter(u => u.emailEnabled && u.email)) {
                await (0, notificationHelpers_1.queueEmail)(user.email, emailContent.subject, emailContent.html, emailContent.text);
            }
        }
    }
});
exports.votingReminder = (0, scheduler_1.onSchedule)({
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
    const nextMonthName = (0, date_fns_1.format)(new Date(targetYear, nextMonthIndex, 1), 'MMMM', { locale: locale_1.de });
    const votesSnap = await db.collection('stammtisch_votes')
        .where('month', '==', nextMonthIndex)
        .where('year', '==', targetYear)
        .get();
    const voterIds = new Set(votesSnap.docs.map(d => d.data().userId));
    const candidateUsers = await (0, notificationHelpers_1.getMembersWithPreference)('votingReminder');
    const usersToNotify = candidateUsers.filter(u => !voterIds.has(u.id));
    if (usersToNotify.length > 0) {
        const pushPayload = {
            title: `Abstimmung für ${nextMonthName} noch offen`,
            body: `Du hast noch nicht für den Stammtisch im ${nextMonthName} abgestimmt.`,
            url: '/events'
        };
        const emailContent = (0, emailTemplates_1.votingReminderTemplate)(nextMonthName, 'https://stammtisch-web-app.web.app/events');
        const pushTokens = usersToNotify.filter(u => u.pushEnabled && u.fcmToken).map(u => u.fcmToken);
        if (pushTokens.length > 0)
            await (0, notificationHelpers_1.sendPushToUsers)(pushTokens, pushPayload);
        for (const user of usersToNotify.filter(u => u.emailEnabled && u.email)) {
            await (0, notificationHelpers_1.queueEmail)(user.email, emailContent.subject, emailContent.html, emailContent.text);
        }
    }
});
exports.monthlyOverview = (0, scheduler_1.onSchedule)({
    schedule: "0 9 1 * *",
    timeZone: "Europe/Berlin"
}, async (event) => {
    const today = new Date();
    const startOfMonthDate = (0, date_fns_1.startOfDay)(new Date(today.getFullYear(), today.getMonth(), 1));
    const endOfMonthDate = (0, date_fns_1.endOfDay)(new Date(today.getFullYear(), today.getMonth() + 1, 0));
    const monthName = (0, date_fns_1.format)(today, 'MMMM', { locale: locale_1.de });
    const year = today.getFullYear();
    const startStr = (0, date_fns_1.format)(startOfMonthDate, 'yyyy-MM-dd');
    const endStr = (0, date_fns_1.format)(endOfMonthDate, 'yyyy-MM-dd');
    const eventsSnap = await db.collection('set_events')
        .where('date', '>=', startStr)
        .where('date', '<=', endStr)
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
    const pushTokens = users.filter(u => u.pushEnabled && u.fcmToken).map(u => u.fcmToken);
    if (pushTokens.length > 0)
        await (0, notificationHelpers_1.sendPushToUsers)(pushTokens, pushPayload);
    for (const user of users.filter(u => u.emailEnabled && u.email)) {
        await (0, notificationHelpers_1.queueEmail)(user.email, emailContent.subject, emailContent.html, emailContent.text);
    }
});
// --- PayPal Functions ---
exports.getPayPalBalance = (0, https_1.onCall)({
    secrets: [paypalService_1.paypalClientId, paypalService_1.paypalClientSecret],
    cors: true
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Login erforderlich");
    }
    try {
        const balance = await (0, paypalService_1.fetchPayPalBalance)();
        return { success: true, balance };
    }
    catch (error) {
        console.error('PayPal Balance Error:', error);
        throw new https_1.HttpsError("internal", `PayPal Fehler: ${error.message}`);
    }
});
exports.syncPayPalTransactions = (0, https_1.onCall)({
    secrets: [paypalService_1.paypalClientId, paypalService_1.paypalClientSecret],
    cors: true
}, async (request) => {
    var _a;
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Login erforderlich");
    }
    const now = new Date();
    const defaultStart = (0, date_fns_1.format)((0, date_fns_1.addDays)(now, -3), "yyyy-MM-dd'T'HH:mm:ss'Z'");
    const defaultEnd = (0, date_fns_1.format)(now, "yyyy-MM-dd'T'HH:mm:ss'Z'");
    const startDate = request.data.startDate || defaultStart;
    const endDate = request.data.endDate || defaultEnd;
    try {
        const rawTransactions = await (0, paypalService_1.fetchPayPalTransactions)(startDate, endDate);
        const results = [];
        for (const raw of rawTransactions) {
            const info = raw.transaction_info;
            const payer = raw.payer_info;
            const tid = info.transaction_id;
            const docRef = db.collection('paypal_transactions').doc(tid);
            const doc = await docRef.get();
            if (doc.exists)
                continue;
            const amount = parseFloat(info.transaction_amount.value);
            const fee = info.fee_amount ? parseFloat(info.fee_amount.value) : 0;
            const note = info.transaction_subject || info.transaction_note || '';
            const payerEmail = payer === null || payer === void 0 ? void 0 : payer.email_address;
            const category = (0, categorization_1.categorizeTransaction)(amount, note, payerEmail);
            const memberId = await (0, categorization_1.findMemberIdByEmail)(db, payerEmail);
            const tx = {
                id: tid,
                amount,
                fee,
                net: amount - fee,
                currency: info.transaction_amount.currency_code,
                payerEmail,
                payerName: (_a = payer === null || payer === void 0 ? void 0 : payer.payer_name) === null || _a === void 0 ? void 0 : _a.alternate_full_name,
                note,
                date: info.transaction_updated_date,
                status: info.transaction_status,
                category,
                assignedMemberId: memberId,
                isReconciled: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            };
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
    }
    catch (error) {
        console.error('PayPal Sync Error:', error);
        throw new https_1.HttpsError("internal", `PayPal Sync Fehler: ${error.message}`);
    }
});
async function performReconciliation(memberId, category, amount, paypalTxId) {
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
    }
    else if (category === 'contribution') {
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
//# sourceMappingURL=index.js.map