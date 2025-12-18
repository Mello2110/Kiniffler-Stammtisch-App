"use client";

import { useMemo } from "react";
import { Trophy, Medal, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Penalty, Member } from "@/types";

interface LeaderboardProps {
    penalties: Penalty[];
    members: Member[]; // Needed to map userId to name/avatar
}

export function Leaderboard({ penalties, members }: LeaderboardProps) {
    const leaderData = useMemo(() => {
        const stats: Record<string, number> = {};

        // Sum penalties per user
        penalties.forEach(p => {
            stats[p.userId] = (stats[p.userId] || 0) + p.amount;
        });

        // Convert to array and sort desc
        return Object.entries(stats)
            .map(([userId, totalAmount]) => {
                const member = members.find(m => m.id === userId);
                return {
                    userId,
                    name: member?.name || "Unknown",
                    avatarUrl: member?.avatarUrl,
                    totalAmount
                };
            })
            .sort((a, b) => b.totalAmount - a.totalAmount)
            .slice(0, 3); // Top 3
    }, [penalties, members]);

    return (
        <div className="grid gap-4 md:grid-cols-3">
            {leaderData.map((data, index) => {
                let rankColor = "bg-muted text-muted-foreground";
                let RankIcon = Medal;

                if (index === 0) {
                    rankColor = "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20";
                    RankIcon = Trophy;
                } else if (index === 1) {
                    rankColor = "bg-gray-400/10 text-gray-400 border-gray-400/20";
                } else if (index === 2) {
                    rankColor = "bg-orange-700/10 text-orange-700 dark:text-orange-500 border-orange-700/20";
                }

                return (
                    <div key={data.userId} className={cn("relative flex flex-col items-center p-6 rounded-xl border bg-card shadow-sm transition-all hover:scale-[1.02]", index === 0 && "border-yellow-500/30 shadow-yellow-500/5")}>
                        {index === 0 && (
                            <div className="absolute -top-3">
                                <div className="flex items-center gap-1 rounded-full bg-yellow-500 px-3 py-1 text-xs font-bold text-black shadow-lg">
                                    <Trophy className="h-3 w-3" />
                                    #1 PENALTY KING
                                </div>
                            </div>
                        )}

                        <div className={cn("mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2", rankColor)}>
                            {/* Placeholder Avatar if no URL */}
                            <span className="text-2xl font-bold">{data.name.substring(0, 2).toUpperCase()}</span>
                        </div>

                        <div className="text-center">
                            <div className="text-lg font-bold">{data.name}</div>
                            <div className="text-sm text-muted-foreground">Total Penalties</div>
                        </div>

                        <div className="mt-4 flex items-center gap-1 text-2xl font-extrabold text-primary">
                            <DollarSign className="h-5 w-5" />
                            {data.totalAmount.toFixed(2)}
                        </div>
                    </div>
                );
            })}

            {leaderData.length === 0 && (
                <div className="col-span-3 flex h-[200px] items-center justify-center rounded-xl border border-dashed text-muted-foreground">
                    <p>No penalties recorded yet. Everyone is behaving! 😇</p>
                </div>
            )}
        </div>
    );
}
