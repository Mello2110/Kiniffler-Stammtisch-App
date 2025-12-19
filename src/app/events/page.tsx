"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, query, onSnapshot, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useFirestoreQuery } from "@/hooks/useFirestoreQuery";
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

    const [loading, setLoading] = useState(true);

    // Fetch Data
    const qVotes = useMemo(() => query(collection(db, "stammtisch_votes")), []);
    const { data: votes } = useFirestoreQuery<StammtischVote>(qVotes);

    const qEvents = useMemo(() => query(collection(db, "set_events")), []);
    const { data: setEvents } = useFirestoreQuery<SetEvent>(qEvents);

    const qMembers = useMemo(() => query(collection(db, "members")), []);
    const { data: members, loading: loadingMembers } = useFirestoreQuery<Member>(qMembers);

    useEffect(() => {
        if (!loadingMembers) {
            setLoading(false);
        }
    }, [loadingMembers]);

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

