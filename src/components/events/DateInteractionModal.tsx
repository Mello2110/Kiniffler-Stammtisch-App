
import { useState } from "react";
import { format } from "date-fns";
import { ThumbsUp, CalendarPlus, X, Loader2, ThumbsDown } from "lucide-react";
import { collection, addDoc, doc, setDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { signInAnonymously } from "firebase/auth";
import type { StammtischVote } from "@/types";
import { useLanguage } from "@/contexts/LanguageContext";
import { enUS, de, pl } from "date-fns/locale";
import { EventForm } from "./EventForm";

interface DateInteractionModalProps {
    date: Date;
    onClose: () => void;
    currentUserId?: string;
    existingVotes?: StammtischVote[];
    members?: import("@/types").Member[];
}

export function DateInteractionModal({ date, onClose, currentUserId, existingVotes = [], members = [] }: DateInteractionModalProps) {
    const { dict, language } = useLanguage();
    const locales: any = { en: enUS, de: de, pl: pl };

    const [mode, setMode] = useState<"select" | "add-event">("select");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const dateStr = format(date, "yyyy-MM-dd");
    const displayDate = format(date, dict.events.modal.titleFormat, { locale: locales[language] });

    // Check if user has voted
    const userVote = existingVotes.find(v => v.userId === currentUserId);
    const hasVoted = !!userVote;

    const handleVote = async () => {
        setIsSubmitting(true);
        try {
            let userId = currentUserId || auth.currentUser?.uid;
            if (!userId) {
                const userCred = await signInAnonymously(auth);
                userId = userCred.user.uid;
            }

            const voteId = `${userId}_${dateStr}`;
            const voteRef = doc(db, "stammtisch_votes", voteId);

            const writePromise = setDoc(voteRef, {
                userId,
                date: dateStr,
                month: date.getMonth(),
                year: date.getFullYear(),
                createdAt: serverTimestamp()
            });

            const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 2000));
            await Promise.race([writePromise, timeoutPromise]);

            onClose();
        } catch (error) {
            console.error("Error voting:", error);
            alert("Note: Vote processing. Check console if it doesn't appear.");
            onClose();
        } finally {
            if (setIsSubmitting) setIsSubmitting(false);
        }
    };

    const handleUnvote = async () => {
        setIsSubmitting(true);
        try {
            const userId = currentUserId || auth.currentUser?.uid;
            if (!userId) return;

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

    const handleAddEvent = async (data: any) => {
        setIsSubmitting(true);
        try {
            const writePromise = addDoc(collection(db, "set_events"), {
                title: data.title,
                description: data.description,
                date: dateStr,
                time: data.time,
                location: data.location,
                month: date.getMonth(),
                year: date.getFullYear(),
                hostId: data.hostId,
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
                    <EventForm
                        members={members}
                        onSubmit={handleAddEvent}
                        onCancel={() => setMode("select")}
                        isSubmitting={isSubmitting}
                    />
                )}
            </div>
        </div>
    );
}
