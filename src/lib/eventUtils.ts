import {
    collection,
    query,
    where,
    getDocs,
    deleteDoc,
    doc,
    serverTimestamp,
    setDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Manages birthday events for a member.
 * Ensures that "Geburtstag [Name]" events exist for the current and next year.
 * If birthday is removed, deletes future birthday events.
 *
 * FIX: Previously used a compound query (hostId + description) which required a
 * Composite Index in Firestore that was never created. This caused the Firebase SDK
 * to hang indefinitely, blocking all subsequent Firestore reads (including the Finance page).
 *
 * Solution: Only filter by hostId (single-field = no index required), then filter
 * description locally in memory. This is safe and efficient since hostId is selective enough.
 */
export async function manageBirthdayEvents(memberId: string, name: string, birthdayString?: string) {
    if (!memberId) return;

    // 1. Clean up OLD legacy events — filter by hostId only (no Composite Index needed)
    //    Then filter in memory for the description to avoid the "missing index" deadlock.
    const eventsRef = collection(db, "set_events");
    const qOld = query(
        eventsRef,
        where("hostId", "==", memberId)
    );

    try {
        const oldSnap = await getDocs(qOld);
        const deletePromises = oldSnap.docs
            .filter(d => d.data().description === "System generated birthday event")
            .map(d => deleteDoc(doc(db, "set_events", d.id)));

        if (deletePromises.length > 0) {
            await Promise.all(deletePromises);
        }
    } catch (err) {
        // Non-fatal: log but don't block the caller
        console.warn("[manageBirthdayEvents] Failed to clean up old events:", err);
    }

    // 2. Handle New Events
    // If birthday is cleared, we are done (old ones deleted above).
    if (!birthdayString) return;

    // Birthday exists — Parse it
    const [, bMonthStr, bDayStr] = birthdayString.split("-");
    const bMonth = parseInt(bMonthStr, 10);
    const bDay = parseInt(bDayStr, 10);
    if (!bMonth || !bDay) return;

    const currentYear = new Date().getFullYear();
    const targetYears = [currentYear, currentYear + 1];

    for (const year of targetYears) {
        const dateStr = `${year}-${String(bMonth).padStart(2, "0")}-${String(bDay).padStart(2, "0")}`;
        const title = `Geburtstag ${name}`;
        const eventId = `birthday_${memberId}_${year}`; // Deterministic ID

        try {
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
                status: "confirmed"
            });
        } catch (err) {
            console.warn(`[manageBirthdayEvents] Failed to create event for ${year}:`, err);
        }
    }
}
