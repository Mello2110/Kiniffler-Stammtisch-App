"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Trophy, Calendar as CalendarIcon, MapPin, Trash2, Pencil } from "lucide-react";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DeleteConfirmationModal } from "@/components/common/DeleteConfirmationModal";
import { EditEventModal } from "@/components/events/EditEventModal";
import { SetEventItem } from "@/components/events/SetEventItem";
import type { StammtischVote, SetEvent } from "@/types";

interface MonthSummaryProps {
    currentMonth: Date;
    votes: StammtischVote[];
    setEvents: SetEvent[];
    currentUserId: string;
    totalMembers: number;
}

export function MonthSummary({ currentMonth, votes, setEvents, currentUserId, totalMembers }: MonthSummaryProps) {
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [editingEvent, setEditingEvent] = useState<SetEvent | null>(null);

    // Calculate Top Voted Date(s)
    const topDates = useMemo(() => {
        if (votes.length === 0) return [];

        const voteCounts: Record<string, number> = {};
        votes.forEach(v => {
            voteCounts[v.date] = (voteCounts[v.date] || 0) + 1;
        });

        // Find max votes
        const maxVotes = Math.max(...Object.values(voteCounts));

        // Find all dates with max votes
        return Object.entries(voteCounts)
            .filter(([, count]) => count === maxVotes)
            .map(([dateStr, count]) => ({ dateStr, count }))
            .sort((a, b) => a.dateStr.localeCompare(b.dateStr)); // Sort by date
    }, [votes]);

    const handleDelete = async () => {
        if (!deletingId) return;
        try {
            await deleteDoc(doc(db, "set_events", deletingId));
            setDeletingId(null);
        } catch (error) {
            console.error("Error deleting event:", error);
        }
    };

    return (
        <div className="grid gap-6 md:grid-cols-2">
            {/* Top Stammtisch Date Card */}
            <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-6 shadow-sm relative overflow-hidden h-fit">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Trophy className="h-24 w-24 text-yellow-500" />
                </div>

                <h3 className="text-lg font-bold flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                    <Trophy className="h-5 w-5" />
                    Top Stammtisch Date
                </h3>

                <div className="mt-4">
                    {topDates.length > 0 ? (
                        <div className="space-y-4">
                            {topDates.length > 1 && (
                                <div className="inline-flex items-center rounded-full bg-yellow-500/20 px-3 py-1 text-xs font-semibold text-yellow-700 dark:text-yellow-300 mb-2">
                                    Tie: {topDates.length} dates with {topDates[0].count} votes
                                </div>
                            )}

                            <div className="space-y-3">
                                {topDates.map((item) => (
                                    <div key={item.dateStr} className="flex items-center justify-between border-b border-yellow-500/10 pb-2 last:border-0 last:pb-0">
                                        <div className="text-2xl font-extrabold">{format(parseISO(item.dateStr), "EEEE, MMM do")}</div>
                                        {topDates.length === 1 && (
                                            <div className="text-sm font-medium text-muted-foreground">
                                                {item.count} {item.count === 1 ? 'vote' : 'votes'}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {topDates.length === 1 && (
                                <div className="inline-flex items-center rounded-full bg-yellow-500/20 px-3 py-1 text-xs font-semibold text-yellow-700 dark:text-yellow-300">
                                    Current Leader
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2 py-4">
                            <p className="text-muted-foreground">No votes cast for this month yet.</p>
                            <p className="text-xs text-muted-foreground">Click a date in the calendar to start voting!</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Set Events List */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm h-fit">
                <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                    <CalendarIcon className="h-5 w-5 text-primary" />
                    Set Events
                </h3>

                {setEvents.length > 0 ? (
                    <div className="space-y-4">
                        {setEvents.map(event => (
                            <SetEventItem
                                key={event.id}
                                event={event}
                                currentUserId={currentUserId}
                                totalMembers={totalMembers}
                                onEdit={(e) => setEditingEvent(e)}
                                onDelete={(id) => setDeletingId(id)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-sm text-center">
                        <p>No extra events scheduled.</p>
                        <p className="text-xs opacity-70 mt-1">Add birthdays or holidays by clicking a date.</p>
                    </div>
                )}
            </div>

            <DeleteConfirmationModal
                isOpen={!!deletingId}
                onClose={() => setDeletingId(null)}
                onConfirm={handleDelete}
                title="Delete Event"
                description="Are you sure you want to delete this event?"
            />

            {editingEvent && (
                <EditEventModal
                    event={editingEvent}
                    onClose={() => setEditingEvent(null)}
                />
            )}
        </div>
    );
}
