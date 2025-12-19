import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SetEvent } from "@/types";

/**
 * Manages birthday events for a member.
 * Ensures that "Geburtstag [Name]" events exist for the current and next year.
 * If birthday is removed, deletes future birthday events.
 */
export async function manageBirthdayEvents(memberId: string, name: string, birthdayString?: string) {
    if (!memberId) return;

    // 1. Clean up OLD legacy events (where hostId was set)
    // We only do this efficiently if we can query them. 
    // Optimization: We could skip this or do it once. 
    // Let's keep it simple: If we switch to deterministic IDs, the old ones might duplicate if we don't clean them.
    // Query old events by hostId AND title starts with "Geburtstag"
    const eventsRef = collection(db, "set_events");
    const qOld = query(
        eventsRef,
        where("hostId", "==", memberId),
        where("description", "==", "System generated birthday event")
    );
    const oldSnap = await getDocs(qOld);
    const deleteOldPromises = oldSnap.docs.map(d => deleteDoc(doc(db, "set_events", d.id)));
    if (deleteOldPromises.length > 0) {
        await Promise.all(deleteOldPromises);
    }

    // 2. Handle New Events
    // If birthday is cleared, we are done (old ones deleted above).
    if (!birthdayString) return;

    // Birthday exists - Parse it
    const [bYear, bMonth, bDay] = birthdayString.split("-").map(Number);
    if (!bMonth || !bDay) return;

    const currentYear = new Date().getFullYear();
    const targetYears = [currentYear, currentYear + 1];

    // We import setDoc to write with custom ID
    const { setDoc } = await import("firebase/firestore");

    for (const year of targetYears) {
        const dateStr = `${year}-${String(bMonth).padStart(2, '0')}-${String(bDay).padStart(2, '0')}`;
        const title = `Geburtstag ${name}`;
        const eventId = `birthday_${memberId}_${year}`; // Deterministic ID

        await setDoc(doc(db, "set_events", eventId), {
            title: title,
            description: "System generated birthday event",
            date: dateStr,
            month: bMonth - 1, // 0-11
            year: year,
            time: "00:00",
            location: "",
            hostId: null, // Neutral host
            createdAt: serverTimestamp(),
            status: 'confirmed'
        });
    }
}
