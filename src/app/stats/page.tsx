"use client";

import { useState, useEffect, useMemo } from "react";
import { query, where } from "firebase/firestore";
import { useFirestoreQuery } from "@/hooks/useFirestoreQuery";
import { useClub } from "@/contexts/ClubContext";
import { PointsLeaderboard } from "@/components/stats/PointsLeaderboard";
import { PointsMatrix } from "@/components/stats/PointsMatrix";
import { matchesDiscipline } from "@/lib/seasonPoints";
import { Loader2, Trophy, BarChart3, Award, Dices, Flame, CircleDot, Layers } from "lucide-react";
import type { GameDisciplineId, Member, PointEntry } from "@/types";
import { EditableHeader } from "@/components/common/EditableHeader";
import { cn } from "@/lib/utils";
import StatistikenPage from "@/app/statistiken/page";
import HallOfFamePage from "@/app/hall-of-fame/page";

type StatsHubTab = "season" | "analytics" | "hall-of-fame";
type DisciplineFilter = GameDisciplineId | "all";

const DISCIPLINE_META: Record<DisciplineFilter, { label: string; icon: React.ReactNode }> = {
    kniffel: { label: "Kniffeln", icon: <Dices className="h-3.5 w-3.5" /> },
    schocken: { label: "Schocken", icon: <Flame className="h-3.5 w-3.5" /> },
    kegeln: { label: "Kegeln", icon: <CircleDot className="h-3.5 w-3.5" /> },
    all: { label: "Gesamt", icon: <Layers className="h-3.5 w-3.5" /> },
};

export default function StatsPage() {
    const { clubId, club, clubCollection } = useClub();
    const currentYear = new Date().getFullYear();

    const [activeTab, setActiveTab] = useState<StatsHubTab>("season");

    useEffect(() => {
        if (typeof window !== "undefined") {
            const tab = new URLSearchParams(window.location.search).get("tab");
            if (tab === "hall-of-fame" || tab === "analytics" || tab === "season") {
                setActiveTab(tab);
            }
        }
    }, []);
    const [selectedDiscipline, setSelectedDiscipline] = useState<DisciplineFilter>(
        club?.defaultGame || "kniffel"
    );

    useEffect(() => {
        if (club?.defaultGame) {
            setSelectedDiscipline(club.defaultGame);
        }
    }, [club?.defaultGame]);

    const qMembers = useMemo(
        () => (clubId ? query(clubCollection("members")) : null),
        [clubId, clubCollection]
    );
    const { data: members, loading: membersLoading } = useFirestoreQuery<Member>(qMembers);

    const qPoints = useMemo(
        () => (clubId ? query(clubCollection("points"), where("year", "==", currentYear)) : null),
        [clubId, clubCollection, currentYear]
    );
    const { data: points, loading: pointsLoading } = useFirestoreQuery<PointEntry>(qPoints);

    const enabledDisciplines: DisciplineFilter[] = useMemo(() => {
        const enabled = club?.enabledGames && club.enabledGames.length > 0
            ? club.enabledGames
            : (["kniffel", "schocken", "kegeln"] as GameDisciplineId[]);
        return [...enabled, "all"];
    }, [club?.enabledGames]);

    const filteredPoints = useMemo(() => {
        if (selectedDiscipline === "all") return points;
        return points.filter((p) => matchesDiscipline(p, selectedDiscipline));
    }, [points, selectedDiscipline]);

    const isLoading = membersLoading || pointsLoading;

    const hubTabs: { id: StatsHubTab; label: string; icon: React.ReactNode }[] = [
        { id: "season", label: "Saison-Wertung", icon: <Trophy className="h-4 w-4" /> },
        { id: "analytics", label: "Detail-Analyse", icon: <BarChart3 className="h-4 w-4" /> },
        { id: "hall-of-fame", label: "Hall of Fame", icon: <Award className="h-4 w-4" /> },
    ];

    return (
        <div className="space-y-6 pb-10 max-w-full overflow-x-hidden">
            {/* Einheitlicher Hero Banner mit integriertem Hub-Switcher */}
            <div className="relative overflow-hidden rounded-3xl kanpai-hero-banner border border-white/10 p-6 sm:p-8 md:p-10">
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                    <div className="space-y-3 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-bold tracking-wider uppercase border border-primary/25">
                            <Trophy className="h-3 w-3" />
                            Saison &amp; Statistik
                        </div>
                        <EditableHeader
                            pageId="stats"
                            headerId="stats-title"
                            defaultText={`Saison & Statistik ${currentYear}`}
                            as="h1"
                            className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight outfit text-[#F5F0EB]"
                        />
                        <p className="text-sm sm:text-base text-muted-foreground">
                            Rangliste, Detail-Analysen und Hall of Fame auf einen Blick.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 p-1.5 rounded-2xl bg-black/30 border border-white/10 backdrop-blur-md w-full lg:w-auto shrink-0">
                        {hubTabs.map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
                                    activeTab === tab.id
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                                )}
                            >
                                {tab.icon}
                                <span className="truncate">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {activeTab === "season" && (
                <div className="space-y-6">
                    {/* Discipline Switcher */}
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-card/50 border border-white/10">
                        <div className="text-xs font-semibold text-muted-foreground">
                            Disziplin-Filter (getrennte Saison-Wertungen):
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {enabledDisciplines.map((disc) => (
                                <button
                                    key={disc}
                                    type="button"
                                    onClick={() => setSelectedDiscipline(disc)}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                                        selectedDiscipline === disc
                                            ? "bg-primary/20 text-primary border-primary/40"
                                            : "bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10"
                                    )}
                                >
                                    {DISCIPLINE_META[disc].icon}
                                    <span>{DISCIPLINE_META[disc].label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex h-[40vh] items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <>
                            <section>
                                <PointsLeaderboard members={members} points={filteredPoints} />
                            </section>

                            <section className="space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                    <h2 className="text-xl font-semibold">
                                        Monats-Matrix ({DISCIPLINE_META[selectedDiscipline].label})
                                    </h2>
                                    <span className="text-xs text-muted-foreground">
                                        {selectedDiscipline === "all"
                                            ? "Summierte Ansicht über alle Disziplinen"
                                            : "Tippe auf eine Zelle zum manuellen Bearbeiten"}
                                    </span>
                                </div>
                                <PointsMatrix
                                    members={members}
                                    points={filteredPoints}
                                    currentYear={currentYear}
                                    gameType={selectedDiscipline}
                                />
                            </section>
                        </>
                    )}
                </div>
            )}

            {activeTab === "analytics" && (
                <div className="max-w-full overflow-x-hidden">
                    <StatistikenPage />
                </div>
            )}

            {activeTab === "hall-of-fame" && (
                <div className="max-w-full overflow-x-hidden">
                    <HallOfFamePage />
                </div>
            )}
        </div>
    );
}
