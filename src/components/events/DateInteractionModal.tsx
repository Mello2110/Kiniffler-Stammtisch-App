"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ThumbsUp, CalendarPlus, X, Loader2, ThumbsDown, Clock, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { collection, addDoc, doc, setDoc, serverTimestamp, deleteDoc, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "@/lib/firebase"; // Ensure firebase is initialized
import { signInAnonymously } from "firebase/auth"; // Temp auth for now if not logged in
import type { StammtischVote } from "@/types";
import { useLanguage } from "@/contexts/LanguageContext";
import { enUS, de, pl } from "date-fns/locale";

interface DateInteractionModalProps {
    date: Date;
    onClose: () => void;
    currentUserId?: string; // We'll need auth context later
    existingVotes?: StammtischVote[];
    members?: import("@/types").Member[];
}

export function DateInteractionModal({ date, onClose, currentUserId, existingVotes = [], members = [] }: DateInteractionModalProps) {
    const { dict, language } = useLanguage();
    const locales: any = { en: enUS, de: de, pl: pl };

    const [mode, setMode] = useState<"select" | "add-event">("select");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State for Set Event
    const [eventTitle, setEventTitle] = useState("");
    const [eventTime, setEventTime] = useState("19:00");
    const [eventLocation, setEventLocation] = useState("");
    const [eventDesc, setEventDesc] = useState("");
    const [hostId, setHostId] = useState("neutral");

    const dateStr = format(date, "yyyy-MM-dd");
    const displayDate = format(date, dict.events.modal.titleFormat, { locale: locales[language] });

    // Check if user has voted
    const userVote = existingVotes.find(v => v.userId === currentUserId);
    const hasVoted = !!userVote;

    const handleVote = async () => {
        setIsSubmitting(true);
        try {
            // Quick anonymous auth if needed
            let userId = currentUserId || auth.currentUser?.uid;
            if (!userId) {
                const userCred = await signInAnonymously(auth);
                userId = userCred.user.uid;
            }

            const voteId = `${userId}_${dateStr}`;
            const voteRef = doc(db, "stammtisch_votes", voteId);

            // Use a race to ensure we don't hang forever if network is slow
            // The UI updates optimistically via onSnapshot anyway
            const writePromise = setDoc(voteRef, {
                userId,
                date: dateStr,
                month: date.getMonth(),
                year: date.getFullYear(),
                createdAt: serverTimestamp()
            });

            // Force close after 2 seconds max
            const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 2000));

            await Promise.race([writePromise, timeoutPromise]);

            onClose();
        } catch (error) {
            console.error("Error voting:", error);
            // Only alert if it's a real error, not just a timeout (timeout resolves, doesn't reject)
            alert("Note: Vote processing. Check console if it doesn't appear.");
            onClose(); // Close anyway on error to avoid stuck UI? No, maybe keep open. 
            // Actually, for this implementation, let's allow close on catch if we want "immediately"
        } finally {
            if (setIsSubmitting) setIsSubmitting(false); // Safety check if unmounted, though closure handles it
        }
    };

    const handleUnvote = async () => {
        setIsSubmitting(true);
        try {
            // For unvote we need the user ID
            const userId = currentUserId || auth.currentUser?.uid;
            if (!userId) return; // Should not happen if hasVoted is true

            const voteId = `${userId}_${dateStr}`;
            const voteRef = doc(db, "stammtisch_votes", voteId);

            await deleteDoc(voteRef);
            onClose();
        } catch (error) {
            console.error("Error unvoting:", error);
            alert("Failed to remove vote.");
        } finally {
            if (setIsSubmitting) setIsSubmitting(false);
        }
    };

    const handleAddEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!eventTitle.trim()) return;

        setIsSubmitting(true);
        try {
            const writePromise = addDoc(collection(db, "set_events"), {
                title: eventTitle,
                description: eventDesc,
                date: dateStr,
                time: eventTime,
                location: eventLocation,
                month: date.getMonth(),
                year: date.getFullYear(),
                hostId,
                createdAt: serverTimestamp()
            });

            const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 2000));
            await Promise.race([writePromise, timeoutPromise]);

            onClose();
        } catch (error) {
            console.error("Error adding event:", error);
            alert("Failed to add event.");
        } finally {
            if (setIsSubmitting) setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-in fade-in duration-200">
            <div className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg animate-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-muted"
                >
                    <X className="h-4 w-4" />
                </button>

                <div className="mb-6">
                    <h2 className="text-xl font-bold capitalize">{displayDate}</h2>
                    <p className="text-sm text-muted-foreground">{dict.events.modal.subtitle}</p>
                </div>

                {mode === "select" ? (
                    <div className="grid gap-4">
                        {hasVoted ? (
                            <button
                                onClick={handleUnvote}
                                disabled={isSubmitting}
                                className="flex items-center gap-4 rounded-lg border border-border p-4 transition-all hover:border-destructive hover:bg-destructive/5 disabled:opacity-50"
                            >
                                <div className="rounded-full bg-destructive/10 p-3 text-destructive">
                                    {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : <ThumbsDown className="h-6 w-6" />}
                                </div>
                                <div className="text-left">
                                    <div className="font-semibold text-destructive">{dict.events.modal.unvote.title}</div>
                                    <div className="text-xs text-muted-foreground">{dict.events.modal.unvote.desc}</div>
                                </div>
                            </button>
                        ) : (
                            <button
                                onClick={handleVote}
                                disabled={isSubmitting}
                                className="flex items-center gap-4 rounded-lg border border-border p-4 transition-all hover:border-primary hover:bg-primary/5 disabled:opacity-50"
                            >
                                <div className="rounded-full bg-primary/10 p-3 text-primary">
                                    {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : <ThumbsUp className="h-6 w-6" />}
                                </div>
                                <div className="text-left">
                                    <div className="font-semibold">{dict.events.modal.vote.title}</div>
                                    <div className="text-xs text-muted-foreground">{dict.events.modal.vote.desc}</div>
                                </div>
                            </button>
                        )}

                        <button
                            onClick={() => setMode("add-event")}
                            className="flex items-center gap-4 rounded-lg border border-border p-4 transition-all hover:border-purple-500 hover:bg-purple-500/5"
                        >
                            <div className="rounded-full bg-purple-500/10 p-3 text-purple-500">
                                <CalendarPlus className="h-6 w-6" />
                            </div>
                            <div className="text-left">
                                <div className="font-semibold">{dict.events.modal.addEvent.title}</div>
                                <div className="text-xs text-muted-foreground">{dict.events.modal.addEvent.desc}</div>
                            </div>
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleAddEvent} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{dict.events.modal.form.title}</label>
                            <input
                                type="text"
                                value={eventTitle}
                                onChange={(e) => setEventTitle(e.target.value)}
                                placeholder={dict.events.modal.form.placeholder}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                autoFocus
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">{dict.events.modal.form.host}</label>
                            <select
                                value={hostId}
                                onChange={(e) => setHostId(e.target.value)}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <option value="neutral">{dict.events.modal.form.neutral}</option>
                                {members.map(member => (
                                    <option key={member.id} value={member.id}>
                                        {member.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">{dict.events.modal.form.time}</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <input
                                        type="time"
                                        value={eventTime}
                                        onChange={(e) => setEventTime(e.target.value)}
                                        className="w-full rounded-md border border-input bg-background pl-9 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">{dict.events.modal.form.location}</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <input
                                        type="text"
                                        value={eventLocation}
                                        onChange={(e) => setEventLocation(e.target.value)}
                                        placeholder={dict.events.modal.form.venuePlaceholder}
                                        className="w-full rounded-md border border-input bg-background pl-9 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">{dict.events.modal.form.desc}</label>
                            <textarea
                                value={eventDesc}
                                onChange={(e) => setEventDesc(e.target.value)}
                                placeholder={dict.events.modal.form.descPlaceholder}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[80px]"
                            />
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setMode("select")}
                                className="flex-1 rounded-md border border-input bg-background py-2 text-sm font-medium hover:bg-muted"
                            >
                                {dict.events.modal.form.back}
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting || !eventTitle.trim()}
                                className="flex-1 rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                            >
                                {isSubmitting ? dict.events.modal.form.saving : dict.events.modal.form.create}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
