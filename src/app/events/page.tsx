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
import { useLanguage } from "@/contexts/LanguageContext";
import { Calendar, PartyPopper } from "lucide-react";

export default function EventsPage() {
    const { user } = useAuth();
    const { dict } = useLanguage();
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
            {/* Header Section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 via-background to-background border p-8 md:p-12">
                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-4 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-wider uppercase">
                            <Calendar className="h-3 w-3" />
                            {dict.headers.events.badge}
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight outfit">
                            {dict.headers.events.title} <span className="text-primary italic">{dict.headers.events.highlight}</span>
                        </h1>
                        <p className="text-muted-foreground text-lg leading-relaxed">
                            {dict.headers.events.subtext}
                        </p>
                    </div>

                    <div className="flex items-center gap-4 text-muted-foreground">
                        <div className="flex flex-col items-end">
                            <span className="text-2xl font-black text-foreground outfit">{setEvents.length}</span>
                            <span className="text-xs uppercase font-bold tracking-widest">{dict.sidebar.events}</span>
                        </div>
                        <div className="h-10 w-px bg-border" />
                        <PartyPopper className="h-8 w-8 opacity-20" />
                    </div>
                </div>

                <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
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

