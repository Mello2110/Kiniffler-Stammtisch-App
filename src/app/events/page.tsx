"use client";

import { useState, useEffect } from "react";
import { collection, query, onSnapshot, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CalendarView } from "@/components/events/CalendarView";
import { MonthSummary } from "@/components/events/MonthSummary";
import { DateInteractionModal } from "@/components/events/DateInteractionModal";
import type { StammtischVote, SetEvent, Member } from "@/types";
import { startOfMonth, endOfMonth, min, max, format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

export default function EventsPage() {
    const { user } = useAuth();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    const [votes, setVotes] = useState<StammtischVote[]>([]);
    const [setEvents, setSetEvents] = useState<SetEvent[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch Data
    useEffect(() => {
        // Listen for Votes
        const votesUnsub = onSnapshot(collection(db, "stammtisch_votes"), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StammtischVote));
            setVotes(data);
        });

        // Listen for Set Events
        const eventsUnsub = onSnapshot(collection(db, "set_events"), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SetEvent));
            setSetEvents(data);
        });

        // Fetch Members for count
        const membersUnsub = onSnapshot(collection(db, "members"), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Member));
            setMembers(data);
        });

        setLoading(false);

        return () => {
            votesUnsub();
            eventsUnsub();
            membersUnsub();
        };
    }, []);

    // Filter for current month view
    const currentMonthVotes = votes.filter(v =>
        v.month === currentMonth.getMonth() && v.year === currentMonth.getFullYear()
    );

    const currentMonthEvents = setEvents.filter(e =>
        e.month === currentMonth.getMonth() && e.year === currentMonth.getFullYear()
    );

    return (
        <div className="flex flex-col gap-8 pb-10">
            <div>
                <h1 className="text-3xl font-bold font-heading">Event Calendar</h1>
                <p className="text-muted-foreground">Vote for the next Stammtisch or add confirmed events.</p>
            </div>

            {/* Top Section: Month Summary */}
            <section className="animate-in fade-in duration-500">
                <MonthSummary
                    currentMonth={currentMonth}
                    votes={currentMonthVotes}
                    setEvents={currentMonthEvents}
                    currentUserId={user?.uid || ""}
                    totalMembers={members.length}
                />
            </section>

            {/* Main Calendar */}
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                <CalendarView
                    votes={votes} // Pass all, let calendar filter by day or optimize inside
                    setEvents={setEvents}
                    onDateClick={setSelectedDate}
                    currentMonth={currentMonth}
                    onMonthChange={setCurrentMonth}
                />
            </section>

            {/* Modal for adding/voting */}
            {selectedDate && (
                <DateInteractionModal
                    date={selectedDate}
                    onClose={() => setSelectedDate(null)}
                    currentUserId={user?.uid || ""}
                    members={members}
                    existingVotes={votes.filter(v =>
                        format(new Date(v.date), "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd")
                    )}
                />
            )}
        </div>
    );
}

