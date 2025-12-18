"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ThumbsUp, MapPin, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Event } from "@/types";

interface VotingCardProps {
    event: Event;
}

export function VotingCard({ event }: VotingCardProps) {
    const [hasVoted, setHasVoted] = useState(false);
    const [votes, setVotes] = useState(event.votes);

    const handleVote = () => {
        if (hasVoted) {
            setVotes(v => v - 1);
            setHasVoted(false);
        } else {
            setVotes(v => v + 1);
            setHasVoted(true);
        }
    };

    return (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/50">
            <div className="flex items-start justify-between">
                <div>
                    <h3 className="font-semibold text-foreground">{event.title}</h3>
                    <p className="text-sm text-muted-foreground">{format(new Date(event.date), "EEEE, MMM d, yyyy")}</p>
                </div>
                <div className={cn("flex flex-col items-center rounded-lg border p-2 min-w-[60px]", hasVoted ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted/30 text-muted-foreground")}>
                    <span className="text-lg font-bold">{votes}</span>
                    <span className="text-[10px] uppercase font-medium">Votes</span>
                </div>
            </div>

            <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{format(new Date(event.date), "HH:mm")}</span>
                </div>
                <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{event.location}</span>
                </div>
            </div>

            <button
                onClick={handleVote}
                className={cn(
                    "mt-2 flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors",
                    hasVoted
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
            >
                <ThumbsUp className="h-4 w-4" />
                {hasVoted ? "Voted" : "Vote for this date"}
            </button>
        </div>
    );
}
