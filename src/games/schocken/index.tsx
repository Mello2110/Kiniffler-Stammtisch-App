"use client";

/**
 * PHASE 4: SCHOCKEN GAME ENGINE & INTERACTIVE SCORECARD
 * =====================================================
 * Vollwertige Umsetzung des Kneipen-Würfelklassikers „Schocken“:
 * - 13 Deckel im Besteck (Stock), Übergabe Stock -> Spieler und Spieler -> Spieler (Stechen)
 * - Volle Wurf-Hierarchie (Schock-Out = 13 Deckel / Sofortverlust, Schock 6..2, General, Straße, Hausnummer inkl. Jule 4-2-1)
 * - Hälften-Verwaltung (1. Hälfte, 2. Hälfte, Finale)
 * - Automatische Generierung von Strafkassen-Buchungen (Hälftenverlust, Schock-Out, Rundenverlust)
 * - Direkte Punkte-Übertragung in die Saison-Matrix
 */

import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { doc, setDoc, updateDoc, addDoc, getDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useClub } from "@/contexts/ClubContext";
import { triggerHaptic } from "@/lib/haptics";
import { Toast, useToast } from "@/components/common/Toast";
import {
    Flame,
    ShieldAlert,
    Trophy,
    Coins,
    RotateCcw,
    Sparkles,
    Swords,
    Plus,
    Minus,
    Dices,
    Undo2,
    History,
    ChevronDown,
    ChevronUp,
    Wrench
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DEFAULT_CLUB_RULESET } from "@/lib/defaultRuleset";
import { pointDocId, placementPoints, assignRanks } from "@/lib/seasonPoints";
import type { GamePlugin, PenaltyProposal, RankingEntry, ScorecardComponentProps, UniversalGameSession } from "@/games/types";
import type { ClubRulesetConfig, GuestPlayer, Member } from "@/types";

export type SchockenThrowId =
    | "schock_out"
    | "jule"
    | "schock_6"
    | "schock_5"
    | "schock_4"
    | "schock_3"
    | "schock_2"
    | "general"
    | "strasse"
    | "hausnummer";

export interface SchockenThrowDefinition {
    id: SchockenThrowId;
    label: string;
    diceDisplay: string;
    coasters: number; // Anzahl der Deckel
    instantLoss?: boolean;
    rankOrder: number; // Höher = besserer Wurf
}

export const SCHOCKEN_THROWS: SchockenThrowDefinition[] = [
    { id: "schock_out", label: "Schock-Out", diceDisplay: "1 - 1 - 1", coasters: 13, instantLoss: true, rankOrder: 100 },
    { id: "jule", label: "Schock-Jule", diceDisplay: "4 - 2 - 1", coasters: 7, rankOrder: 90 },
    { id: "schock_6", label: "Schock 6", diceDisplay: "1 - 1 - 6", coasters: 6, rankOrder: 86 },
    { id: "schock_5", label: "Schock 5", diceDisplay: "1 - 1 - 5", coasters: 5, rankOrder: 85 },
    { id: "schock_4", label: "Schock 4", diceDisplay: "1 - 1 - 4", coasters: 4, rankOrder: 84 },
    { id: "schock_3", label: "Schock 3", diceDisplay: "1 - 1 - 3", coasters: 3, rankOrder: 83 },
    { id: "schock_2", label: "Schock 2", diceDisplay: "1 - 1 - 2", coasters: 2, rankOrder: 82 },
    { id: "general", label: "General (Pasch)", diceDisplay: "X - X - X", coasters: 3, rankOrder: 70 },
    { id: "strasse", label: "Straße", diceDisplay: "1-2-3 .. 4-5-6", coasters: 2, rankOrder: 60 },
    { id: "hausnummer", label: "Hausnummer", diceDisplay: "Einfacher Wurf", coasters: 1, rankOrder: 10 },
];

export interface SchockenHistoryEvent {
    id: string;
    timestamp: number;
    phase: "half1" | "half2" | "finale";
    throwId: SchockenThrowId;
    throwLabel: string;
    coasters: number;
    receiverId: string;
    donorId?: string; // "stock" oder Spieler-ID im Stechen
    rollerId?: string;
    note?: string;
}

export interface SchockenUndoSnapshot {
    actionLabel: string;
    stockRemaining: number;
    currentPhase: "half1" | "half2" | "finale";
    half1LoserId: string | null;
    half2LoserId: string | null;
    finalLoserId: string | null;
    coastersByPlayer: Record<string, number>;
    statsByPlayer: SchockenState["statsByPlayer"];
    history: SchockenHistoryEvent[];
    completedMatches: SchockenMatchRecord[];
    linkedPenaltyId?: string;
    linkedLedgerId?: string;
}

export interface SchockenMatchRecord {
    id: string;
    timestamp: number;
    half1LoserId: string;
    half2LoserId: string;
    finalLoserId: string;
    schockOutCountByPlayer: Record<string, number>;
}

export interface SchockenState {
    totalStockCoasters: number; // Standard: 13 Deckel im Besteck
    stockRemaining: number;
    currentPhase: "half1" | "half2" | "finale";
    half1LoserId: string | null;
    half2LoserId: string | null;
    finalLoserId: string | null;
    coastersByPlayer: Record<string, number>;
    statsByPlayer: Record<string, {
        schockOutsThrown: number;
        generalsThrown: number;
        halvesLost: number;
        matchesLost: number;
        matchesWon: number;
    }>;
    history: SchockenHistoryEvent[];
    completedMatches: SchockenMatchRecord[];
    undoStack?: SchockenUndoSnapshot[];
}

export function createInitialSchockenState(playerIds: string[], stockCoasters: number = 13): SchockenState {
    const coastersByPlayer: Record<string, number> = {};
    const statsByPlayer: SchockenState["statsByPlayer"] = {};
    for (const pid of playerIds) {
        coastersByPlayer[pid] = 0;
        statsByPlayer[pid] = {
            schockOutsThrown: 0,
            generalsThrown: 0,
            halvesLost: 0,
            matchesLost: 0,
            matchesWon: 0,
        };
    }
    return {
        totalStockCoasters: stockCoasters,
        stockRemaining: stockCoasters,
        currentPhase: "half1",
        half1LoserId: null,
        half2LoserId: null,
        finalLoserId: null,
        coastersByPlayer,
        statsByPlayer,
        history: [],
        completedMatches: [],
    };
}

function SchockenScorecard({ session, members, isFullscreen }: ScorecardComponentProps<SchockenState>) {
    const { clubId, club, clubCollection, clubDoc } = useClub();
    const rules = club?.ruleset?.schocken ?? DEFAULT_CLUB_RULESET.schocken;
    const { toast, showToast, hideToast } = useToast();

    const orderedPlayerIds = useMemo(
        () => session.playerOrder || session.memberSnapshot || [],
        [session.playerOrder, session.memberSnapshot]
    );

    const [state, setState] = useState<SchockenState>(() => {
        return session.state || createInitialSchockenState(orderedPlayerIds, rules.stockCoasters);
    });

    const [selectedThrowId, setSelectedThrowId] = useState<SchockenThrowId>("hausnummer");
    const [selectedReceiverId, setSelectedReceiverId] = useState<string>(orderedPlayerIds[0] || "");
    const [selectedRollerId, setSelectedRollerId] = useState<string>("");
    const [selectedDonorId, setSelectedDonorId] = useState<string>("stock");
    const [isSaving, setIsSaving] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [correctionMode, setCorrectionMode] = useState(false);

    const players = useMemo(() => {
        const mMap = new Map(members.map(m => [m.id, m]));
        const gMap = new Map((session.guests || []).map(g => [g.id, g]));
        return orderedPlayerIds.map(id => {
            const m = mMap.get(id);
            const g = gMap.get(id);
            return {
                id,
                name: m?.name || g?.name || "Spieler",
                isGuest: !!g,
                hostMemberId: g?.hostMemberId,
            };
        });
    }, [orderedPlayerIds, members, session.guests]);

    const persistState = async (nextState: SchockenState) => {
        setState(nextState);
        setIsSaving(true);
        try {
            await updateDoc(clubDoc("gameSessions", session.id), {
                state: nextState,
            });
        } catch (err) {
            console.error("Error saving Schocken state:", err);
        } finally {
            setIsSaving(false);
        }
    };

    const createUndoSnapshot = (
        actionLabel: string,
        linkedIds?: { penaltyId: string; ledgerId: string } | null
    ): SchockenUndoSnapshot => ({
        actionLabel,
        stockRemaining: state.stockRemaining,
        currentPhase: state.currentPhase,
        half1LoserId: state.half1LoserId,
        half2LoserId: state.half2LoserId,
        finalLoserId: state.finalLoserId,
        coastersByPlayer: { ...state.coastersByPlayer },
        statsByPlayer: Object.fromEntries(
            Object.entries(state.statsByPlayer || {}).map(([k, v]) => [k, { ...v }])
        ),
        history: [...(state.history || [])],
        completedMatches: [...(state.completedMatches || [])],
        ...(linkedIds?.penaltyId ? { linkedPenaltyId: linkedIds.penaltyId } : {}),
        ...(linkedIds?.ledgerId ? { linkedLedgerId: linkedIds.ledgerId } : {}),
    });

    const bookClubPenalty = async (
        playerId: string,
        amountEur: number,
        reason: string
    ): Promise<{ penaltyId: string; ledgerId: string } | null> => {
        const p = players.find(pl => pl.id === playerId);
        if (!p) return null;
        const targetUid = p.isGuest ? p.hostMemberId : p.id;
        if (!targetUid) {
            showToast("Gast hat keinen zugewiesenen Gastgeber für Strafen.");
            return null;
        }

        triggerHaptic("penalty");
        const dateStr = new Date().toISOString().split("T")[0];
        const finalReason = p.isGuest ? `${reason} (${p.name})` : reason;

        try {
            const penPayload = {
                userId: targetUid,
                amount: amountEur,
                reason: finalReason,
                date: dateStr,
                isPaid: false,
                paidViaReconciliation: false,
                createdAt: serverTimestamp(),
                isGuestPenalty: p.isGuest,
                guestId: p.isGuest ? p.id : null,
                guestName: p.isGuest ? p.name : null,
            };
            const penRef = await addDoc(clubCollection("penalties"), penPayload);

            const ledgerPayload = {
                userId: targetUid,
                amount: -amountEur,
                type: "penalty",
                description: `Schocken: ${finalReason}`,
                date: dateStr,
                createdAt: serverTimestamp(),
                linkedDocId: penRef.id,
            };
            const ledgerRef = await addDoc(clubCollection("ledger_entries"), ledgerPayload);

            if (clubId === "club_original") {
                await setDoc(doc(db, "penalties", penRef.id), penPayload).catch(() => {});
                await setDoc(doc(db, "ledger_entries", ledgerRef.id), ledgerPayload).catch(() => {});
            }

            showToast(`✓ ${amountEur.toFixed(2)}€ Strafe verbucht: ${p.name} (${reason})`);
            return { penaltyId: penRef.id, ledgerId: ledgerRef.id };
        } catch (err) {
            console.error("Error booking Schocken penalty:", err);
            return null;
        }
    };

    const rollbackLinkedPenalty = async (penaltyId?: string, ledgerId?: string) => {
        if (!penaltyId && !ledgerId) return;
        try {
            if (penaltyId) {
                await deleteDoc(clubDoc("penalties", penaltyId)).catch(() => {});
                if (clubId === "club_original") {
                    await deleteDoc(doc(db, "penalties", penaltyId)).catch(() => {});
                }
            }
            if (ledgerId) {
                await deleteDoc(clubDoc("ledger_entries", ledgerId)).catch(() => {});
                if (clubId === "club_original") {
                    await deleteDoc(doc(db, "ledger_entries", ledgerId)).catch(() => {});
                }
            }
        } catch (err) {
            console.error("Error rolling back Schocken penalty:", err);
        }
    };

    const handleUndoLastAction = async () => {
        const stack = state.undoStack || [];
        if (stack.length === 0 || isSaving) return;

        const snapshot = stack[0];
        triggerHaptic("tap");

        const nextState: SchockenState = {
            ...state,
            stockRemaining: snapshot.stockRemaining,
            currentPhase: snapshot.currentPhase,
            half1LoserId: snapshot.half1LoserId,
            half2LoserId: snapshot.half2LoserId,
            finalLoserId: snapshot.finalLoserId,
            coastersByPlayer: snapshot.coastersByPlayer,
            statsByPlayer: snapshot.statsByPlayer,
            history: snapshot.history,
            completedMatches: snapshot.completedMatches,
            undoStack: stack.slice(1),
        };

        await persistState(nextState);
        await rollbackLinkedPenalty(snapshot.linkedPenaltyId, snapshot.linkedLedgerId);
        showToast(`↩️ Rückgängig: ${snapshot.actionLabel}`);
    };

    const handleAssignCoasters = async () => {
        const throwDef = SCHOCKEN_THROWS.find(t => t.id === selectedThrowId);
        if (!throwDef || !selectedReceiverId) return;

        const nextCoasters = { ...state.coastersByPlayer };
        const nextStats = { ...state.statsByPlayer };
        let nextStock = state.stockRemaining;

        // Track special throws for roller if selected
        if (selectedRollerId && nextStats[selectedRollerId]) {
            if (throwDef.id === "schock_out") {
                nextStats[selectedRollerId] = {
                    ...nextStats[selectedRollerId],
                    schockOutsThrown: (nextStats[selectedRollerId].schockOutsThrown || 0) + 1,
                };
            } else if (throwDef.id === "general") {
                nextStats[selectedRollerId] = {
                    ...nextStats[selectedRollerId],
                    generalsThrown: (nextStats[selectedRollerId].generalsThrown || 0) + 1,
                };
            }
        }

        const wasFromStock = selectedDonorId === "stock" && state.stockRemaining > 0;
        let recordedDonorId = "stock";

        if (throwDef.instantLoss) {
            triggerHaptic("specialThrow");
            // Schock-Out: Verlierer der Runde bekommt sofort alle 13 Deckel und verliert die Hälfte!
            for (const pid of orderedPlayerIds) {
                nextCoasters[pid] = pid === selectedReceiverId ? state.totalStockCoasters : 0;
            }
            nextStock = 0;
            recordedDonorId = "stock";
        } else {
            triggerHaptic("diceRoll");
            if (wasFromStock) {
                const transfer = Math.min(throwDef.coasters, nextStock);
                nextStock -= transfer;
                nextCoasters[selectedReceiverId] = (nextCoasters[selectedReceiverId] || 0) + transfer;
                recordedDonorId = "stock";
            } else {
                // Stechen: Übergabe von einem anderen Spieler mit den meisten Deckeln oder gewähltem Geber
                const effectiveDonor = selectedDonorId !== "stock"
                    ? selectedDonorId
                    : Object.entries(nextCoasters)
                        .filter(([pid, c]) => pid !== selectedReceiverId && c > 0)
                        .sort((a, b) => b[1] - a[1])[0]?.[0];

                if (!effectiveDonor || (nextCoasters[effectiveDonor] || 0) <= 0) {
                    showToast("Kein Deckel im Stock oder beim Geber verfügbar!");
                    return;
                }
                if (effectiveDonor === selectedReceiverId) {
                    showToast("Geber und Empfänger dürfen nicht identisch sein.");
                    return;
                }
                const transfer = Math.min(throwDef.coasters, nextCoasters[effectiveDonor] || 0);
                nextCoasters[effectiveDonor] -= transfer;
                nextCoasters[selectedReceiverId] = (nextCoasters[selectedReceiverId] || 0) + transfer;
                recordedDonorId = effectiveDonor;
            }
        }

        const receiverName = players.find(p => p.id === selectedReceiverId)?.name || "Spieler";
        const snapshot = createUndoSnapshot(`${throwDef.label} → ${receiverName}`);

        const newEvent: SchockenHistoryEvent = {
            id: `ev_${Date.now()}`,
            timestamp: Date.now(),
            phase: state.currentPhase,
            throwId: throwDef.id,
            throwLabel: throwDef.label,
            coasters: throwDef.coasters,
            receiverId: selectedReceiverId,
            donorId: recordedDonorId,
            ...(selectedRollerId ? { rollerId: selectedRollerId } : {}),
        };

        const nextState: SchockenState = {
            ...state,
            stockRemaining: nextStock,
            coastersByPlayer: nextCoasters,
            statsByPlayer: nextStats,
            history: [newEvent, ...(state.history || []).slice(0, 99)],
            undoStack: [snapshot, ...(state.undoStack || []).slice(0, 24)],
        };

        await persistState(nextState);
    };

    const handleConcludePhase = async (loserId: string) => {
        if (!loserId) return;
        triggerHaptic("penalty");

        const resetCoasters: Record<string, number> = {};
        for (const pid of orderedPlayerIds) resetCoasters[pid] = 0;

        const nextStats = { ...state.statsByPlayer };
        if (nextStats[loserId]) {
            nextStats[loserId] = {
                ...nextStats[loserId],
                halvesLost: (nextStats[loserId].halvesLost || 0) + 1,
            };
        }

        const loserName = players.find(p => p.id === loserId)?.name || "Spieler";

        if (state.currentPhase === "half1") {
            const linkedIds = await bookClubPenalty(loserId, rules.halfLossPenaltyEur, "1. Hälfte verloren");
            const snapshot = createUndoSnapshot(`1. Hälfte verloren (${loserName})`, linkedIds);
            const nextState: SchockenState = {
                ...state,
                half1LoserId: loserId,
                currentPhase: "half2",
                stockRemaining: state.totalStockCoasters,
                coastersByPlayer: resetCoasters,
                statsByPlayer: nextStats,
                undoStack: [snapshot, ...(state.undoStack || []).slice(0, 24)],
            };
            await persistState(nextState);
        } else if (state.currentPhase === "half2") {
            // Wenn derselbe Spieler beide Hälften verliert -> Direktes Match-Ende ohne Finale!
            if (state.half1LoserId === loserId) {
                const linkedIds = await bookClubPenalty(loserId, rules.doubleHalfLossPenaltyEur, "Beide Hälften verloren (Doppel-Niederlage)");
                const snapshot = createUndoSnapshot(`Beide Hälften verloren (${loserName})`, linkedIds);
                if (nextStats[loserId]) {
                    nextStats[loserId].matchesLost = (nextStats[loserId].matchesLost || 0) + 1;
                }
                for (const pid of orderedPlayerIds) {
                    if (pid !== loserId && nextStats[pid]) {
                        nextStats[pid].matchesWon = (nextStats[pid].matchesWon || 0) + 1;
                    }
                }
                const matchRec: SchockenMatchRecord = {
                    id: `match_${Date.now()}`,
                    timestamp: Date.now(),
                    half1LoserId: loserId,
                    half2LoserId: loserId,
                    finalLoserId: loserId,
                    schockOutCountByPlayer: {},
                };
                const nextState: SchockenState = {
                    ...state,
                    half2LoserId: loserId,
                    finalLoserId: loserId,
                    currentPhase: "half1",
                    half1LoserId: null,
                    stockRemaining: state.totalStockCoasters,
                    coastersByPlayer: resetCoasters,
                    statsByPlayer: nextStats,
                    completedMatches: [...(state.completedMatches || []), matchRec],
                    undoStack: [snapshot, ...(state.undoStack || []).slice(0, 24)],
                };
                await persistState(nextState);
            } else {
                const linkedIds = await bookClubPenalty(loserId, rules.halfLossPenaltyEur, "2. Hälfte verloren");
                const snapshot = createUndoSnapshot(`2. Hälfte verloren (${loserName})`, linkedIds);
                const nextState: SchockenState = {
                    ...state,
                    half2LoserId: loserId,
                    currentPhase: "finale",
                    stockRemaining: state.totalStockCoasters,
                    coastersByPlayer: resetCoasters,
                    statsByPlayer: nextStats,
                    undoStack: [snapshot, ...(state.undoStack || []).slice(0, 24)],
                };
                await persistState(nextState);
            }
        } else if (state.currentPhase === "finale") {
            const linkedIds = await bookClubPenalty(loserId, rules.finalLossPenaltyEur, "Schocken-Finale verloren (Runde zahlt)");
            const snapshot = createUndoSnapshot(`Finale verloren (${loserName})`, linkedIds);
            if (nextStats[loserId]) {
                nextStats[loserId].matchesLost = (nextStats[loserId].matchesLost || 0) + 1;
            }
            for (const pid of orderedPlayerIds) {
                if (pid !== loserId && nextStats[pid]) {
                    nextStats[pid].matchesWon = (nextStats[pid].matchesWon || 0) + 1;
                }
            }
            const matchRec: SchockenMatchRecord = {
                id: `match_${Date.now()}`,
                timestamp: Date.now(),
                half1LoserId: state.half1LoserId || loserId,
                half2LoserId: state.half2LoserId || loserId,
                finalLoserId: loserId,
                schockOutCountByPlayer: {},
            };
            const nextState: SchockenState = {
                ...state,
                finalLoserId: null,
                half1LoserId: null,
                half2LoserId: null,
                currentPhase: "half1",
                stockRemaining: state.totalStockCoasters,
                coastersByPlayer: resetCoasters,
                statsByPlayer: nextStats,
                completedMatches: [...(state.completedMatches || []), matchRec],
                undoStack: [snapshot, ...(state.undoStack || []).slice(0, 24)],
            };
            await persistState(nextState);
        }
    };

    const handleTransferToMatrix = async () => {
        try {
            const rankings = SchockenGamePlugin.determineRankings({ ...session, state }, members, club?.ruleset);

            for (const r of rankings) {
                if (r.isGuest) continue;
                const compositeId = pointDocId(r.memberId, session.year, session.month, "schocken");
                const pointRef = clubDoc("points", compositeId);
                const snap = await getDoc(pointRef);
                const existing = snap.exists() ? snap.data() : null;
                const sheetContributions = existing?.sheetContributions || {};
                sheetContributions[session.id] = r.matrixPoints;
                const newTotal = Object.values(sheetContributions).reduce(
                    (s: number, v: any) => s + (typeof v === "number" ? v : 0),
                    0
                );

                const payload = {
                    id: compositeId,
                    userId: r.memberId,
                    gameType: "schocken",
                    month: session.month,
                    year: session.year,
                    points: newTotal,
                    sheetContributions,
                };
                await setDoc(pointRef, payload, { merge: true });
                if (clubId === "club_original") {
                    await setDoc(doc(db, "points", compositeId), payload, { merge: true }).catch(() => {});
                }
            }

            await updateDoc(clubDoc("gameSessions", session.id), { isSubmitted: true });
            triggerHaptic("success");
            showToast("✓ Schocken-Punkte in die Saison-Matrix übertragen!");
        } catch (err) {
            console.error("Error transferring Schocken points:", err);
            showToast("Fehler beim Übertragen in die Matrix.");
        }
    };

    const getPlayerName = (id: string | null) => {
        if (!id) return "Offen";
        if (id === "stock") return "Besteck (Stock)";
        return players.find(p => p.id === id)?.name || "Unbekannt";
    };

    const toastElement = <Toast message={toast.message} isVisible={toast.visible} onClose={hideToast} />;

    return (
        <div className="space-y-6">
            {isFullscreen && typeof document !== "undefined"
                ? createPortal(toastElement, document.body)
                : toastElement}

            {/* Top Bar: Besteck (13 Deckel) & Hälften-Status */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Besteck / Stock Visualisierung */}
                <div className="min-w-0 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/15 via-background to-background p-5 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                            <Coins className="h-4 w-4" />
                            Besteck (Stock)
                        </span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold">
                            {state.stockRemaining > 0 ? "Aus Stock verteilen" : "Stechen (Spieler zu Spieler)"}
                        </span>
                    </div>
                    <div className="my-3 flex items-baseline gap-2">
                        <span className="text-4xl font-black outfit text-amber-400">{state.stockRemaining}</span>
                        <span className="text-sm text-muted-foreground">/ {state.totalStockCoasters} Deckel im Stock</span>
                    </div>
                    {/* Visual Coaster Stack */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                        {Array.from({ length: state.totalStockCoasters }).map((_, idx) => (
                            <div
                                key={idx}
                                className={cn(
                                    "h-3.5 w-3.5 rounded-full border transition-all",
                                    idx < state.stockRemaining
                                        ? "bg-amber-400 border-amber-200 shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                                        : "bg-white/5 border-white/10 opacity-30"
                                )}
                            />
                        ))}
                    </div>
                </div>

                {/* Hälften-Status & Phasen-Schalter */}
                <div className="min-w-0 rounded-2xl border border-primary/20 bg-card/60 p-5 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                            <Swords className="h-4 w-4" />
                            Aktuelle Spielphase
                        </span>
                        <span className="text-xs text-muted-foreground">
                            {state.completedMatches?.length || 0} Runden gespielt
                        </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 my-3">
                        {([
                            { id: "half1", label: "1. Hälfte", sub: getPlayerName(state.half1LoserId) },
                            { id: "half2", label: "2. Hälfte", sub: getPlayerName(state.half2LoserId) },
                            { id: "finale", label: "Finale", sub: state.half1LoserId && state.half2LoserId ? "Stechen" : "Bereit" }
                        ] as const).map(ph => (
                            <button
                                key={ph.id}
                                onClick={() => persistState({ ...state, currentPhase: ph.id })}
                                className={cn(
                                    "p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                                    state.currentPhase === ph.id
                                        ? "border-primary bg-primary/20 text-foreground shadow-sm"
                                        : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10"
                                )}
                            >
                                <div className="text-xs font-bold">{ph.label}</div>
                                <div className="text-[11px] truncate opacity-80">{ph.sub}</div>
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={handleUndoLastAction}
                                disabled={!state.undoStack?.length || isSaving}
                                className="text-xs flex items-center gap-1 text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-semibold"
                                title={state.undoStack?.[0] ? `Rückgängig: ${state.undoStack[0].actionLabel}` : "Keine Aktion zum Rückgängigmachen"}
                            >
                                <Undo2 className="h-3.5 w-3.5" />
                                Rückgängig
                            </button>
                            <button
                                type="button"
                                onClick={() => setCorrectionMode(prev => !prev)}
                                className={cn(
                                    "text-xs flex items-center gap-1 px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer",
                                    correctionMode
                                        ? "bg-primary/20 border-primary/40 text-primary font-semibold"
                                        : "bg-white/5 border-white/10 text-muted-foreground hover:text-foreground"
                                )}
                                title="Hälften- und Runden-Zähler manuell korrigieren"
                            >
                                <Wrench className="h-3.5 w-3.5" />
                                Korrektur
                            </button>
                        </div>

                        <button
                            onClick={() => {
                                const snapshot = createUndoSnapshot("Deckel zurück in Stock");
                                const reset: Record<string, number> = {};
                                orderedPlayerIds.forEach(id => reset[id] = 0);
                                persistState({
                                    ...state,
                                    stockRemaining: state.totalStockCoasters,
                                    coastersByPlayer: reset,
                                    undoStack: [snapshot, ...(state.undoStack || []).slice(0, 24)],
                                });
                            }}
                            className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Deckel zurück
                        </button>

                        <button
                            onClick={handleTransferToMatrix}
                            className="h-9 px-3 text-xs font-semibold rounded-xl flex items-center gap-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 transition-colors cursor-pointer"
                        >
                            <Trophy className="h-3.5 w-3.5" />
                            In Saison-Matrix übertragen
                        </button>
                    </div>
                </div>

                {/* Wurf-Schnellrechner & Deckel-Verteilung */}
                <div className="min-w-0 rounded-2xl border border-white/10 bg-card/60 p-5 flex flex-col justify-between space-y-3">
                    <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Dices className="h-4 w-4 text-primary" />
                        Wurf & Deckel zuteilen
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-[10px] uppercase font-bold text-muted-foreground">Höchster Wurf</label>
                            <select
                                value={selectedThrowId}
                                onChange={e => setSelectedThrowId(e.target.value as SchockenThrowId)}
                                className="w-full mt-1 px-3 py-2 rounded-xl bg-background border border-white/10 text-xs font-semibold"
                            >
                                {SCHOCKEN_THROWS.filter(t => rules.juleEnabled || t.id !== "jule").map(t => (
                                    <option key={t.id} value={t.id}>
                                        {t.label} ({t.coasters} Deckel)
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-muted-foreground">Kassiert Deckel</label>
                            <select
                                value={selectedReceiverId}
                                onChange={e => setSelectedReceiverId(e.target.value)}
                                className="w-full mt-1 px-3 py-2 rounded-xl bg-background border border-white/10 text-xs font-semibold"
                            >
                                {players.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {(selectedThrowId === "schock_out" || selectedThrowId === "general") && (
                        <div>
                            <label className="text-[10px] uppercase font-bold text-muted-foreground">Werfer (für Statistik &amp; Bonus)</label>
                            <select
                                value={selectedRollerId}
                                onChange={e => setSelectedRollerId(e.target.value)}
                                className="w-full mt-1 px-3 py-1.5 rounded-xl bg-background border border-white/10 text-xs"
                            >
                                <option value="">— nicht erfassen —</option>
                                {players.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {state.stockRemaining === 0 && (
                        <div>
                            <label className="text-[10px] uppercase font-bold text-amber-400">Deckel-Geber (Stechen)</label>
                            <select
                                value={selectedDonorId}
                                onChange={e => setSelectedDonorId(e.target.value)}
                                className="w-full mt-1 px-3 py-1.5 rounded-xl bg-background border border-amber-500/30 text-xs"
                            >
                                <option value="stock">Automatisch (Meiste Deckel)</option>
                                {players.filter(p => (state.coastersByPlayer[p.id] || 0) > 0).map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} ({state.coastersByPlayer[p.id]} Deckel)
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <button
                        onClick={handleAssignCoasters}
                        disabled={isSaving}
                        className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all shadow-md cursor-pointer"
                    >
                        Deckel zuteilen ({SCHOCKEN_THROWS.find(t => t.id === selectedThrowId)?.coasters} Stk.)
                    </button>
                </div>
            </div>

            {/* Spieler-Karten mit Live-Deckelzähler & Direktaktionen */}
            <div className={cn("grid gap-3 sm:gap-4", isFullscreen ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3")}>
                {players.map(player => {
                    const coasters = state.coastersByPlayer[player.id] || 0;
                    const pStats = state.statsByPlayer[player.id] || {
                        schockOutsThrown: 0,
                        generalsThrown: 0,
                        halvesLost: 0,
                        matchesLost: 0,
                        matchesWon: 0,
                    };
                    const isHalf1Loser = state.half1LoserId === player.id;
                    const isHalf2Loser = state.half2LoserId === player.id;
                    const hasAllCoasters = coasters >= state.totalStockCoasters;

                    return (
                        <div
                            key={player.id}
                            className={cn(
                                "rounded-2xl border p-4 transition-all flex flex-col justify-between gap-3",
                                hasAllCoasters
                                    ? "border-red-500/60 bg-red-500/10 shadow-[0_0_25px_rgba(239,68,68,0.2)]"
                                    : coasters > 0
                                        ? "border-amber-500/30 bg-card/80"
                                        : "border-white/10 bg-card/40"
                            )}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-base">{player.name}</h4>
                                        {player.isGuest && (
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                                                Gast
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                        {isHalf1Loser && (
                                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-red-500/20 text-red-400 font-bold">
                                                1. Hälfte verloren
                                            </span>
                                        )}
                                        {isHalf2Loser && (
                                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-red-500/20 text-red-400 font-bold">
                                                2. Hälfte verloren
                                            </span>
                                        )}
                                        <span className="text-[11px] text-muted-foreground">
                                            Hälften: {pStats.halvesLost} | Runden-Niederlagen: {pStats.matchesLost}
                                        </span>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <div className={cn(
                                        "text-3xl font-black outfit leading-none",
                                        hasAllCoasters ? "text-red-400" : coasters > 0 ? "text-amber-400" : "text-emerald-400"
                                    )}>
                                        {coasters}
                                    </div>
                                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Deckel</span>
                                </div>
                            </div>

                            {/* Quick Coaster Stepper (+1 / -1 / Schock-Out) */}
                            <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                                <button
                                    onClick={async () => {
                                        if (coasters <= 0) return;
                                        triggerHaptic("tap");
                                        const snapshot = createUndoSnapshot(`-1 Deckel (${player.name})`);
                                        const nextC = { ...state.coastersByPlayer, [player.id]: coasters - 1 };
                                        await persistState({
                                            ...state,
                                            stockRemaining: Math.min(state.totalStockCoasters, state.stockRemaining + 1),
                                            coastersByPlayer: nextC,
                                            undoStack: [snapshot, ...(state.undoStack || []).slice(0, 24)],
                                        });
                                    }}
                                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                    title="1 Deckel zurück in Stock"
                                >
                                    <Minus className="h-4 w-4" />
                                </button>

                                <button
                                    onClick={async () => {
                                        if (state.stockRemaining <= 0) {
                                            showToast("Stock ist leer! Nutze die Zuteilung oben fürs Stechen.");
                                            return;
                                        }
                                        triggerHaptic("tap");
                                        const snapshot = createUndoSnapshot(`+1 Deckel (${player.name})`);
                                        const nextC = { ...state.coastersByPlayer, [player.id]: coasters + 1 };
                                        await persistState({
                                            ...state,
                                            stockRemaining: state.stockRemaining - 1,
                                            coastersByPlayer: nextC,
                                            undoStack: [snapshot, ...(state.undoStack || []).slice(0, 24)],
                                        });
                                    }}
                                    className="p-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                    <Plus className="h-3.5 w-3.5" /> 1 Deckel
                                </button>

                                <button
                                    onClick={() => handleConcludePhase(player.id)}
                                    className={cn(
                                        "ml-auto px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer",
                                        hasAllCoasters
                                            ? "bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/30 animate-pulse"
                                            : "bg-red-500/15 hover:bg-red-500/25 text-red-400"
                                    )}
                                >
                                    <ShieldAlert className="h-3.5 w-3.5" />
                                    {state.currentPhase === "finale" ? "Finale verloren" : "Hälfte verloren"}
                                </button>
                            </div>

                            {correctionMode && (
                                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-dashed border-white/10 text-[11px] text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <span>Hälften:</span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const nextStats = { ...state.statsByPlayer };
                                                nextStats[player.id] = { ...pStats, halvesLost: Math.max(0, (pStats.halvesLost || 0) - 1) };
                                                persistState({ ...state, statsByPlayer: nextStats });
                                            }}
                                            className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 cursor-pointer"
                                        >-</button>
                                        <span className="font-bold text-foreground px-1">{pStats.halvesLost}</span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const nextStats = { ...state.statsByPlayer };
                                                nextStats[player.id] = { ...pStats, halvesLost: (pStats.halvesLost || 0) + 1 };
                                                persistState({ ...state, statsByPlayer: nextStats });
                                            }}
                                            className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 cursor-pointer"
                                        >+</button>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span>Runden:</span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const nextStats = { ...state.statsByPlayer };
                                                nextStats[player.id] = { ...pStats, matchesLost: Math.max(0, (pStats.matchesLost || 0) - 1) };
                                                persistState({ ...state, statsByPlayer: nextStats });
                                            }}
                                            className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 cursor-pointer"
                                        >-</button>
                                        <span className="font-bold text-foreground px-1">{pStats.matchesLost}</span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const nextStats = { ...state.statsByPlayer };
                                                nextStats[player.id] = { ...pStats, matchesLost: (pStats.matchesLost || 0) + 1 };
                                                persistState({ ...state, statsByPlayer: nextStats });
                                            }}
                                            className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 cursor-pointer"
                                        >+</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Wurf- & Runden-Protokoll */}
            <div className="rounded-2xl border border-white/10 bg-card/40 overflow-hidden">
                <button
                    type="button"
                    onClick={() => setShowHistory(prev => !prev)}
                    className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-bold hover:bg-white/5 transition-colors cursor-pointer"
                >
                    <span className="flex items-center gap-2 text-muted-foreground">
                        <History className="h-4 w-4 text-primary" />
                        Wurf- &amp; Runden-Protokoll ({state.history?.length || 0} Züge • {state.completedMatches?.length || 0} Runden)
                    </span>
                    {showHistory ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>

                {showHistory && (
                    <div className="border-t border-white/10 p-4 space-y-4 max-h-80 overflow-y-auto">
                        {state.completedMatches && state.completedMatches.length > 0 && (
                            <div className="space-y-1.5">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Abgeschlossene Runden</div>
                                {state.completedMatches.slice().reverse().map((m, i) => (
                                    <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-xs">
                                        <span className="font-bold">Runde #{state.completedMatches.length - i}</span>
                                        <span className="text-muted-foreground">
                                            1. Hälfte: <strong className="text-foreground">{getPlayerName(m.half1LoserId)}</strong> • 2. Hälfte: <strong className="text-foreground">{getPlayerName(m.half2LoserId)}</strong>
                                        </span>
                                        <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold">
                                            Verlierer: {getPlayerName(m.finalLoserId)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Letzte Züge</div>
                            {(!state.history || state.history.length === 0) ? (
                                <p className="text-xs text-muted-foreground text-center py-3">Noch keine Züge protokolliert.</p>
                            ) : (
                                state.history.map((ev) => (
                                    <div key={ev.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/5 text-xs">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/10 text-muted-foreground shrink-0">
                                                {ev.phase === "half1" ? "1. H" : ev.phase === "half2" ? "2. H" : "Fin"}
                                            </span>
                                            <span className="font-bold text-amber-300 shrink-0">{ev.throwLabel}</span>
                                            <span className="text-muted-foreground truncate">
                                                {getPlayerName(ev.donorId || "stock")} &rarr; <strong className="text-foreground">{getPlayerName(ev.receiverId)}</strong>
                                            </span>
                                        </div>
                                        <span className="font-bold text-primary shrink-0">{ev.coasters} Deckel</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export const SchockenGamePlugin: GamePlugin<SchockenState> = {
    id: "schocken",
    title: "Schocken",
    shortTitle: "Schocken",
    subtitle: "13 Deckel im Besteck, Schock-Out, Jule (4-2-1), General, Straßen, Hälften & Finale.",
    badgeLabel: "Kneipen-Kult",
    accentColorHex: "#578d8e",
    RulesConfig: {
        defaultPenaltyEur: 1,
        maxPlayers: 12,
        minPlayers: 2,
        supportsGuests: true,
        customOptions: {
            stockCoasters: 13,
            juleEnabled: true,
            halfLossPenaltyEur: 1,
            finalLossPenaltyEur: 2,
        },
    },
    createInitialSessionState: (playerIds: string[], guests: GuestPlayer[]) => {
        const state = createInitialSchockenState(playerIds);
        return {
            memberSnapshot: playerIds.filter(id => !id.startsWith("guest_")),
            playerOrder: playerIds,
            guests,
            state,
        };
    },
    calculatePenalties: (session: UniversalGameSession<SchockenState>, members: Member[], ruleset?: ClubRulesetConfig): PenaltyProposal[] => {
        const rules = ruleset?.schocken ?? DEFAULT_CLUB_RULESET.schocken;
        const st = session.state;
        if (!st) return [];
        const proposals: PenaltyProposal[] = [];
        const mMap = new Map(members.map(m => [m.id, m]));
        const gMap = new Map((session.guests || []).map(g => [g.id, g]));

        for (const [pid, stats] of Object.entries(st.statsByPlayer || {})) {
            const amount = (stats.halvesLost || 0) * rules.halfLossPenaltyEur + (stats.matchesLost || 0) * rules.finalLossPenaltyEur;
            if (amount <= 0) continue;
            const m = mMap.get(pid);
            const g = gMap.get(pid);
            if (m) {
                proposals.push({
                    userId: m.id,
                    playerName: m.name,
                    amountEur: amount,
                    reason: `Schocken (${stats.halvesLost} Hälften, ${stats.matchesLost} Runden verloren)`,
                });
            } else if (g && g.hostMemberId) {
                proposals.push({
                    userId: g.hostMemberId,
                    playerName: g.name,
                    isGuest: true,
                    guestId: g.id,
                    amountEur: amount,
                    reason: `Schocken (${g.name})`,
                });
            }
        }
        return proposals;
    },
    determineRankings: (session: UniversalGameSession<SchockenState>, members: Member[], ruleset?: ClubRulesetConfig): RankingEntry[] => {
        const rules = ruleset?.schocken ?? DEFAULT_CLUB_RULESET.schocken;
        const st = session.state;
        const mMap = new Map(members.map(m => [m.id, m]));
        const gMap = new Map((session.guests || []).map(g => [g.id, g]));
        const playerIds = session.playerOrder || session.memberSnapshot || [];
        const playedMatches = (st?.completedMatches?.length || 0) > 0;

        const list = playerIds.map(pid => {
            const m = mMap.get(pid);
            const g = gMap.get(pid);
            const pStats = st?.statsByPlayer?.[pid];
            // Je weniger verlorene Runden/Hälften & aktuelle Deckel, desto höher der Rang
            const penaltyScore =
                (pStats?.matchesLost || 0) * 100 +
                (pStats?.halvesLost || 0) * 25 +
                (st?.coastersByPlayer?.[pid] || 0);
            return {
                memberId: pid,
                playerName: m?.name || g?.name || "Spieler",
                isGuest: !!g,
                value: Math.max(0, 500 - penaltyScore),
                schockOuts: pStats?.schockOutsThrown || 0,
                cleanSheet: playedMatches && (pStats?.halvesLost || 0) === 0 && (pStats?.matchesLost || 0) === 0,
            };
        }).sort((a, b) => b.value - a.value);

        const total = list.length;
        return assignRanks(list).map(item => {
            const placement = placementPoints(item.rank, total, rules.placementMode);
            const schockOutBonus = item.schockOuts * rules.schockOutMatrixBonusPoints;
            const cleanBonus = item.cleanSheet ? rules.cleanSheetMatrixBonusPoints : 0;
            return {
                memberId: item.memberId,
                playerName: item.playerName,
                isGuest: item.isGuest,
                rank: item.rank,
                scoreOrMetric: item.value,
                matrixPoints: item.isGuest ? 0 : placement + schockOutBonus + cleanBonus,
                breakdown: { placement, schockOut: schockOutBonus, cleanSheet: cleanBonus },
            };
        });
    },
    ScorecardComponent: SchockenScorecard,
};
