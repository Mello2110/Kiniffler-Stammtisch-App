import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, getFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions, httpsCallable } from "firebase/functions";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase (singleton pattern)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);

// Use modern persistentLocalCache for offline support.
// IMPORTANT: initializeFirestore can only be called once per app instance.
// We guard with try/catch and fall back to getFirestore() if already initialized.
function createDb() {
    if (typeof window === "undefined") {
        // SSR: use default (memory) Firestore, no persistence
        try {
            return initializeFirestore(app, {});
        } catch {
            return getFirestore(app);
        }
    }
    // Client: use IndexedDB persistent cache
    try {
        return initializeFirestore(app, {
            localCache: persistentLocalCache({
                tabManager: persistentMultipleTabManager()
            })
        });
    } catch {
        // Already initialized (e.g. HMR or module re-import) — just get the existing instance
        return getFirestore(app);
    }
}

export const db = createDb();

export const storage = getStorage(app);
export const functions = getFunctions(app);

// Cloud Function callable references
export const deleteCloudinaryImage = httpsCallable(functions, 'deleteCloudinaryImage');
export const bulkDeleteCloudinaryImages = httpsCallable(functions, 'bulkDeleteCloudinaryImages');
export const getPayPalBalance = httpsCallable(functions, 'getPayPalBalance');
export const syncPayPalTransactions = httpsCallable(functions, 'syncPayPalTransactions');


let analytics;
let messaging: any = null;
if (typeof window !== "undefined") {
    // Only import analytics on the client side
    import("firebase/analytics").then(({ getAnalytics }) => {
        analytics = getAnalytics(app);
    });

    // Initialize Messaging
    import("firebase/messaging").then(({ getMessaging }) => {
        try {
            messaging = getMessaging(app);
        } catch (e) {
            console.log("Firebase Messaging failed to initialize", e);
        }
    });
}

export { analytics, messaging };
