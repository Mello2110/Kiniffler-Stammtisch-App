import { db } from "./firebase";
import { collection, addDoc } from "firebase/firestore";

interface EmailDocument {
    to: string;
    message: {
        subject: string;
        text: string;
        html: string;
    };
}

// Option A: Using Firebase Extension "Trigger Email from Firestore"
export async function sendEmail(to: string, subject: string, html: string, text: string) {
    try {
        await addDoc(collection(db, "mail"), {
            to: to,
            message: {
                subject: subject,
                text: text,
                html: html
            }
        } as EmailDocument);
        return true;
    } catch (error) {
        console.error("Error queuing email:", error);
        return false;
    }
}
