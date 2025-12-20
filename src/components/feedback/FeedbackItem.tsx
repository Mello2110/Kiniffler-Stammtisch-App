"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { Check, Trash2, Pencil, Smartphone, Monitor, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Member } from "@/types";
import { FeedbackData, Category, Platform } from "@/components/feedback/FeedbackForm";

export interface FeedbackItemProps {
    id: string;
    data: FeedbackData & {
        completed: boolean;
        userId: string;
        createdAt?: any;
    };
    members: Member[];
    currentUserId: string;
    onToggleComplete: (id: string, currentStatus: boolean) => void;
    onDelete: (id: string) => void;
    onEdit: (id: string, data: FeedbackData) => void;
}

export function FeedbackItem({
    id,
    data,
    members,
    currentUserId,
    onToggleComplete,
    onDelete,
    onEdit
}: FeedbackItemProps) {

    const member = useMemo(() => members.find(m => m.id === data.userId), [members, data.userId]);
    const isOwner = currentUserId === data.userId; // Or isAdmin check if we had it here

    const categoryColors: Record<string, string> = {
        design: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
        function: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
        other: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
        "Plattform/App": "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
        "Veranstaltungen": "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
        "Termine": "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
        "Ausflüge": "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
        "Sonstiges": "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20"
    };

    const platformIcons: Record<Platform, any> = {
        mobile: Smartphone,
        web: Monitor,
        both: Smartphone // Fallback, though we render custom for both
    };

    // Safe access to platform icon
    const PlatformIcon = data.platform ? platformIcons[data.platform] : null;

    return (
        <div className={cn(
            "group relative flex flex-col sm:flex-row gap-4 p-4 rounded-xl border transition-all duration-300",
            data.completed
                ? "bg-secondary/30 border-transparent opacity-70 hover:opacity-100"
                : "bg-card border-border shadow-sm hover:shadow-md hover:border-primary/20"
        )}>
            {/* User Icon Column */}
            <div className="flex sm:flex-col items-center gap-2 sm:w-16 shrink-0">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full overflow-hidden border-2 border-background shadow-sm bg-muted flex items-center justify-center">
                    {member?.avatarUrl ? (
                        <img src={member.avatarUrl} alt={member.name} className="h-full w-full object-cover" />
                    ) : (
                        <div className="h-full w-full bg-primary/10 flex items-center justify-center">
                            <span className="font-bold text-primary text-xs sm:text-sm">
                                {member?.name?.substring(0, 2).toUpperCase() || "??"}
                            </span>
                        </div>
                    )}
                </div>
                {member && (
                    <span className="text-[10px] sm:text-xs font-medium text-muted-foreground text-center line-clamp-1 w-full">
                        {member.name.split(" ")[0]}
                    </span>
                )}
            </div>

            {/* Content Column */}
            <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-start justify-between gap-2">
                    <h3 className={cn(
                        "font-bold text-base sm:text-lg leading-tight",
                        data.completed && "line-through text-muted-foreground"
                    )}>
                        {data.heading}
                    </h3>

                    {/* Badges */}
                    <div className="flex items-center gap-2 shrink-0">
                        <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-semibold border uppercase tracking-wider",
                            categoryColors[data.category] || categoryColors.other
                        )}>
                            {data.category}
                        </span>
                        {data.platform && (
                            <div className="flex gap-1">
                                {(data.platform === "mobile" || data.platform === "both") && (
                                    <div className="p-1 rounded-md bg-secondary text-muted-foreground" title="Mobile">
                                        <Smartphone className="h-3 w-3" />
                                    </div>
                                )}
                                {(data.platform === "web" || data.platform === "both") && (
                                    <div className="p-1 rounded-md bg-secondary text-muted-foreground" title="Web">
                                        <Monitor className="h-3 w-3" />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <p className={cn(
                    "text-sm text-muted-foreground line-clamp-2",
                    data.completed && "italic"
                )}>
                    {data.description}
                </p>

                {/* Footer / Meta */}
                <div className="flex items-center justify-between pt-2">
                    <div className="text-xs text-muted-foreground">
                        {data.createdAt?.toDate ? format(data.createdAt.toDate(), "dd. MMM") : "Just now"}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 transition-opacity">
                        {!data.completed && (
                            <button
                                onClick={() => onEdit(id, data)}
                                className="p-2 hover:bg-muted text-muted-foreground hover:text-primary rounded-full transition-colors"
                                title="Edit"
                            >
                                <Pencil className="h-4 w-4" />
                            </button>
                        )}

                        {(isOwner || true) && ( // Allow delete for all (or restrict to admin later)
                            <button
                                onClick={() => onDelete(id)}
                                className="p-2 hover:bg-red-500/10 text-muted-foreground hover:text-red-500 rounded-full transition-colors"
                                title="Delete"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        )}

                        <button
                            onClick={() => onToggleComplete(id, data.completed)}
                            className={cn(
                                "ml-2 p-2 rounded-full transition-colors border",
                                data.completed
                                    ? "bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20"
                                    : "bg-background hover:bg-green-500/10 text-muted-foreground hover:text-green-600 border-border"
                            )}
                            title={data.completed ? "Mark as Incomplete" : "Mark as Done"}
                        >
                            <Check className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
