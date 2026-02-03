import { useMemo, useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { Trophy, Calendar as CalendarIcon, MapPin, Trash2, Pencil, CalendarPlus } from "lucide-react";
import { deleteDoc, doc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DeleteConfirmationModal } from "@/components/common/DeleteConfirmationModal";
import { EditEventModal } from "@/components/events/EditEventModal";
import { SetEventItem } from "@/components/events/SetEventItem";
import type { StammtischVote, SetEvent, Member } from "@/types";
import { cn } from "@/lib/utils";
import { MemberAvatar } from "@/components/common/MemberAvatar";

interface MonthSummaryProps {
    currentMonth: Date;
    votes: StammtischVote[];
    setEvents: SetEvent[];
    currentUserId: string;
    totalMembers: number;
    members: Member[];
    dict: any;
    onCreateEvent: (date: Date) => void;
}

export function MonthSummary({ currentMonth, votes, setEvents, currentUserId, totalMembers, members, dict, onCreateEvent }: MonthSummaryProps) {
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

    const uniqueVotersCount = useMemo(() => {
        const voters = new Set(votes.map(v => v.userId));
        return voters.size;
    }, [votes]);

    // Auto-create Stammtisch event if voting is complete and clear winner
    useEffect(() => {
        if (totalMembers > 0 && uniqueVotersCount === totalMembers && topDates.length === 1) {
            const winner = topDates[0];
            const winningDate = winner.dateStr;

            // Check if event already exists for this date (simple check)
            // Ideally we check if a "Stammtisch" event specifically exists, but checking any event on that date is safer for now to avoid conflicts
            const hasEvent = setEvents.some(e => e.date === winningDate);

            if (!hasEvent) {
                const createAutoEvent = async () => {
                    try {
                        await addDoc(collection(db, "set_events"), {
                            title: `Stammtisch ${format(parseISO(winningDate), "MMMM")}`,
                            date: winningDate,
                            time: "20:00",
                            location: "Neutral",
                            description: "Auto-generated based on voting results",
                            month: parseISO(winningDate).getMonth(),
                            year: parseISO(winningDate).getFullYear(),
                            createdBy: currentUserId,
                            createdAt: serverTimestamp()
                        });
                    } catch (err) {
                        console.error("Failed to auto-create event", err);
                    }
                };
                createAutoEvent();
            }
        }
    }, [uniqueVotersCount, totalMembers, topDates, setEvents, currentUserId]);

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
                                    Tie: {topDates.length} dates with {topDates[0].count} {dict.events.modal.summary.votes}
                                </div>
                            )}

                            <div className="space-y-3">
                                {topDates.map((item) => {
                                    const itemVotes = votes.filter(v => v.date === item.dateStr);

                                    return (
                                        <div key={item.dateStr} className="flex flex-col gap-2 border-b border-yellow-500/10 pb-3 last:border-0 last:pb-0">
                                            <div className="flex items-center justify-between">
                                                <div className="text-2xl font-extrabold">{format(parseISO(item.dateStr), "EEEE, MMM do")}</div>
                                                <div className="flex items-center gap-2">
                                                    {topDates.length === 1 && (
                                                        <div className="text-sm font-medium text-muted-foreground hidden sm:block">
                                                            {item.count} {item.count === 1 ? 'vote' : dict.events.modal.summary.votes}
                                                        </div>
                                                    )}
                                                    <button
                                                        onClick={() => onCreateEvent(parseISO(item.dateStr))}
                                                        className="p-1.5 rounded-full hover:bg-muted text-muted-foreground/50 hover:text-foreground transition-colors"
                                                        title={dict.events.modal.summary.createStammtisch}
                                                    >
                                                        <CalendarPlus className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Voters Avatars */}
                                            {itemVotes.length > 0 && (
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{dict.events.modal.summary.votedBy}</span>
                                                    <div className="flex -space-x-2">
                                                        {itemVotes.map((v, i) => {
                                                            const m = members.find(mem => mem.id === v.userId);
                                                            if (!m) return null;
                                                            return (
                                                                <div
                                                                    key={`${item.dateStr}-voter-${v.userId}-${i}`}
                                                                    title={m.name}
                                                                >
                                                                    <MemberAvatar member={m} size="sm" className="h-6 w-6 border-2 border-background" />
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
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

                    {/* Voting Progress */}
                    {votes.length > 0 && (
                        <div className="mt-6 border-t border-yellow-500/10 pt-4">
                            <div className="flex justify-between text-xs mb-1.5 font-medium text-muted-foreground">
                                <span>{dict.events.modal.summary.votingProgress}</span>
                                <span>{uniqueVotersCount}/{totalMembers} {dict.events.modal.summary.membersVoted}</span>
                            </div>
                            <div className="h-2 w-full bg-background/50 rounded-full overflow-hidden border border-border/50">
                                <div
                                    className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 transition-all duration-500 ease-out rounded-full"
                                    style={{ width: `${Math.min((uniqueVotersCount / totalMembers) * 100, 100)}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Set Events List - Transparent Purple */}
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-6 shadow-sm h-fit">
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
                                members={members}
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
                    members={members}
                />
            )}
        </div>
    );
}