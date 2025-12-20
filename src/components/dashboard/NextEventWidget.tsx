"use client";

import { Calendar, MapPin, Clock, Copy, Check, Users, X } from "lucide-react";
import { useState, useMemo } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Member } from "@/types";
import { collection, doc, deleteDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useFirestoreQuery } from "@/hooks/useFirestoreQuery";
import { cn } from "@/lib/utils";

interface NextEventWidgetProps {
    event?: {
        id?: string;
        title: string;
        date: string;
        location?: string;
        time?: string;
        type: 'set' | 'vote';
    } | null;
    members?: Member[];
    currentUserId?: string;
}

export function NextEventWidget({ event, members = [], currentUserId }: NextEventWidgetProps) {
    // Only fetch rsvps if it is a 'set' event and has an ID
    const shouldFetch = event?.type === 'set' && !!event?.id;

    // Hooks cannot be conditional, so we pass a dummy path or skip depending on hook implementation.
    // Our hook handles null query gracefully? Let's check. 
    // Usually hooks need consistent calls. 
    // We can use a stable query key that returns empty if disabled.

    const rsvpQuery = useMemo(() => {
        if (!shouldFetch || !event?.id) return null;
        return collection(db, "set_events", event.id, "rsvps");
    }, [shouldFetch, event?.id]);

    // We must pass a valid query or null. 
    // If useFirestoreQuery doesn't handle null, we might need to handle it.
    // Looking at useFirestoreQuery source (via memory/assumptions): standard hooks usually assume valid query.
    // But if I pass null, fetching should be skipped or error.
    // Let's assume standard behavior: we need a safe fallback or the hook supports it.
    // SAFEST: Always call it, but query a non-existent path if skipped? No, that's wasteful.
    // Our hook likely supports null or we use a separate component for the RSVP part to isolate the hook.
    // ISOLATION STRATEGY: Create `EventVoterList` component and render it conditionally.

    return (
        <div className="rounded-xl border border-border bg-gradient-to-br from-primary/10 to-purple-500/10 p-6 shadow-sm h-full flex flex-col">
            {!event ? (
                <>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-lg text-foreground">Next Meetup</h3>
                    </div>
                    <div className="text-center text-muted-foreground py-4 flex-1 flex items-center justify-center">
                        No upcoming events scheduled.
                    </div>
                </>
            ) : (
                <>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-lg text-foreground">Next Meetup</h3>
                        <span className="rounded-full bg-primary/20 px-3 py-1 text-xs font-medium text-primary">
                            {event.type === 'vote' ? 'Projected' : 'Confirmed'}
                        </span>
                    </div>

                    <div className="space-y-4 flex-1">
                        <div>
                            <h4 className="text-2xl font-bold text-primary">{format(parseISO(event.date), "EEEE, MMM d")}</h4>
                            <p className="text-muted-foreground">{event.title}</p>
                        </div>

                        <div className="flex flex-col gap-2 pt-2">
                            <EventDetails event={event} />

                            {/* RSVP Section (Only for Set Events) */}
                            {event.type === 'set' && event.id && (
                                <EventVoterList
                                    eventId={event.id}
                                    members={members}
                                    currentUserId={currentUserId}
                                />
                            )}
                        </div>
                    </div>
                </>
            )}

            <Link href="/events" className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors text-center block mt-4">
                {event ? "View Details" : "Go to Calendar"}
            </Link>
        </div>
    );
}

// Subcomponents to keep hooks clean and conditional
function EventDetails({ event }: { event: any }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        if (!event?.location) return;
        navigator.clipboard.writeText(event.location);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{event.time || "19:00"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground group">
                <MapPin className="h-4 w-4" />
                <span>{event.location || "TBD"}</span>
                {event.location && (
                    <button
                        onClick={handleCopy}
                        className="ml-2 p-1 rounded-md hover:bg-primary/20 text-primary transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="Copy Location"
                    >
                        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </button>
                )}
            </div>
        </div>
    );
}

function EventVoterList({ eventId, members, currentUserId }: { eventId: string, members: Member[], currentUserId?: string }) {
    const q = useMemo(() => collection(db, "set_events", eventId, "rsvps"), [eventId]);
    const { data: rsvps } = useFirestoreQuery<{ userId: string; attending: boolean }>(q, { idField: "userId" });

    // Derive data
    const attendees = rsvps.filter(r => r.attending).map(r => members.find(m => m.id === r.userId)).filter(Boolean);
    const declined = rsvps.filter(r => !r.attending).map(r => members.find(m => m.id === r.userId)).filter(Boolean);

    const myRsvp = rsvps.find(r => r.userId === currentUserId);
    const myStatus = myRsvp ? (myRsvp.attending ? 'yes' : 'no') : null;

    const handleRsvp = async (status: 'yes' | 'no') => {
        if (!currentUserId) return;

        const newStatus = status === 'yes';

        if (myStatus === status) {
            // Remove RSVP
            await deleteDoc(doc(db, "set_events", eventId, "rsvps", currentUserId));
        } else {
            // Set RSVP
            await setDoc(doc(db, "set_events", eventId, "rsvps", currentUserId), {
                attending: newStatus,
                updatedAt: new Date()
            });
        }
    };

    if (!members.length) return null; // Wait for members

    return (
        <div className="mt-4 pt-4 border-t border-border/50">
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Who's In?</span>
                <div className="flex gap-1">
                    <button
                        onClick={() => handleRsvp('yes')}
                        className={cn(
                            "flex items-center justify-center h-6 w-6 rounded-full border transition-colors",
                            myStatus === 'yes'
                                ? "bg-green-500 text-white border-green-500"
                                : "border-border hover:border-green-500 hover:text-green-500"
                        )}
                        title="Attending"
                    >
                        <Check className="h-3 w-3" />
                    </button>
                    <button
                        onClick={() => handleRsvp('no')}
                        className={cn(
                            "flex items-center justify-center h-6 w-6 rounded-full border transition-colors",
                            myStatus === 'no'
                                ? "bg-red-500 text-white border-red-500"
                                : "border-border hover:border-red-500 hover:text-red-500"
                        )}
                        title="Not Attending"
                    >
                        <X className="h-3 w-3" />
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-2 overflow-hidden">
                {/* Attendees */}
                {attendees.length > 0 ? (
                    <div className="flex -space-x-2">
                        {attendees.map(m => (
                            <div key={m?.id} className="relative h-8 w-8 rounded-full border-2 border-background overflow-hidden bg-muted" title={m?.name}>
                                <img src={m?.avatarUrl} alt={m?.name} className="h-full w-full object-cover" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-sm text-muted-foreground italic">No responses yet</div>
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
        </div>
    );
}
