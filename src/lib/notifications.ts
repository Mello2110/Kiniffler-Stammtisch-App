import { db } from "./firebase";
import { getMessaging, getToken, deleteToken } from "firebase/messaging";
import { getApp } from "firebase/app";
import { doc, updateDoc } from "firebase/firestore";

// Check if notifications are supported
export function isNotificationSupported(): boolean {
    if (typeof window === "undefined") return false;
    return "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
}

export async function requestNotificationPermission(): Promise<string | null> {
    console.log("requestNotificationPermission started");
    if (!isNotificationSupported()) {
        console.log("Notifications not supported");
        return null;
    }

    try {
        console.log("Requesting Notification.requestPermission...");
        const permission = await Notification.requestPermission();
        console.log("Permission status:", permission);

        if (permission === "granted") {
            const app = getApp();
            const messaging = getMessaging(app);

            const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
            console.log("VAPID Key present:", !!vapidKey);

            if (!vapidKey) {
                console.error("Missing NEXT_PUBLIC_FIREBASE_VAPID_KEY");
                return null;
            }

            console.log("Fetching token...");

            // Wait for Service Worker to be ready
            const registration = await navigator.serviceWorker.ready;
            console.log("Service Worker ready:", registration.scope);

            // Pass the registration to getToken to avoid "no active Service Worker" errors
            const currentToken = await getToken(messaging, {
                vapidKey,
                serviceWorkerRegistration: registration
            });

            console.log("Token retrieved:", !!currentToken);

            if (currentToken) {
                return currentToken;
            } else {
                console.log("No registration token available. Request permission to generate one.");
                return null;
            }
        } else {
            console.log("Notification permission not granted");
            return null;
        }
    } catch (err) {
        console.error("An error occurred while retrieving token: ", err);
        return null;
    }
}


// Subscribe to push notifications (save token to Firestore)
export async function subscribeToPush(userId: string, token: string): Promise<boolean> {
    try {
        const userRef = doc(db, "members", userId);
        await updateDoc(userRef, {
            "notificationPreferences.fcmToken": token,
            "notificationPreferences.pushEnabled": true
        });
        return true;
    } catch (error) {
        console.error("Error updating user push preferences:", error);
        return false;
    }
}

// Unsubscribe from push notifications
export async function unsubscribeFromPush(userId: string): Promise<void> {
    try {
        // Remove token from Firestore
        const userRef = doc(db, "members", userId);
        await updateDoc(userRef, {
            "notificationPreferences.pushEnabled": false,
            "notificationPreferences.fcmToken": null
        });

        // Delete token from Messaging if valid
        const app = getApp();
        const messaging = getMessaging(app);
        if (messaging) {
            await deleteToken(messaging);
        }
    } catch (error) {
        console.error("Error unsubscribing from push:", error);
    }
}

// Send test notification (This would normally be done server-side, but for debugging/testing triggers)
// Client-side we can't 'send' a notification to ourselves easily via FCM without a server or cloud function context generally,
// but we can simulate a display if needed, or trigger a cloud function. 
// For this interface, we will just log a placeholder or trigger a local notification if permission granted.
export async function sendTestNotification(): Promise<void> {
    if (Notification.permission === "granted") {
        new Notification("Test Notification", {
            body: "This is a test notification from the Stammtisch App.",
            icon: "/kanpai-logo.png"
        });
    }
}
