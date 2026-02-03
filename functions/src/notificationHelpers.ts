import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

// Interface matching the payload structure
interface NotificationPayload {
    title: string;
    body: string;
    url?: string;
}

/**
 * Send push notification to a single user
 */
export async function sendPushToUser(
    fcmToken: string,
    payload: NotificationPayload
): Promise<boolean> {
    if (!fcmToken) return false;

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
    } catch (error) {
        functions.logger.error('Push failed:', error);
        return false;
    }
}

/**
 * Send push to multiple users
 */
export async function sendPushToUsers(
    tokens: string[],
    payload: NotificationPayload
): Promise<{ success: number; failure: number }> {
    if (tokens.length === 0) return { success: 0, failure: 0 };

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
    } catch (error) {
        functions.logger.error('Multicast push failed:', error);
        return { success: 0, failure: tokens.length };
    }
}

/**
 * Queue email via Firestore trigger (for "Trigger Email from Firestore" extension)
 */
export async function queueEmail(
    to: string,
    subject: string,
    htmlContent: string,
    textContent: string
): Promise<void> {
    if (!to) return;

    try {
        await admin.firestore().collection('mail').add({
            to: to,
            message: {
                subject: subject,
                html: htmlContent,
                text: textContent
            }
        });
    } catch (error) {
        functions.logger.error('Failed to queue email:', error);
    }
}

/**
 * Get members with specific notification preference enabled
 */
export async function getMembersWithPreference(
    preference: 'eventReminder7Days' | 'eventReminder1Day' | 'votingReminder' | 'monthlyOverview'
): Promise<Array<{ id: string; email: string; fcmToken?: string; pushEnabled: boolean; emailEnabled: boolean }>> {
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
