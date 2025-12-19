"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, query, onSnapshot, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useFirestoreQuery } from "@/hooks/useFirestoreQuery";
import type { Member, PointEntry } from "@/types";
import { PointsLeaderboard } from "@/components/stats/PointsLeaderboard";
import { PointsMatrix } from "@/components/stats/PointsMatrix";

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
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Season Stats</h1>
                <p className="text-muted-foreground">Points, Rankings, and Season Progress.</p>
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
