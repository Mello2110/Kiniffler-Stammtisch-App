"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, CheckCircle2 } from "lucide-react";
import { FeedbackItem, FeedbackItemProps } from "./FeedbackItem";
import { cn } from "@/lib/utils";
import { FeedbackData } from "./FeedbackForm";
import { Member } from "@/types";

interface FeedbackListProps {
    items: FeedbackItemProps["data"][];
    members: Member[];
    currentUserId: string;
    onToggleComplete: (id: string, currentStatus: boolean) => void;
    onDelete: (id: string) => void;
    onEdit: (id: string, data: FeedbackData) => void;
}

export function FeedbackList({ items, members, currentUserId, onToggleComplete, onDelete, onEdit }: FeedbackListProps) {
    const [isCompletedOpen, setIsCompletedOpen] = useState(false);

    // Filter items
    const openItems = items.filter(i => !i.completed);
    const completedItems = items.filter(i => i.completed);

    // Sort by createdAt desc
    openItems.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    completedItems.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));

    if (items.length === 0) return null;

    return (
        <div className="space-y-6 mt-8">
            {/* Open Items */}
            {openItems.length > 0 && (
                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider pl-1">
                        Offen ({openItems.length})
                    </h3>
                    {openItems.map(item => (
                        <FeedbackItem
                            key={item.id || Math.random().toString()} // Fallback if id missing momentarily
                            id={item.id!}
                            data={item}
                            members={members}
                            currentUserId={currentUserId}
                            onToggleComplete={onToggleComplete}
                            onDelete={onDelete}
                            onEdit={onEdit}
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
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
