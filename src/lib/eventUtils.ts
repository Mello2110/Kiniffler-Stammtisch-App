import {
    query,
    where,
    getDocs,
    deleteDoc,
    doc,
    serverTimestamp,
    setDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DEFAULT_CLUB_ID, getClubCollection, getClubDoc } from "@/lib/clubPaths";

export async function manageBirthdayEvents(memberId: string, name: string, birthdayString?: string, clubId: string = DEFAULT_CLUB_ID) {
    if (!memberId) return;

    const eventsRef = getClubCollection(clubId, "set_events");
    const qOld = query(
        eventsRef,
        where("hostId", "==", memberId)
    );

    try {
        const oldSnap = await getDocs(qOld);
        const deletePromises = oldSnap.docs
            .filter(d => d.data().description === "System generated birthday event")
            .map(d => deleteDoc(getClubDoc(clubId, "set_events", d.id)));

        if (deletePromises.length > 0) {
            await Promise.all(deletePromises);
        }
    } catch (err) {
        console.warn("[manageBirthdayEvents] Failed to clean up old events:", err);
    }

    if (!birthdayString) return;

    const [, bMonthStr, bDayStr] = birthdayString.split("-");
    const bMonth = parseInt(bMonthStr, 10);
    const bDay = parseInt(bDayStr, 10);
    if (!bMonth || !bDay) return;

    const currentYear = new Date().getFullYear();
    const targetYears = [currentYear, currentYear + 1];

    for (const year of targetYears) {
        const dateStr = `${year}-${String(bMonth).padStart(2, "0")}-${String(bDay).padStart(2, "0")}`;
        const title = `Geburtstag ${name}`;
        const eventId = `birthday_${memberId}_${year}`;
        const payload = {
            title: title,
            description: "System generated birthday event",
            date: dateStr,
            month: bMonth - 1,
            year: year,
            time: "00:00",
            location: "",
            hostId: null,
            createdAt: serverTimestamp(),
            status: "confirmed"
        };

        try {
            await setDoc(getClubDoc(clubId, "set_events", eventId), payload);
            if (clubId === "club_original") {
                await setDoc(doc(db, "set_events", eventId), payload).catch(() => {});
            }
        } catch (err) {
            console.warn(`[manageBirthdayEvents] Failed to create event for ${year}:`, err);
        }
    }
}
