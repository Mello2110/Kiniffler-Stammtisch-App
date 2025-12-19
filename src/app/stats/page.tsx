"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, query, onSnapshot, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useFirestoreQuery } from "@/hooks/useFirestoreQuery";
import type { Member, PointEntry } from "@/types";
import { PointsLeaderboard } from "@/components/stats/PointsLeaderboard";
import { PointsMatrix } from "@/components/stats/PointsMatrix";
import { Trophy, BarChart3 } from "lucide-react";

export default function StatsPage() {
    const [isLoadingMembers, setIsLoadingMembers] = useState(true);
    const currentYear = new Date().getFullYear();

    // Fetch members
    const qMembers = useMemo(() => query(collection(db, "members"), orderBy("name", "asc")), []);
    const { data: members, loading: membersLoading } = useFirestoreQuery<Member>(qMembers);

    // Fetch points
    const qPoints = useMemo(() => query(collection(db, "points"), where("year", "==", currentYear)), [currentYear]);
    const { data: points } = useFirestoreQuery<PointEntry>(qPoints);

    useEffect(() => {
        if (!membersLoading) {
            setIsLoadingMembers(false);
        }
    }, [membersLoading]);

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            {/* Header Section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 via-background to-background border p-8 md:p-12">
                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-4 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-wider uppercase">
                            <Trophy className="h-3 w-3" />
                            Leaderboard
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight outfit">
                            Season <span className="text-primary italic">Stats</span>
                        </h1>
                        <p className="text-muted-foreground text-lg leading-relaxed">
                            Die nackten Zahlen. Wer führt, wer zahlt, wer trinkt?
                            Hier gibt es keine Ausreden, nur Fakten.
                        </p>
                    </div>

                    <div className="flex items-center gap-4 text-muted-foreground">
                        <div className="flex flex-col items-end">
                            <span className="text-2xl font-black text-foreground outfit">{currentYear}</span>
                            <span className="text-xs uppercase font-bold tracking-widest">Season</span>
                        </div>
                        <div className="h-10 w-px bg-border" />
                        <BarChart3 className="h-8 w-8 opacity-20" />
                    </div>
                </div>

                <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
            </div>

            {/* Leaderboard */}
            {isLoadingMembers ? (
                <div className="p-8 text-center text-muted-foreground">Lade Bestenliste...</div>
            ) : (
                <PointsLeaderboard points={points} members={members} />
            )}

            {/* Matrix Table */}
            <section>
                <h2 className="text-xl font-semibold mb-4">Points Matrix ({currentYear})</h2>
                {isLoadingMembers ? (
                    <div className="p-8 text-center text-muted-foreground">Lade Matrix...</div>
                ) : (
                    <PointsMatrix members={members} points={points} currentYear={currentYear} />
                )}
            </section>
        </div>
    );
}
