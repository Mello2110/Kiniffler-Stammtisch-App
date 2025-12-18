"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Crown, Medal, Banknote, Calendar, Coins } from "lucide-react";
import type { Member, Donation, Penalty, SetEvent } from "@/types";
import { cn } from "@/lib/utils";

interface RankedMember {
    id: string;
    name: string;
    value: number;
    avatarUrl?: string;
}

export default function HallOfFamePage() {
    const [topDonors, setTopDonors] = useState<RankedMember[]>([]);
    const [topPenaltyPayers, setTopPenaltyPayers] = useState<RankedMember[]>([]);
    const [topHosts, setTopHosts] = useState<RankedMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                // 1. Members
                const memSnap = await getDocs(collection(db, "members"));
                const members = memSnap.docs.map(d => ({ id: d.id, ...d.data() } as Member));
                const memberMap = new Map(members.map(m => [m.id, m]));

                // 2. Donations
                const donSnap = await getDocs(collection(db, "donations"));
                const donations = donSnap.docs.map(d => d.data() as Donation);

                // 3. Penalties
                const penSnap = await getDocs(collection(db, "penalties"));
                const penalties = penSnap.docs.map(d => d.data() as Penalty);

                // 4. Events
                const evSnap = await getDocs(collection(db, "set_events"));
                const events = evSnap.docs.map(d => d.data() as SetEvent);

                // --- PROCESS RANKINGS ---

                // A. Top Donors
                const donorStats: Record<string, number> = {};
                donations.forEach(d => {
                    donorStats[d.userId] = (donorStats[d.userId] || 0) + d.amount;
                });
                const sortedDonors = Object.entries(donorStats)
                    .map(([uid, val]) => ({ id: uid, name: memberMap.get(uid)?.name || "Unknown", value: val }))
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 3);
                setTopDonors(sortedDonors);

                // B. Top Penalty Payers
                const penaltyStats: Record<string, number> = {};
                penalties.filter(p => p.isPaid).forEach(p => {
                    penaltyStats[p.userId] = (penaltyStats[p.userId] || 0) + p.amount;
                });
                const sortedPayers = Object.entries(penaltyStats)
                    .map(([uid, val]) => ({ id: uid, name: memberMap.get(uid)?.name || "Unknown", value: val }))
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 3);
                setTopPenaltyPayers(sortedPayers);

                // C. Top Hosts
                const hostStats: Record<string, number> = {};
                events.forEach(e => {
                    if (e.hostId && e.hostId !== "neutral") {
                        hostStats[e.hostId] = (hostStats[e.hostId] || 0) + 1;
                    }
                });
                const sortedHosts = Object.entries(hostStats)
                    .map(([uid, val]) => ({ id: uid, name: memberMap.get(uid)?.name || "Unknown", value: val }))
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 3);
                setTopHosts(sortedHosts);

            } catch (err) {
                console.error("Error fetching HoF data", err);
            } finally {
                setIsLoading(false);
            }
        };

        const unsubDonations = onSnapshot(collection(db, "donations"), () => fetchAll());
        const unsubPenalties = onSnapshot(collection(db, "penalties"), () => fetchAll());
        const unsubEvents = onSnapshot(collection(db, "set_events"), () => fetchAll());

        return () => {
            unsubDonations();
            unsubPenalties();
            unsubEvents();
        };
    }, []);

    const RankCard = ({ title, icon: Icon, data, unit, colorHex, accentColor }: any) => (
        <div className="bg-card border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow relative">
            {/* Header Background */}
            <div
                className="h-24 relative flex items-center px-6"
                style={{ backgroundColor: `${colorHex}15` }} // 15 = low opacity
            >
                <div className="absolute top-4 right-4 opacity-10">
                    <Icon className="w-16 h-16" style={{ color: colorHex }} />
                </div>
                <div className="relative z-10 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-background/80 backdrop-blur-sm shadow-sm">
                        <Icon className="w-6 h-6" style={{ color: colorHex }} />
                    </div>
                    <h2 className="text-xl font-bold font-heading">{title}</h2>
                </div>
            </div>

            <div className="p-6 space-y-4">
                {data.length > 0 ? (
                    data.map((item: RankedMember, index: number) => {
                        let rankIcon = <span className="font-bold text-muted-foreground w-6 text-center text-sm">#{index + 1}</span>;
                        let rowBg = "hover:bg-muted/50";

                        // Premium styling for rank 1
                        if (index === 0) {
                            rankIcon = <Crown className="w-5 h-5 fill-[#D4A017] text-[#D4A017]" />;
                            rowBg = "bg-gradient-to-r from-[#D4A017]/10 to-transparent border-[#D4A017]/20";
                        }
                        if (index === 1) rankIcon = <Medal className="w-5 h-5 text-gray-400" />;
                        if (index === 2) rankIcon = <Medal className="w-5 h-5 text-amber-700" />;

                        return (
                            <div key={item.id} className={cn(
                                "flex items-center gap-4 p-3 rounded-lg border transition-all",
                                rowBg
                            )}>
                                <div className="flex-shrink-0 flex items-center justify-center w-8">
                                    {rankIcon}
                                </div>
                                <div className="flex-grow font-medium text-sm sm:text-base">
                                    {item.name}
                                </div>
                                <div className="font-bold font-mono">
                                    {item.value} <span className="text-xs font-normal text-muted-foreground">{unit}</span>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="py-8 text-center text-muted-foreground text-sm italic border border-dashed rounded-lg">
                        No records yet
                    </div>
                )}
            </div>
        </div>
    );

    if (isLoading) return <div className="p-10 text-center animate-pulse text-muted-foreground">Loading Hall of Fame...</div>;

    return (
        <div className="space-y-8 pb-10">
            <div>
                <h1 className="text-3xl font-bold font-heading tracking-tight" style={{ color: '#1A5C2E' }}>
                    Hall of Fame
                </h1>
                <p className="text-muted-foreground mt-2">
                    Honoring the top contributors, payers, and hosts of our community.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <RankCard
                    title="Top Donors"
                    icon={Coins} // Changed from Heart to Money-related
                    data={topDonors}
                    unit="€"
                    colorHex="#D4A017" // Gold
                />
                <RankCard
                    title="Top Penalty Payers"
                    icon={Banknote}
                    data={topPenaltyPayers}
                    unit="€"
                    colorHex="#C62828" // Red-ish for penalties, or stick to Fiege Green? Let's use Red for penalties distinction
                />
                <RankCard
                    title="Best Hosts"
                    icon={Calendar}
                    data={topHosts}
                    unit="x"
                    colorHex="#1A5C2E" // Fiege Green
                />
            </div>
        </div>
    );
}
