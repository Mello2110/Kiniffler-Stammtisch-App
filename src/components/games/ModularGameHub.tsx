"use client";

/**
 * PHASE 3 & 4: MODULAR MULTI-DISCIPLINE GAME ARENA
 * ================================================
 * Vereint alle für den aktuellen Verein aktivierten Spiel-Disziplinen
 * (Kniffeln, Schocken, Kegeln) unter einer nahtlosen Oberfläche mit:
 * - Disziplin-Umschalter (basierend auf club.enabledGames)
 * - Jahr- und Monatsnavigation (für 100% chronologische Zuordnung & Reproduzierbarkeit)
 * - Dynamischer Session-Liste & integriertem Scorecard-Runner
 */

import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { query, where, orderBy, addDoc, deleteDoc, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useFirestoreQuery } from "@/hooks/useFirestoreQuery";
import { useLanguage } from "@/contexts/LanguageContext";
import { useClub } from "@/contexts/ClubContext";
import { ALL_GAME_PLUGINS, getGamePlugin } from "@/games/registry";
import type { UniversalGameSession } from "@/games/types";
import type { GameDisciplineId, GuestPlayer, KniffelSheet, Member } from "@/types";
import { KniffelYearNav } from "@/components/kniffel/KniffelYearNav";
import { KniffelSheetList } from "@/components/kniffel/KniffelSheetList";
import { AddSheetModal } from "@/components/kniffel/AddSheetModal";
import { PlayerSelectionModal } from "@/components/kniffel/PlayerSelectionModal";
import { DeleteConfirmationModal } from "@/components/common/DeleteConfirmationModal";
import {
    Dice5,
    Flame,
    Target,
    Plus,
    ChevronDown,
    ChevronRight,
    Trash2,
    Calendar,
    CheckCircle2,
    Maximize2,
    Minimize2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ModularGameHubProps {
    initialDiscipline?: GameDisciplineId;
    initialSessionId?: string;
}

export function ModularGameHub({ initialDiscipline, initialSessionId }: ModularGameHubProps) {
    const { dict } = useLanguage();
    const { clubId, club, clubCollection, clubDoc } = useClub();
    const currentYear = new Date().getFullYear();

    const enabledGames: GameDisciplineId[] = useMemo(() => {
        if (club?.enabledGames && club.enabledGames.length > 0) {
            return club.enabledGames;
        }
        return ["kniffel", "schocken", "kegeln"];
    }, [club?.enabledGames]);

    const [activeDiscipline, setActiveDiscipline] = useState<GameDisciplineId>(
        initialDiscipline || club?.defaultGame || "kniffel"
    );

    useEffect(() => {
        if (initialDiscipline && enabledGames.includes(initialDiscipline)) {
            setActiveDiscipline(initialDiscipline);
        } else if (!enabledGames.includes(activeDiscipline)) {
            setActiveDiscipline(enabledGames[0] || "kniffel");
        }
    }, [initialDiscipline, enabledGames, activeDiscipline]);

    const [selectedYear, setSelectedYear] = useState<number>(currentYear);
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [expandedSessionId, setExpandedSessionId] = useState<string | null>(initialSessionId || null);
    const [fullscreenSessionId, setFullscreenSessionId] = useState<string | null>(null);
    const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);

    useEffect(() => {
        if (typeof document === "undefined") return;
        if (fullscreenSessionId) {
            document.body.style.overflow = "hidden";
            const onKeyDown = (e: KeyboardEvent) => {
                if (e.key === "Escape") setFullscreenSessionId(null);
            };
            window.addEventListener("keydown", onKeyDown);
            return () => {
                document.body.style.overflow = "";
                window.removeEventListener("keydown", onKeyDown);
            };
        } else {
            document.body.style.overflow = "";
        }
    }, [fullscreenSessionId]);

    // 1. Lade alle Club-Mitglieder
    const qMembers = useMemo(
        () => query(clubCollection("members"), orderBy("name", "asc")),
        [clubId, clubCollection]
    );
    const { data: members } = useFirestoreQuery<Member>(qMembers);

    // 2. Lade Kniffel-Bögen für das gewählte Jahr (für Jahres-Counter & Monats-Badges)
    const qKniffelSheets = useMemo(
        () =>
            query(
                clubCollection("kniffelSheets"),
                where("year", "==", selectedYear)
            ),
        [clubId, clubCollection, selectedYear]
    );
    const { data: allYearKniffelSheets, loading: kniffelLoading } = useFirestoreQuery<KniffelSheet>(qKniffelSheets);

    const kniffelSheets = useMemo(
        () => allYearKniffelSheets.filter(s => s.month === selectedMonth),
        [allYearKniffelSheets, selectedMonth]
    );

    // 3. Lade universelle GameSessions für Schocken & Kegeln (gesamtes Jahr)
    const qGameSessions = useMemo(
        () =>
            query(
                clubCollection("gameSessions"),
                where("year", "==", selectedYear)
            ),
        [clubId, clubCollection, selectedYear]
    );
    const { data: allYearSessions, loading: sessionsLoading } = useFirestoreQuery<UniversalGameSession>(qGameSessions);

    const allYearDisciplineSessions = useMemo(
        () => allYearSessions.filter(s => s.gameType === activeDiscipline),
        [allYearSessions, activeDiscipline]
    );

    const disciplineSessions = useMemo(() => {
        return allYearDisciplineSessions
            .filter(s => s.month === selectedMonth)
            .sort((a, b) => {
                const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
                const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
                return tB - tA;
            });
    }, [allYearDisciplineSessions, selectedMonth]);

    const activePlugin = getGamePlugin(activeDiscipline);

    const handleCreateUniversalSession = async (data: { selectedPlayerIds: string[]; guests: GuestPlayer[] }) => {
        const initialPart = activePlugin.createInitialSessionState(data.selectedPlayerIds, data.guests);
        const payload = {
            clubId,
            gameType: activeDiscipline,
            year: selectedYear,
            month: selectedMonth,
            dateIso: new Date().toISOString(),
            isSubmitted: false,
            createdAt: serverTimestamp(),
            ...initialPart,
        };

        try {
            const newRef = await addDoc(clubCollection("gameSessions"), payload);
            setExpandedSessionId(newRef.id);
        } catch (err) {
            console.error("Error creating game session:", err);
        }
    };

    const handleDeleteUniversalSession = async (sessionId: string) => {
        try {
            await deleteDoc(clubDoc("gameSessions", sessionId));
            if (expandedSessionId === sessionId) setExpandedSessionId(null);
            if (fullscreenSessionId === sessionId) setFullscreenSessionId(null);
        } catch (err) {
            console.error("Error deleting session:", err);
        }
    };

    const getDisciplineIcon = (id: GameDisciplineId) => {
        switch (id) {
            case "kniffel": return Dice5;
            case "schocken": return Flame;
            case "kegeln": return Target;
        }
    };

    const yearlySessionCount = activeDiscipline === "kniffel"
        ? allYearKniffelSheets.length
        : allYearDisciplineSessions.length;

    return (
        <div className="space-y-8 pb-10 max-w-full overflow-x-hidden">
            {/* Hero Header */}
            <div className="relative overflow-hidden rounded-3xl kanpai-hero-banner border border-white/10 p-6 sm:p-8 md:p-10">
                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-4 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-wider uppercase">
                            {React.createElement(getDisciplineIcon(activeDiscipline), { className: "h-3.5 w-3.5" })}
                            {activePlugin.badgeLabel}
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight outfit">
                            {activePlugin.title} <span className="text-primary italic">Arena</span>
                        </h1>
                        <p className="text-muted-foreground text-sm sm:text-base md:text-lg leading-relaxed min-h-[3.5rem] line-clamp-2 flex items-start">
                            {activePlugin.subtitle}
                        </p>
                    </div>

                    <div className="flex items-center gap-4 text-muted-foreground">
                        <div className="flex flex-col items-end">
                            <span className="text-2xl font-black text-[#F5F0EB] outfit">{yearlySessionCount}</span>
                            <span className="text-xs uppercase font-bold tracking-widest">Sessions {selectedYear}</span>
                        </div>
                        <div className="h-10 w-px bg-border" />
                        {React.createElement(getDisciplineIcon(activeDiscipline), { className: "h-8 w-8 opacity-20" })}
                    </div>
                </div>

                {/* Disziplin-Umschalter (für alle im Verein aktivierten Spiele) */}
                {enabledGames.length > 1 && (
                    <div className="relative z-10 mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center gap-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-2">
                            Aktive Vereins-Disziplinen:
                        </span>
                        {ALL_GAME_PLUGINS.filter(p => enabledGames.includes(p.id)).map(plugin => {
                            const Icon = getDisciplineIcon(plugin.id);
                            const isSelected = activeDiscipline === plugin.id;
                            return (
                                <button
                                    key={plugin.id}
                                    onClick={() => {
                                        setActiveDiscipline(plugin.id);
                                        setExpandedSessionId(null);
                                    }}
                                    className={cn(
                                        "flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all cursor-pointer border",
                                        isSelected
                                            ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-[1.02]"
                                            : "bg-card/60 text-muted-foreground border-white/10 hover:text-foreground hover:bg-white/10"
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                    <span>{plugin.title}</span>
                                </button>
                            );
                        })}
                    </div>
                )}

                <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
            </div>

            {/* Main Grid: Chronologische Jahr/Monats-Navigation + Scorecards */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1">
                    <KniffelYearNav
                        selectedYear={selectedYear}
                        selectedMonth={selectedMonth}
                        onSelectYear={setSelectedYear}
                        onSelectMonth={setSelectedMonth}
                        sheets={activeDiscipline === "kniffel" ? allYearKniffelSheets : (allYearDisciplineSessions as any)}
                    />
                </div>

                <div className="lg:col-span-3">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-xl font-semibold outfit">
                            {dict.kniffel.months[selectedMonth]} {selectedYear} — {activePlugin.title}
                        </h2>
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold text-sm transition-all duration-300 shadow-lg shadow-primary/25 cursor-pointer"
                        >
                            <Plus className="h-4 w-4" />
                            Neue {activePlugin.shortTitle}-Runde starten
                        </button>
                    </div>

                    {activeDiscipline === "kniffel" ? (
                        <>
                            <KniffelSheetList
                                sheets={kniffelSheets}
                                members={members}
                                loading={kniffelLoading}
                                selectedYear={selectedYear}
                                selectedMonth={selectedMonth}
                            />
                            <AddSheetModal
                                isOpen={isAddModalOpen}
                                onClose={() => setIsAddModalOpen(false)}
                                members={members}
                                selectedYear={selectedYear}
                                selectedMonth={selectedMonth}
                            />
                        </>
                    ) : (
                        <>
                            {sessionsLoading ? (
                                <div className="p-8 text-center text-muted-foreground">{dict.common.loading}</div>
                            ) : disciplineSessions.length === 0 ? (
                                <div className="bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl ring-1 ring-white/5 text-center">
                                    <p className="text-muted-foreground">
                                        Noch keine {activePlugin.title}-Runde für {dict.kniffel.months[selectedMonth]} {selectedYear} eingetragen.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {disciplineSessions.map((sess, idx) => {
                                        const isExpanded = expandedSessionId === sess.id;
                                        const ScorecardComp = activePlugin.ScorecardComponent;
                                        const dateStr = sess.createdAt?.toDate
                                            ? sess.createdAt.toDate().toLocaleString("de-DE")
                                            : sess.dateIso
                                                ? new Date(sess.dateIso).toLocaleString("de-DE")
                                                : "";

                                        return (
                                            <div
                                                key={sess.id}
                                                className={cn(
                                                    "bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl ring-1 ring-white/5 overflow-hidden transition-all duration-300",
                                                    isExpanded && "ring-primary/40"
                                                )}
                                            >
                                                <div
                                                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors"
                                                    onClick={() => setExpandedSessionId(isExpanded ? null : sess.id)}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {isExpanded ? (
                                                            <ChevronDown className="h-5 w-5 text-primary" />
                                                        ) : (
                                                            <ChevronRight className="h-5 w-5" />
                                                        )}
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <h3 className="font-bold">
                                                                    {activePlugin.title} #{disciplineSessions.length - idx}
                                                                </h3>
                                                                {sess.isSubmitted && (
                                                                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
                                                                        <CheckCircle2 className="h-3 w-3" /> In Matrix
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                <Calendar className="h-3 w-3" />
                                                                {dateStr}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        <button
                                                            type="button"
                                                            onClick={e => {
                                                                e.stopPropagation();
                                                                setExpandedSessionId(sess.id);
                                                                setFullscreenSessionId(sess.id);
                                                            }}
                                                            className="p-2 rounded-lg text-muted-foreground hover:bg-primary/15 hover:text-primary transition-colors cursor-pointer"
                                                            title="Vollbildmodus"
                                                        >
                                                            <Maximize2 className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={e => {
                                                                e.stopPropagation();
                                                                if (fullscreenSessionId === sess.id) setFullscreenSessionId(null);
                                                                setDeletingSessionId(sess.id);
                                                            }}
                                                            className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-500 transition-colors cursor-pointer"
                                                            title="Runde löschen"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {isExpanded && (
                                                    <div className="border-t border-white/10 p-3 sm:p-4">
                                                        <ScorecardComp
                                                            session={sess}
                                                            members={members}
                                                            clubId={clubId}
                                                        />
                                                    </div>
                                                )}

                                                {fullscreenSessionId === sess.id && typeof document !== "undefined" && createPortal(
                                                    <div className="fixed inset-0 z-[9999] bg-background flex flex-col overflow-hidden">
                                                        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10 bg-card/85 backdrop-blur-xl shrink-0">
                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                <div className="p-2 rounded-xl bg-primary/15 text-primary shrink-0">
                                                                    {React.createElement(getDisciplineIcon(activeDiscipline), { className: "h-4 w-4" })}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <h3 className="font-bold text-sm sm:text-base truncate">
                                                                            {activePlugin.title} #{disciplineSessions.length - idx}
                                                                        </h3>
                                                                        {sess.isSubmitted && (
                                                                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold shrink-0">
                                                                                <CheckCircle2 className="h-3 w-3" /> In Matrix
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-[11px] text-muted-foreground truncate">{dateStr}</div>
                                                                </div>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => setFullscreenSessionId(null)}
                                                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow cursor-pointer shrink-0"
                                                            >
                                                                <Minimize2 className="h-4 w-4" />
                                                                <span>Vollbild beenden</span>
                                                            </button>
                                                        </div>

                                                        <div className="flex-1 overflow-auto p-3 sm:p-5 pb-16">
                                                            <div className="w-full">
                                                                <ScorecardComp
                                                                    session={sess}
                                                                    members={members}
                                                                    clubId={clubId}
                                                                    isFullscreen={true}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>,
                                                    document.body
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            <PlayerSelectionModal
                                isOpen={isAddModalOpen}
                                onClose={() => setIsAddModalOpen(false)}
                                members={members}
                                onCreateGame={handleCreateUniversalSession}
                            />

                            <DeleteConfirmationModal
                                isOpen={!!deletingSessionId}
                                onClose={() => setDeletingSessionId(null)}
                                onConfirm={async () => {
                                    if (deletingSessionId) {
                                        await handleDeleteUniversalSession(deletingSessionId);
                                    }
                                }}
                                title={`${activePlugin.title}-Runde löschen`}
                                description={dict.kniffel.confirmDelete}
                            />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
