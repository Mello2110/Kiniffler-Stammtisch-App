import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
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
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Cloud Function callable references
export const deleteCloudinaryImage = httpsCallable(functions, 'deleteCloudinaryImage');
export const bulkDeleteCloudinaryImages = httpsCallable(functions, 'bulkDeleteCloudinaryImages');

if (typeof window !== "undefined") {
    // Enable offline persistence
    import("firebase/firestore").then(({ enableMultiTabIndexedDbPersistence }) => {
        enableMultiTabIndexedDbPersistence(db).catch((err) => {
            console.log("Firestore persistence request:", err.code);
        });
    });
}

let analytics;
if (typeof window !== "undefined") {
    // Only import analytics on the client side
    import("firebase/analytics").then(({ getAnalytics }) => {
        analytics = getAnalytics(app);
    });
}

export { analytics };
