"use strict";
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
exports.getMembersWithPreference = exports.queueEmail = exports.sendPushToUsers = exports.sendPushToUser = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
/**
 * Send push notification to a single user
 */
async function sendPushToUser(fcmToken, payload) {
    if (!fcmToken)
        return false;
    try {
        await admin.messaging().send({
            token: fcmToken,
            notification: {
                title: payload.title,
                body: payload.body,
            },
            webpush: {
                fcmOptions: {
                    link: payload.url || '/'
                }
            }
        });
        return true;
    }
    catch (error) {
        functions.logger.error('Push failed:', error);
        return false;
    }
}
exports.sendPushToUser = sendPushToUser;
/**
 * Send push to multiple users
 */
async function sendPushToUsers(tokens, payload) {
    if (tokens.length === 0)
        return { success: 0, failure: 0 };
    // sendEachForMulticast allows sending same message to multiple tokens
    const message = {
        notification: {
            title: payload.title,
            body: payload.body,
        },
        webpush: {
            fcmOptions: {
                link: payload.url || '/'
            }
        },
        tokens: tokens
    };
    try {
        const response = await admin.messaging().sendEachForMulticast(message);
        return {
            success: response.successCount,
            failure: response.failureCount
        };
    }
    catch (error) {
        functions.logger.error('Multicast push failed:', error);
        return { success: 0, failure: tokens.length };
    }
}
exports.sendPushToUsers = sendPushToUsers;
/**
 * Queue email via Firestore trigger (for "Trigger Email from Firestore" extension)
 */
async function queueEmail(to, subject, htmlContent, textContent) {
    if (!to)
        return;
    try {
        await admin.firestore().collection('mail').add({
            to: to,
            message: {
                subject: subject,
                html: htmlContent,
                text: textContent
            }
        });
    }
    catch (error) {
        functions.logger.error('Failed to queue email:', error);
    }
}
exports.queueEmail = queueEmail;
/**
 * Get members with specific notification preference enabled
 */
async function getMembersWithPreference(preference) {
    const snapshot = await admin.firestore().collection('members').get();
    return snapshot.docs
        .filter(doc => {
        const data = doc.data();
        const prefs = data.notificationPreferences;
        // Check if preference exists and is true
        return prefs && prefs[preference] === true;
    })
        .map(doc => {
        const data = doc.data();
        const prefs = data.notificationPreferences || {};
        return {
            id: doc.id,
            email: data.email || '',
            fcmToken: prefs.fcmToken,
            pushEnabled: prefs.pushEnabled === true,
            emailEnabled: prefs.emailEnabled === true
        };
    });
}
exports.getMembersWithPreference = getMembersWithPreference;
//# sourceMappingURL=notificationHelpers.js.map