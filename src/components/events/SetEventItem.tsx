import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { Pencil, Trash2, Check, X, Users } from "lucide-react";
import { collection, doc, setDoc, deleteDoc } from "firebase/firestore";
import { useFirestoreQuery } from "@/hooks/useFirestoreQuery";
import { db } from "@/lib/firebase";
import type { SetEvent } from "@/types";
import { cn } from "@/lib/utils";

interface SetEventItemProps {
    event: SetEvent;
    currentUserId: string;
    totalMembers: number;
    members: import("@/types").Member[];
    onEdit: (event: SetEvent) => void;
    onDelete: (id: string) => void;
}

export function SetEventItem({ event, currentUserId, totalMembers, members, onEdit, onDelete }: SetEventItemProps) {
    const q = useMemo(() => collection(db, "set_events", event.id, "rsvps"), [event.id]);
    const { data: rsvps } = useFirestoreQuery<{ userId: string; attending: boolean }>(q, { idField: "userId" });

    const attendingCount = rsvps.filter(r => r.attending).length;
    const myRsvp = rsvps.find(r => r.userId === currentUserId);
    const myStatus = myRsvp ? (myRsvp.attending ? 'yes' : 'no') : null;

    const attendees = rsvps.filter(r => r.attending).map(r => members.find(m => m.id === r.userId)).filter(Boolean);
    const declined = rsvps.filter(r => !r.attending).map(r => members.find(m => m.id === r.userId)).filter(Boolean);

    const handleRsvp = async (status: 'yes' | 'no') => {
        if (!currentUserId) return;

        const newStatus = status === 'yes';

        if (myStatus === status) {
            // Remove RSVP
            await deleteDoc(doc(db, "set_events", event.id, "rsvps", currentUserId));
        } else {
            // Set RSVP
            await setDoc(doc(db, "set_events", event.id, "rsvps", currentUserId), {
                attending: newStatus,
                updatedAt: new Date()
            });
        }
    };

    return (
        <div className="group flex flex-col gap-3 rounded-lg border border-primary/20 p-3 hover:bg-primary/10 transition-colors bg-black/10">
            <div className="flex gap-4 items-center">
                <div className="flex h-12 w-12 flex-col items-center justify-center rounded bg-primary/10 text-primary shrink-0">
                    <span className="text-[10px] font-bold uppercase">{format(parseISO(event.date), "MMM")}</span>
                    <span className="text-lg font-bold leading-none">{format(parseISO(event.date), "d")}</span>
                </div>
                <div className="flex-1">
                    <h4 className="font-semibold text-sm">{event.title}</h4>
                    {event.description && <p className="text-xs text-muted-foreground line-clamp-1">{event.description}</p>}
                </div>

                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => onEdit(event)}
                        className="p-2 text-muted-foreground hover:text-primary transition-colors"
                        title="Edit"
                    >
                        <Pencil className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => onDelete(event.id)}
                        className="p-2 text-muted-foreground hover:text-primary transition-colors"
                        title="Delete"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* RSVP Section */}
            <div className="flex items-center justify-between border-t border-border pt-2 mt-1">
                {/* Avatars */}
                <div className="flex items-center gap-2 overflow-hidden">
                    {/* Attendees */}
                    {attendees.length > 0 && (
                        <div className="flex -space-x-2">
                            {attendees.map(m => (
                                <div key={m?.id} className="relative h-6 w-6 rounded-full border-2 border-background overflow-hidden bg-muted" title={m?.name}>
                                    <img src={m?.avatarUrl} alt={m?.name} className="h-full w-full object-cover" />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Divider if both exist */}
                    {attendees.length > 0 && declined.length > 0 && (
                        <div className="h-4 w-[1px] bg-border mx-1" />
                    )}

                    {/* Decliners */}
                    {declined.length > 0 && (
                        <div className="flex -space-x-2 opacity-50 grayscale hover:grayscale-0 transition-all">
                            {declined.map(m => (
                                <div key={m?.id} className="relative h-6 w-6 rounded-full border-2 border-background overflow-hidden bg-muted" title={m?.name + " (Declined)"}>
                                    <img src={m?.avatarUrl} alt={m?.name} className="h-full w-full object-cover" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => handleRsvp('yes')}
                        className={cn(
                            "flex items-center justify-center h-8 w-8 rounded-full border transition-colors",
                            myStatus === 'yes'
                                ? "bg-green-500 text-white border-green-500"
                                : "border-border hover:border-green-500 hover:text-green-500"
                        )}
                        title="Attending"
                    >
                        <Check className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => handleRsvp('no')}
                        className={cn(
                            "flex items-center justify-center h-8 w-8 rounded-full border transition-colors",
                            myStatus === 'no'
                                ? "bg-red-500 text-white border-red-500"
                                : "border-border hover:border-red-500 hover:text-red-500"
                        )}
                        title="Not Attending"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
