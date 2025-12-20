"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, CheckCircle2, ArrowUpDown } from "lucide-react";
import { FeedbackItem, FeedbackItemProps } from "./FeedbackItem";
import { cn } from "@/lib/utils";
import { FeedbackData } from "./FeedbackForm";
import { Member } from "@/types";

interface FeedbackListProps {
    items: (FeedbackItemProps["data"] & { id: string })[];
    members: Member[];
    currentUserId: string;
    onToggleComplete: (id: string, currentStatus: boolean) => void;
    onDelete: (id: string) => void;
    onEdit: (id: string, data: FeedbackData) => void;
    onVote: (id: string, type: "like" | "dislike") => void;
}

export function FeedbackList({ items, members, currentUserId, onToggleComplete, onDelete, onEdit, onVote }: FeedbackListProps) {
    const [isCompletedOpen, setIsCompletedOpen] = useState(false);
    const [sortOption, setSortOption] = useState<"newest" | "likes">("newest");

    // Filter items
    const openItems = items.filter(i => !i.completed);
    const completedItems = items.filter(i => i.completed);

    // Sort Logic
    const sortFn = (a: any, b: any) => {
        if (sortOption === "likes") {
            const scoreA = (a.likes || 0) - (a.dislikes || 0);
            const scoreB = (b.likes || 0) - (b.dislikes || 0);
            if (scoreB !== scoreA) return scoreB - scoreA;
        }
        // Default / Secondary sort: Newest first
        return (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0);
    };

    openItems.sort(sortFn);
    completedItems.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)); // Keep completed sorted by date usually

    if (items.length === 0) {
        return (
            <div className="mt-8 text-center p-8 bg-secondary/20 rounded-xl border border-dashed border-secondary text-muted-foreground animate-in fade-in zoom-in duration-500">
                <p className="font-medium">Noch keine Einträge in dieser Kategorie.</p>
                <p className="text-sm opacity-70">Sei der Erste!</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 mt-8">
            {/* Header with Sort & Count */}
            {openItems.length > 0 && (
                <div className="flex items-center justify-between pl-1 pr-1">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                        Offen ({openItems.length})
                    </h3>

                    <div className="flex items-center gap-2">
                        <select
                            value={sortOption}
                            onChange={(e) => setSortOption(e.target.value as "newest" | "likes")}
                            className="bg-background text-xs font-medium border rounded-lg p-1.5 focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer"
                        >
                            <option value="newest">Neueste zuerst</option>
                            <option value="likes">Meiste Likes</option>
                        </select>
                    </div>
                </div>
            )}

            {/* Open Items List */}
            {openItems.length > 0 && (
                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {openItems.map(item => (
                        <FeedbackItem
                            key={item.id || Math.random().toString()}
                            id={item.id!}
                            data={item}
                            members={members}
                            currentUserId={currentUserId}
                            onToggleComplete={onToggleComplete}
                            onDelete={onDelete}
                            onEdit={onEdit}
                            onVote={onVote}
                        />
                    ))}
                </div>
            )}

            {/* Completed Items */}
            {completedItems.length > 0 && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-700 delay-100">
                    <button
                        onClick={() => setIsCompletedOpen(!isCompletedOpen)}
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors w-full p-2 hover:bg-secondary/30 rounded-lg group"
                    >
                        {isCompletedOpen ? (
                            <ChevronDown className="h-4 w-4" />
                        ) : (
                            <ChevronRight className="h-4 w-4" />
                        )}
                        <span className="font-medium text-sm">
                            {completedItems.length} erledigte Einträge
                        </span>
                        <div className="ml-auto h-[1px] flex-1 bg-border group-hover:bg-primary/20 transition-colors ml-4" />
                    </button>

                    <div className={cn(
                        "space-y-3 mt-3 pl-2 border-l-2 border-muted overflow-hidden transition-all duration-300 ease-in-out",
                        isCompletedOpen ? "opacity-100 max-h-[2000px]" : "opacity-0 max-h-0"
                    )}>
                        {completedItems.map(item => (
                            <FeedbackItem
                                key={item.id!}
                                id={item.id!}
                                data={item}
                                members={members}
                                currentUserId={currentUserId}
                                onToggleComplete={onToggleComplete}
                                onDelete={onDelete}
                                onEdit={onEdit}
                                onVote={onVote}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
