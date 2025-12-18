"use client";

import { useMemo } from "react";
import { Trophy, Medal, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PointEntry, Member } from "@/types";

interface PointsLeaderboardProps {
    points: PointEntry[];
    members: Member[];
}

export function PointsLeaderboard({ points, members }: PointsLeaderboardProps) {
    const leaderData = useMemo(() => {
        const stats: Record<string, number> = {};

        // Sum points per user
        // If points are stored per month, we aggregate them
        // Or if we use the Member object's 'points' field directly?
        // Let's aggregate from the 'points_entries' collection for source-of-truth
        points.forEach(p => {
            stats[p.userId] = (stats[p.userId] || 0) + p.points;
        });

        // Convert to array
        const sorted = Object.entries(stats)
            .map(([userId, totalPoints]) => {
                const member = members.find(m => m.id === userId);
                if (!member) return null;
                return {
                    userId,
                    name: member.name,
                    totalPoints
                };
            })
            .filter(item => item !== null)
            .sort((a, b) => b.totalPoints - a.totalPoints);

        if (sorted.length === 0) return [];

        // Handle Ties: Find max score
        const maxScore = sorted[0].totalPoints;
        // Return all members with maxScore
        return sorted.filter(s => s.totalPoints === maxScore);

    }, [points, members]);

    return (
        <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Season Leaders
            </h2>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {leaderData.length > 0 ? (
                    leaderData.map((data) => (
                        <div key={data.userId} className="relative flex items-center gap-4 p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/5 shadow-sm">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30">
                                <Trophy className="h-6 w-6" />
                            </div>
                            <div>
                                <div className="text-sm font-medium text-yellow-700 dark:text-yellow-300 uppercase tracking-wide text-[10px] mb-0.5">
                                    Current Leader
                                </div>
                                <div className="font-bold text-lg leading-none">{data.name}</div>
                                <div className="text-sm text-muted-foreground mt-1">
                                    <span className="font-bold text-foreground">{data.totalPoints}</span> Points
                                </div>
                            </div>
                            {leaderData.length > 1 && (
                                <div className="absolute top-2 right-2 text-[10px] font-bold bg-yellow-500/20 px-2 py-0.5 rounded-full text-yellow-700 dark:text-yellow-300">
                                    TIE
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="col-span-full p-6 border border-dashed rounded-xl text-center text-muted-foreground">
                        No points awarded this season yet.
                    </div>
                )}
            </div>
        </div>
    );
}
