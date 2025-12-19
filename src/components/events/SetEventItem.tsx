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
    onEdit: (event: SetEvent) => void;
    onDelete: (id: string) => void;
}

export function SetEventItem({ event, currentUserId, totalMembers, onEdit, onDelete }: SetEventItemProps) {
    const q = useMemo(() => collection(db, "set_events", event.id, "rsvps"), [event.id]);
    const { data: rsvps } = useFirestoreQuery<{ userId: string; attending: boolean }>(q, { idField: "userId" });

    const attendingCount = rsvps.filter(r => r.attending).length;
    const myRsvp = rsvps.find(r => r.userId === currentUserId);
    const myStatus = myRsvp ? (myRsvp.attending ? 'yes' : 'no') : null;

    const handleRsvp = async (status: 'yes' | 'no') => {
        if (!currentUserId) return;

        // If clicking the active status, maybe toggle off? Or just keep it. 
        // User said: "toggle their RSVP status". 
        // If I click 'yes' and I'm already 'yes', maybe remove RSVP? 
        // Or "toggle" means switch between yes/no.
        // Let's implement definitive selection + toggle off if same clicked.

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
        <div className="group flex flex-col gap-3 rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors">
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
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    <span>{attendingCount}/{totalMembers} Members</span>
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
