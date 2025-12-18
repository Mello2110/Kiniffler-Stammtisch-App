"use client";

import { useState, useEffect } from "react";
import { collection, query, onSnapshot, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Member, PointEntry } from "@/types";
import { PointsLeaderboard } from "@/components/stats/PointsLeaderboard";
import { PointsMatrix } from "@/components/stats/PointsMatrix";

export default function StatsPage() {
    const [members, setMembers] = useState<Member[]>([]);
    const [points, setPoints] = useState<PointEntry[]>([]);
    const [isLoadingMembers, setIsLoadingMembers] = useState(true);
    const currentYear = new Date().getFullYear();

    useEffect(() => {
        // Fetch members
        const qMembers = query(collection(db, "members"), orderBy("name", "asc"));
        const unsubMembers = onSnapshot(qMembers, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Member));
            setMembers(data);
            setIsLoadingMembers(false);
        });

        // Fetch points
        const qPoints = query(collection(db, "points"), where("year", "==", currentYear));
        const unsubPoints = onSnapshot(qPoints, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PointEntry));
            setPoints(data);
        });

        return () => {
            unsubMembers();
            unsubPoints();
        };
    }, [currentYear]);

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
