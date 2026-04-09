"use client";

import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Crown, Medal, Banknote, Calendar, Coins, Sparkles, Dice5, Zap, Gamepad2 } from "lucide-react";
import type { Member, Donation, Penalty, SetEvent, KniffelSheet, PointEntry } from "@/types";
import { cn } from "@/lib/utils";
import { EditableHeader } from "@/components/common/EditableHeader";

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
    const [topParticipations, setTopParticipations] = useState<RankedMember[]>([]);
    const [topScores, setTopScores] = useState<RankedMember[]>([]);
    const [topKniffels, setTopKniffels] = useState<RankedMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                // Parallel Fetching for maximum speed
                const [memSnap, donSnap, penSnap, evSnap, sheetSnap, pointSnap] = await Promise.all([
                    getDocs(collection(db, "members")),
                    getDocs(collection(db, "donations")),
                    getDocs(collection(db, "penalties")),
                    getDocs(collection(db, "set_events")),
                    getDocs(collection(db, "kniffelSheets")),
                    getDocs(collection(db, "points"))
                ]);

                const members = memSnap.docs.map(d => ({ id: d.id, ...d.data() } as Member));
                const memberMap = new Map(members.map(m => [m.id, m]));

                const donations = donSnap.docs.map(d => ({ id: d.id, ...d.data() } as Donation));
                const penalties = penSnap.docs.map(d => ({ id: d.id, ...d.data() } as Penalty));
                const events = evSnap.docs.map(d => ({ id: d.id, ...d.data() } as SetEvent));
                const sheets = sheetSnap.docs.map(d => ({ id: d.id, ...d.data() } as KniffelSheet));
                const points = pointSnap.docs.map(d => ({ id: d.id, ...d.data() } as PointEntry));

                // Identify ALL submitted sheet IDs (for backfill logic)
                const submittedSheetIds = new Set<string>();
                points.forEach(p => {
                    if (p.sheetContributions) {
                        Object.keys(p.sheetContributions).forEach(id => submittedSheetIds.add(id));
                    }
                });

                // Filter for "Ranked" games
                // Logic: 
                // 1. Explicitly marked as isSubmitted
                // 2. Or is in the points matrix (submittedSheetIds)
                // 3. Or (Special Backfill) has NO isSubmitted field yet (meaning it's an old game)
                const rankedSheets = sheets.filter(s => 
                    s.isSubmitted === true || 
                    submittedSheetIds.has(s.id) || 
                    s.isSubmitted === undefined
                );

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

                // D. Top Participations (Most Ranked Games)
                const participationStats: Record<string, number> = {};
                rankedSheets.forEach(s => {
                    if (s.memberSnapshot) {
                        s.memberSnapshot.forEach(uid => {
                            participationStats[uid] = (participationStats[uid] || 0) + 1;
                        });
                    }
                });
                const sortedParticipations = Object.entries(participationStats)
                    .map(([uid, val]) => ({ id: uid, name: memberMap.get(uid)?.name || "Unknown", value: val }))
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 3);
                setTopParticipations(sortedParticipations);

                // E. Top Scores (Highest Single Game Score)
                // Helper functions mirroring KniffelScorecard calculation
                const UPPER_FIELDS = ["ones", "twos", "threes", "fours", "fives", "sixes"];
                const getNumericVal = (v: any): number => (typeof v === 'number' ? v : 0);
                const calcTotal = (scoreObj: any): number => {
                    const upperSum = UPPER_FIELDS.reduce((s, f) => s + getNumericVal(scoreObj[f]), 0);
                    const bonus = upperSum >= 63 ? 35 : 0;
                    const lowerSum = Object.entries(scoreObj)
                        .filter(([k]) => !UPPER_FIELDS.includes(k))
                        .reduce((s, [, v]) => s + getNumericVal(v), 0);
                    return upperSum + bonus + lowerSum;
                };

                const scoreStats: Record<string, number> = {};
                rankedSheets.forEach(s => {
                    if (s.scores) {
                        Object.entries(s.scores).forEach(([uid, scoreObj]) => {
                            if (!memberMap.has(uid)) return;
                            const total = calcTotal(scoreObj);
                            if (!scoreStats[uid] || total > scoreStats[uid]) {
                                scoreStats[uid] = total;
                            }
                        });
                    }
                });
                const sortedScores = Object.entries(scoreStats)
                    .map(([uid, val]) => ({ id: uid, name: memberMap.get(uid)?.name || "Unknown", value: val }))
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 3);
                setTopScores(sortedScores);

                // F. Top Kniffels (Most Kniffels rolled)
                const kniffelStats: Record<string, number> = {};
                rankedSheets.forEach(s => {
                    if (s.scores) {
                        Object.entries(s.scores).forEach(([uid, scoreObj]) => {
                            if (!memberMap.has(uid)) return;
                            const kniffelValue = scoreObj.kniffel;
                            if (typeof kniffelValue === 'number' && kniffelValue > 0) {
                                kniffelStats[uid] = (kniffelStats[uid] || 0) + 1;
                            }
                        });
                    }
                });
                const sortedKniffels = Object.entries(kniffelStats)
                    .map(([uid, val]) => ({ id: uid, name: memberMap.get(uid)?.name || "Unknown", value: val }))
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 3);
                setTopKniffels(sortedKniffels);

            } catch (err) {
                console.error("Error fetching HoF data", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAll();
    }, []);

    const RankCard = ({ title, icon: Icon, data, unit, colorHex, headerId }: any) => (
        <div className="relative group overflow-hidden bg-card border rounded-[2.5rem] hover:border-primary/50 transition-all duration-500 shadow-sm hover:shadow-2xl hover:shadow-primary/20 p-8 flex flex-col gap-6">

            {/* Header */}
            <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl flex items-center justify-center bg-muted/50 text-muted-foreground group-hover:scale-110 transition-transform duration-500" style={{ color: colorHex, backgroundColor: `${colorHex}15` }}>
                        <Icon className="h-6 w-6" />
                    </div>
                    <div>
                        <EditableHeader
                            pageId="hall-of-fame"
                            headerId={headerId}
                            defaultText={title}
                            as="h2"
                            className="text-xl font-bold font-heading leading-none"
                        />
                        <p className="text-xs text-muted-foreground font-bold tracking-wider uppercase mt-1">Top 3 Legends</p>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="space-y-3">
                {data.length > 0 ? (
                    data.map((item: RankedMember, index: number) => {
                        let rankColor = "bg-muted text-muted-foreground";
                        let rankContent: React.ReactNode = <span className="font-bold text-xs">#{index + 1}</span>;

                        // Premium colors for ranks
                        if (index === 0) {
                            rankColor = "bg-[#D4A017] text-white shadow-[#D4A017]/50 shadow-lg";
                            rankContent = <Crown className="h-3 w-3 fill-current" />;
                        }
                        if (index === 1) rankColor = "bg-gray-400 text-white";
                        if (index === 2) rankColor = "bg-amber-700 text-white";

                        return (
                            <div key={item.id} className="group/item flex items-center gap-4 p-3 rounded-2xl hover:bg-muted/50 transition-colors">
                                {/* Rank Avatar */}
                                <div className={cn("h-10 w-10 flex-shrink-0 rounded-full flex items-center justify-center shadow-sm transition-transform duration-300 group-hover/item:scale-110", rankColor)}>
                                    {rankContent}
                                </div>

                                <div className="flex-grow min-w-0">
                                    <p className="font-semibold truncate leading-tight select-all">{item.name}</p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <div className="h-1 w-8 rounded-full bg-border overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-1000"
                                                style={{
                                                    width: '100%',
                                                    backgroundColor: colorHex,
                                                    opacity: 1 - (index * 0.25)
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <span className="block font-bold font-mono text-lg leading-none" style={{ color: index === 0 ? colorHex : 'inherit' }}>
                                        {item.value}
                                    </span>
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">{unit}</span>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="py-10 text-center border-2 border-dashed rounded-2xl bg-muted/20">
                        <p className="text-sm text-muted-foreground">Noch keine Daten</p>
                    </div>
                )}
            </div>

            {/* Decorative Background Icon */}
            <div className="absolute -bottom-6 -right-6 opacity-5 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none">
                <Icon className="w-32 h-32" style={{ color: colorHex }} />
            </div>
        </div>
    );

    if (isLoading) return <div className="p-10 text-center animate-pulse text-muted-foreground">Loading Hall of Fame...</div>;

    return (
        <div className="space-y-8 pb-10">
            {/* Header Section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 via-background to-background border p-8 md:p-12">
                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-4 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-wider uppercase">
                            <Sparkles className="h-3 w-3" />
                            Legends
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight outfit">
                            Hall of <span className="text-primary italic">Fame</span>
                        </h1>
                        <p className="text-muted-foreground text-lg leading-relaxed">
                            Ehre, wem Ehre gebührt. Hier feiern wir die wahren Legenden unseres Stammtischs.
                            Die Top-Performer, die großzügigsten Spender und die besten Gastgeber.
                        </p>
                    </div>

                    <div className="flex items-center gap-4 text-muted-foreground">
                        <div className="flex flex-col items-end">
                            <span className="text-2xl font-black text-foreground outfit">6</span>
                            <span className="text-xs uppercase font-bold tracking-widest">Kategorien</span>
                        </div>
                        <div className="h-10 w-px bg-border" />
                        <Crown className="h-8 w-8 opacity-20" />
                    </div>
                </div>

                {/* Decorative background elements */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <RankCard
                    title="Top Donors"
                    headerId="top-donors-title"
                    icon={Coins}
                    data={topDonors}
                    unit="€"
                    colorHex="#D4A017"
                />
                <RankCard
                    title="Top Penalty Payers"
                    headerId="top-penalty-payers-title"
                    icon={Banknote}
                    data={topPenaltyPayers}
                    unit="€"
                    colorHex="#C62828"
                />
                <RankCard
                    title="Best Hosts"
                    headerId="best-hosts-title"
                    icon={Calendar}
                    data={topHosts}
                    unit="x"
                    colorHex="#1A5C2E"
                />
                <RankCard
                    title="Most Active"
                    headerId="most-active-title"
                    icon={Gamepad2}
                    data={topParticipations}
                    unit="Spiele"
                    colorHex="#00BCD4"
                />
                <RankCard
                    title="Highscore"
                    headerId="highscore-title"
                    icon={Zap}
                    data={topScores}
                    unit="Pkt"
                    colorHex="#FF9800"
                />
                <RankCard
                    title="Kniffel Kings"
                    headerId="kniffel-kings-title"
                    icon={Dice5}
                    data={topKniffels}
                    unit="x"
                    colorHex="#9C27B0"
                />
            </div>
        </div>
    );
}
