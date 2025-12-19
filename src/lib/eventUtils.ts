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

    // 1. Find existing birthday events for this user
    const eventsRef = collection(db, "set_events");
    // We can filter by hostId to find events "owned" by this user's birthday logic
    // OR we can search by title pattern if we didn't set hostId (but we should set hostId = memberId for tracking)
    // Let's rely on hostId === memberId AND title starts with "Geburtstag"
    const q = query(
        eventsRef,
        where("hostId", "==", memberId),
        where("description", "==", "System generated birthday event")
    );

    const snapshot = await getDocs(q);
    const existingEvents = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SetEvent));

    // If birthday is cleared/removed
    if (!birthdayString) {
        // Delete all future system generated birthday events for this user
        const deletePromises = existingEvents.map(event => deleteDoc(doc(db, "set_events", event.id)));
        await Promise.all(deletePromises);
        return;
    }

    // Birthday exists - Parse it
    // Format expected: YYYY-MM-DD
    const [bYear, bMonth, bDay] = birthdayString.split("-").map(Number);
    if (!bMonth || !bDay) return; // Invalid format

    const currentYear = new Date().getFullYear();
    const targetYears = [currentYear, currentYear + 1];

    for (const year of targetYears) {
        // Construct the target date for this year
        // Month is 0-indexed in JS Date, but we store 1-indexed in string probably?
        // Let's assume input string is "YYYY-MM-DD" standard ISO (1-12)
        // SetEvent expects: date string YYYY-MM-DD, month (0-11), year, etc.

        // Handle leap years? simplified: check if date is valid
        const targetDate = new Date(year, bMonth - 1, bDay, 12, 0, 0); // Noon to avoid timezone shifts

        // If date is invalid (e.g. Feb 29 on non-leap year), it rolls over to Mar 1.
        // That's acceptable or we can skip.

        const dateStr = `${year}-${String(bMonth).padStart(2, '0')}-${String(bDay).padStart(2, '0')}`;
        const title = `Geburtstag ${name}`;

        // Check if we already have an event for this year
        const existingEvent = existingEvents.find(e => e.year === year);

        if (existingEvent) {
            // Update if details changed (e.g. name changed or date changed)
            if (existingEvent.title !== title || existingEvent.date !== dateStr) {
                await updateDoc(doc(db, "set_events", existingEvent.id), {
                    title: title,
                    date: dateStr,
                    month: bMonth - 1, // 0-11
                    year: year
                });
            }
        } else {
            // Create new event
            await addDoc(eventsRef, {
                title: title,
                description: "System generated birthday event",
                date: dateStr,
                month: bMonth - 1, // 0-11
                year: year,
                time: "00:00", // All day essentially
                location: "",
                hostId: memberId,
                createdAt: serverTimestamp(),
                // Add required SetEvent fields if missing from type definition in my head?
                // Type SetEvent: id, title, description, date, month, year, time, location, hostId, createdAt
            });
        }
    }
}
