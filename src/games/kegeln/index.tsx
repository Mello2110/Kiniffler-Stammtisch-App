"use client";

/**
 * PHASE 4: KEGELN GAME ENGINE & INTERACTIVE 9-PIN TOUCH SCORECARD
 * ===============================================================
 * Vollwertige Umsetzung für Kegelclubs & Stammtische:
 * - Grafische 9-Kegel-Raute (Touch-Steuerung: Einzelne Kegel antippen + Schnellwahltasten für Pudel, Kranz, Alle Neune)
 * - Disziplinen: Volle, Abräumen, Kombiniert (30 Wurf / frei erweiterbar)
 * - Automatische Erkennung von:
 *   - "Alle Neune" (alle 9 Kegel gefallen)
 *   - "Kranz / Lochkranz" (alle 8 äußeren Kegel gefallen, nur König Pin #5 in der Mitte steht!)
 *   - "Pudel / Rinne" (0 Kegel getroffen -> Pudelkasse + Pudelkönig-Wertung)
 *   - "Klingel / Stille" (optionaler Strafkatalog-Quick-Trigger)
 * - Direkte Buchung in die Pudel-/Strafkasse & Übertrag in die Saison-Matrix
 */

import React, { useState, useMemo } from "react";
import { doc, setDoc, updateDoc, addDoc, getDoc, serverTimestamp, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useClub } from "@/contexts/ClubContext";
import { triggerHaptic } from "@/lib/haptics";
import { Toast, useToast } from "@/components/common/Toast";
import {
    Target,
    Trophy,
    Crown,
    AlertTriangle,
    RotateCcw,
    Sparkles,
    PlusCircle,
    Coins
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DEFAULT_CLUB_RULESET } from "@/lib/defaultRuleset";
import { pointDocId, placementPoints, assignRanks } from "@/lib/seasonPoints";
import type { GamePlugin, PenaltyProposal, RankingEntry, ScorecardComponentProps, UniversalGameSession } from "@/games/types";
import type { ClubRulesetConfig, GuestPlayer, Member } from "@/types";

export type KegelnMode = "volle" | "abraeumen" | "kombi";

export interface KegelnThrowEntry {
    id: string;
    timestamp: number;
    playerId: string;
    roundNumber: number;
    mode: KegelnMode;
    fallenPins: number[]; // Pins 1..9
    woodCount: number;    // 0..9
    isPudel: boolean;     // 0 Holz
    isAlleNeune: boolean; // 9 Holz
    isKranz: boolean;     // 8 Holz und König (#5) steht noch
}

export interface KegelnPlayerStats {
    totalWood: number;
    throwsCount: number;
    pudelCount: number;
    neunerCount: number;
    kranzCount: number;
    volleWood: number;
    abraeumenWood: number;
}

export interface KegelnState {
    mode: KegelnMode;
    pudelPenaltyEur: number; // Standard: 0.50 € oder 1.00 € pro Pudel
    activePlayerId: string;
    currentRound: number;
    // Welche Kegel stehen aktuell auf der Bahn (für Abräumen relevant, bei Volle nach jedem Wurf wieder 1..9)
    standingPins: number[];
    statsByPlayer: Record<string, KegelnPlayerStats>;
    throwsHistory: KegelnThrowEntry[];
}

const ALL_NINE_PINS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * 9-Kegel-Raute Layout (von hinten nach vorne aus Sicht des Keglers):
 * Zeile 1:        [9] (Hinterster Kegel)
 * Zeile 2:    [7]     [8]
 * Zeile 3: [4]    [5]    [6]   (#5 = König in der Mitte!)
 * Zeile 4:    [2]     [3]
 * Zeile 5:        [1] (Vorderkegel / Erster Bauer)
 */
const PIN_DIAMOND_ROWS: number[][] = [
    [9],
    [7, 8],
    [4, 5, 6],
    [2, 3],
    [1],
];

export function createInitialKegelnState(playerIds: string[], pudelPenaltyEur: number = 0.5): KegelnState {
    const statsByPlayer: Record<string, KegelnPlayerStats> = {};
    for (const pid of playerIds) {
        statsByPlayer[pid] = {
            totalWood: 0,
            throwsCount: 0,
            pudelCount: 0,
            neunerCount: 0,
            kranzCount: 0,
            volleWood: 0,
            abraeumenWood: 0,
        };
    }
    return {
        mode: "volle",
        pudelPenaltyEur,
        activePlayerId: playerIds[0] || "",
        currentRound: 1,
        standingPins: [...ALL_NINE_PINS],
        statsByPlayer,
        throwsHistory: [],
    };
}

function KegelnScorecard({ session, members, isFullscreen }: ScorecardComponentProps<KegelnState>) {
    const { clubId, club, clubCollection, clubDoc } = useClub();
    const rules = club?.ruleset?.kegeln ?? DEFAULT_CLUB_RULESET.kegeln;
    const { toast, showToast, hideToast } = useToast();

    const orderedPlayerIds = useMemo(
        () => session.playerOrder || session.memberSnapshot || [],
        [session.playerOrder, session.memberSnapshot]
    );

    const [state, setState] = useState<KegelnState>(() => {
        return session.state || createInitialKegelnState(orderedPlayerIds, rules.pudelPenaltyEur);
    });

    // Aktuell vor dem Wurf-Speichern vom Nutzer als "gefallen" markierte Kegel
    const [selectedFallenPins, setSelectedFallenPins] = useState<number[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    const players = useMemo(() => {
        const mMap = new Map(members.map(m => [m.id, m]));
        const gMap = new Map((session.guests || []).map(g => [g.id, g]));
        return orderedPlayerIds.map(id => {
            const m = mMap.get(id);
            const g = gMap.get(id);
            return {
                id,
                name: m?.name || g?.name || "Kegler",
                isGuest: !!g,
                hostMemberId: g?.hostMemberId,
            };
        });
    }, [orderedPlayerIds, members, session.guests]);

    const persistState = async (nextState: KegelnState) => {
        setState(nextState);
        setIsSaving(true);
        try {
            await updateDoc(clubDoc("gameSessions", session.id), {
                state: nextState,
            });
        } catch (err) {
            console.error("Error saving Kegeln state:", err);
        } finally {
            setIsSaving(false);
        }
    };

    const bookKegelPenalty = async (playerId: string, amountEur: number, reason: string) => {
        const p = players.find(pl => pl.id === playerId);
        if (!p) return;
        const targetUid = p.isGuest ? p.hostMemberId : p.id;
        if (!targetUid) return;

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
                description: `Kegeln: ${finalReason}`,
                date: dateStr,
                createdAt: serverTimestamp(),
                linkedDocId: penRef.id,
            };
            await addDoc(clubCollection("ledger_entries"), ledgerPayload);

            if (clubId === "club_original") {
                await setDoc(doc(db, "penalties", penRef.id), penPayload).catch(() => {});
                await addDoc(collection(db, "ledger_entries"), ledgerPayload).catch(() => {});
            }

            showToast(`✓ ${amountEur.toFixed(2)}€ Pudelkasse: ${p.name} (${reason})`);
        } catch (err) {
            console.error("Error booking Kegeln penalty:", err);
        }
    };

    const togglePinSelection = (pinNumber: number) => {
        if (!state.standingPins.includes(pinNumber)) return; // Bereits in vorherigem Abräum-Wurf gefallen
        triggerHaptic("tap");
        setSelectedFallenPins(prev =>
            prev.includes(pinNumber)
                ? prev.filter(p => p !== pinNumber)
                : [...prev, pinNumber]
        );
    };

    const handleRecordThrow = async (overrideFallenPins?: number[]) => {
        const activeId = state.activePlayerId || orderedPlayerIds[0];
        if (!activeId) return;

        const fallen = (overrideFallenPins ?? selectedFallenPins).filter(p => state.standingPins.includes(p));
        const woodCount = fallen.length;
        const isPudel = woodCount === 0;

        // Prüfe auf Alle Neune oder Kranz (8 äußere gefallen, nur König #5 steht)
        const remainingAfterThrow = state.standingPins.filter(p => !fallen.includes(p));
        const isAlleNeune = remainingAfterThrow.length === 0 && state.standingPins.length === 9;
        const isKranz = remainingAfterThrow.length === 1 && remainingAfterThrow[0] === 5 && state.standingPins.length === 9;

        if (isPudel) {
            triggerHaptic("penalty");
        } else if (isAlleNeune || isKranz) {
            triggerHaptic("specialThrow");
        } else {
            triggerHaptic("diceRoll");
        }

        const prevStats = state.statsByPlayer[activeId] || {
            totalWood: 0,
            throwsCount: 0,
            pudelCount: 0,
            neunerCount: 0,
            kranzCount: 0,
            volleWood: 0,
            abraeumenWood: 0,
        };

        const updatedPlayerStats: KegelnPlayerStats = {
            totalWood: prevStats.totalWood + woodCount,
            throwsCount: prevStats.throwsCount + 1,
            pudelCount: prevStats.pudelCount + (isPudel ? 1 : 0),
            neunerCount: prevStats.neunerCount + (isAlleNeune ? 1 : 0),
            kranzCount: prevStats.kranzCount + (isKranz ? 1 : 0),
            volleWood: prevStats.volleWood + (state.mode === "volle" ? woodCount : 0),
            abraeumenWood: prevStats.abraeumenWood + (state.mode === "abraeumen" ? woodCount : 0),
        };

        // Bestimme nächstes Kegelbild & nächsten Spieler
        let nextStandingPins = [...ALL_NINE_PINS];
        let nextActivePlayerId = activeId;
        let nextRound = state.currentRound;

        const currentIndex = orderedPlayerIds.indexOf(activeId);
        const advancePlayer = () => {
            const nextIdx = (currentIndex + 1) % orderedPlayerIds.length;
            nextActivePlayerId = orderedPlayerIds[nextIdx];
            if (nextIdx === 0) nextRound += 1;
        };

        if (state.mode === "abraeumen") {
            if (remainingAfterThrow.length === 0) {
                // Abgeräumt! Neues volles Bild und nächster Spieler
                nextStandingPins = [...ALL_NINE_PINS];
                advancePlayer();
            } else {
                // Noch Kegel übrig zum Abräumen
                nextStandingPins = remainingAfterThrow;
            }
        } else {
            // Volle: Nach jedem Wurf volles Bild und nächster Spieler
            nextStandingPins = [...ALL_NINE_PINS];
            advancePlayer();
        }

        const newThrow: KegelnThrowEntry = {
            id: `throw_${Date.now()}`,
            timestamp: Date.now(),
            playerId: activeId,
            roundNumber: state.currentRound,
            mode: state.mode,
            fallenPins: fallen,
            woodCount,
            isPudel,
            isAlleNeune,
            isKranz,
        };

        const nextState: KegelnState = {
            ...state,
            activePlayerId: nextActivePlayerId,
            currentRound: nextRound,
            standingPins: nextStandingPins,
            statsByPlayer: {
                ...state.statsByPlayer,
                [activeId]: updatedPlayerStats,
            },
            throwsHistory: [newThrow, ...(state.throwsHistory || []).slice(0, 39)],
        };

        setSelectedFallenPins([]);
        await persistState(nextState);

        if (isPudel && rules.autoBookPudelPenalty && rules.pudelPenaltyEur > 0) {
            await bookKegelPenalty(activeId, rules.pudelPenaltyEur, "Pudel (Rinne / 0 Holz)");
        } else if (isAlleNeune) {
            showToast(`🔥 ALLE NEUNE von ${players.find(p => p.id === activeId)?.name}!`);
        } else if (isKranz) {
            showToast(`👑 KRANZ (König steht!) von ${players.find(p => p.id === activeId)?.name}!`);
        }
    };

    // Ermittle aktuellen Pudelkönig (meiste Pudel > 0)
    const pudelKingId = useMemo(() => {
        let maxPudel = 0;
        let king: string | null = null;
        for (const [pid, st] of Object.entries(state.statsByPlayer || {})) {
            if ((st.pudelCount || 0) > maxPudel) {
                maxPudel = st.pudelCount;
                king = pid;
            }
        }
        return king;
    }, [state.statsByPlayer]);

    const handleTransferToMatrix = async () => {
        try {
            const rankings = KegelnGamePlugin.determineRankings({ ...session, state }, members, club?.ruleset);
            for (const r of rankings) {
                if (r.isGuest) continue;
                const compositeId = pointDocId(r.memberId, session.year, session.month, "kegeln");
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
                    gameType: "kegeln",
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
            showToast("✓ Kegel-Ergebnis in die Saison-Matrix übertragen!");
        } catch (err) {
            console.error("Error transferring Kegeln points:", err);
        }
    };

    const activePlayer = players.find(p => p.id === state.activePlayerId) || players[0];

    return (
        <div className="space-y-6">
            <Toast message={toast.message} isVisible={toast.visible} onClose={hideToast} />

            {/* Top Layout: Grafisches 9-Kegel-Touchpad links + Aktiver Werfer & Schnellwahl rechts */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* 1. Grafische 9-Kegel-Raute (Touch-Interaktiv) */}
                <div className="lg:col-span-5 rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-emerald-500/10 via-background to-background p-6 flex flex-col items-center justify-between">
                    <div className="w-full flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                            <Target className="h-4 w-4" />
                            9-Kegel Touch-Bahn
                        </span>
                        <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1">
                            {([
                                { id: "volle", label: "In die Vollen" },
                                { id: "abraeumen", label: "Abräumen" },
                            ] as const).map(m => (
                                <button
                                    key={m.id}
                                    onClick={() => persistState({
                                        ...state,
                                        mode: m.id,
                                        standingPins: [...ALL_NINE_PINS],
                                    })}
                                    className={cn(
                                        "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                        state.mode === m.id
                                            ? "bg-emerald-500 text-slate-950"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {m.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <p className="text-xs text-muted-foreground text-center mb-4">
                        Tippe die <span className="text-emerald-400 font-semibold">gefallenen Kegel</span> an oder nutze die Schnellwahl-Buttons:
                    </p>

                    {/* 9-Pin Diamond Representation */}
                    <div className="flex flex-col items-center gap-3 my-2 select-none">
                        {PIN_DIAMOND_ROWS.map((row, rIdx) => (
                            <div key={rIdx} className="flex items-center justify-center gap-6">
                                {row.map(pinNum => {
                                    const isStanding = state.standingPins.includes(pinNum);
                                    const isMarkedFallen = selectedFallenPins.includes(pinNum);
                                    const isKing = pinNum === 5;

                                    return (
                                        <button
                                            key={pinNum}
                                            disabled={!isStanding}
                                            onClick={() => togglePinSelection(pinNum)}
                                            className={cn(
                                                "relative w-12 h-12 rounded-full font-black text-sm flex items-center justify-center transition-all duration-200 border-2 cursor-pointer",
                                                !isStanding
                                                    ? "bg-white/5 border-white/5 text-white/20 scale-90 cursor-not-allowed"
                                                    : isMarkedFallen
                                                        ? "bg-emerald-500 border-emerald-300 text-slate-950 scale-105 shadow-[0_0_20px_rgba(16,185,129,0.5)]"
                                                        : isKing
                                                            ? "bg-amber-500/20 border-amber-400 text-amber-300 hover:bg-amber-500/30"
                                                            : "bg-secondary border-white/20 text-foreground hover:border-emerald-400/60"
                                            )}
                                        >
                                            {pinNum}
                                            {isKing && (
                                                <Crown className="absolute -top-2.5 -right-1 h-4 w-4 text-amber-400 fill-amber-400" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
                    </div>

                    <div className="w-full flex items-center justify-between mt-4 pt-3 border-t border-white/10 text-xs">
                        <span className="text-muted-foreground">
                            Ausgewählt: <strong className="text-emerald-400 text-sm">{selectedFallenPins.length} Holz</strong>
                        </span>
                        <button
                            onClick={() => setSelectedFallenPins([])}
                            className="text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                        >
                            <RotateCcw className="h-3.5 w-3.5" /> Auswahl leeren
                        </button>
                    </div>
                </div>

                {/* 2. Aktiver Kegler, Schnellwahl (0..9, Pudel, Kranz, Alle 9) & Pudelkasse */}
                <div className="lg:col-span-7 rounded-3xl border border-white/10 bg-card/60 p-6 flex flex-col justify-between space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Durchgang #{state.currentRound} • Am Wurf:
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                                <select
                                    value={activePlayer?.id || ""}
                                    onChange={e => persistState({ ...state, activePlayerId: e.target.value })}
                                    className="text-xl font-black outfit bg-background border border-primary/30 rounded-xl px-4 py-2 text-primary"
                                >
                                    {players.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleTransferToMatrix}
                                className="h-9 px-3 text-xs font-semibold rounded-xl flex items-center gap-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 transition-colors cursor-pointer"
                            >
                                <Trophy className="h-4 w-4" />
                                In Saison-Matrix übertragen
                            </button>
                        </div>
                    </div>

                    {/* Schnellwahl-Holz-Tasten (0 = Pudel bis 9 = Alle Neune + Kranz) */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Schnell-Eingabe (Direkt-Wurf verbuchen):
                        </label>
                        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(count => (
                                <button
                                    key={count}
                                    onClick={() => {
                                        const available = state.standingPins.slice(0, count);
                                        handleRecordThrow(available);
                                    }}
                                    className={cn(
                                        "py-3 rounded-xl font-black text-base border transition-all cursor-pointer",
                                        count === 0
                                            ? "bg-red-500/15 border-red-500/40 text-red-400 hover:bg-red-500/25"
                                            : count === 9
                                                ? "bg-amber-500/20 border-amber-400 text-amber-300 hover:bg-amber-500/30"
                                                : "bg-background border-white/10 hover:border-emerald-400/50 hover:bg-emerald-500/10"
                                    )}
                                >
                                    {count}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Spezial-Würfe & Strafkatalog */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <button
                            onClick={() => handleRecordThrow([])}
                            className="p-3 rounded-2xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                        >
                            <AlertTriangle className="h-4 w-4" />
                            Pudel / Rinne (0 Holz • {rules.pudelPenaltyEur.toFixed(2)}€)
                        </button>

                        <button
                            onClick={() => handleRecordThrow([1, 2, 3, 4, 6, 7, 8, 9])}
                            className="p-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                        >
                            <Crown className="h-4 w-4" />
                            Kranz! (8 äußere • König #5 steht)
                        </button>

                        <button
                            onClick={() => handleRecordThrow([...ALL_NINE_PINS])}
                            className="p-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                        >
                            <Sparkles className="h-4 w-4" />
                            Alle Neune! (9 Holz)
                        </button>
                    </div>

                    {/* Primärer Button zum Speichern der auf der Raute markierten Kegel */}
                    <button
                        onClick={() => handleRecordThrow()}
                        disabled={isSaving}
                        className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                    >
                        Markierten Wurf eintragen ({selectedFallenPins.length} Holz für {activePlayer?.name})
                    </button>
                </div>
            </div>

            {/* Kegel-Rangliste & Pudelkönig-Tabelle */}
            <div className="rounded-3xl border border-white/10 bg-card/50 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr>
                                <th className="px-4 py-3 text-left">Kegler</th>
                                <th className="px-4 py-3 text-center">Würfe</th>
                                <th className="px-4 py-3 text-center">Volle</th>
                                <th className="px-4 py-3 text-center">Abräumen</th>
                                <th className="px-4 py-3 text-center">Alle 9 / Kranz</th>
                                <th className="px-4 py-3 text-center">Pudel (Rinne)</th>
                                <th className="px-4 py-3 text-right">Gesamt-Holz</th>
                            </tr>
                        </thead>
                        <tbody>
                            {players.map(p => {
                                const st = state.statsByPlayer[p.id] || {
                                    totalWood: 0,
                                    throwsCount: 0,
                                    pudelCount: 0,
                                    neunerCount: 0,
                                    kranzCount: 0,
                                    volleWood: 0,
                                    abraeumenWood: 0,
                                };
                                const isPudelKing = pudelKingId === p.id && st.pudelCount > 0;
                                const isActive = state.activePlayerId === p.id;

                                return (
                                    <tr
                                        key={p.id}
                                        onClick={() => persistState({ ...state, activePlayerId: p.id })}
                                        className={cn(
                                            "cursor-pointer transition-colors",
                                            isActive && "bg-emerald-500/10"
                                        )}
                                    >
                                        <td className="px-4 py-3 font-bold flex items-center gap-2">
                                            <span>{p.name}</span>
                                            {isPudelKing && (
                                                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 font-bold">
                                                    🐩 Pudelkönig
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">{st.throwsCount}</td>
                                        <td className="px-4 py-3 text-center">{st.volleWood}</td>
                                        <td className="px-4 py-3 text-center">{st.abraeumenWood}</td>
                                        <td className="px-4 py-3 text-center font-semibold text-amber-400">
                                            {st.neunerCount}x 9er / {st.kranzCount}x 👑
                                        </td>
                                        <td className="px-4 py-3 text-center font-semibold text-red-400">
                                            {st.pudelCount}
                                        </td>
                                        <td className="px-4 py-3 text-right font-black text-lg text-emerald-400 outfit">
                                            {st.totalWood}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export const KegelnGamePlugin: GamePlugin<KegelnState> = {
    id: "kegeln",
    title: "Kegeln",
    shortTitle: "Kegeln",
    subtitle: "Grafische 9-Kegel-Raute, Volle & Abräumen, Alle Neune, Kranz & Pudelkönig-Automatik.",
    badgeLabel: "9-Kegel Bahn",
    accentColorHex: "#10B981",
    RulesConfig: {
        defaultPenaltyEur: 0.5,
        maxPlayers: 16,
        minPlayers: 2,
        supportsGuests: true,
        customOptions: {
            pudelPenaltyEur: 0.5,
            pudelKingPenaltyEur: 2.0,
        },
    },
    createInitialSessionState: (playerIds: string[], guests: GuestPlayer[]) => {
        const state = createInitialKegelnState(playerIds);
        return {
            memberSnapshot: playerIds.filter(id => !id.startsWith("guest_")),
            playerOrder: playerIds,
            guests,
            state,
        };
    },
    calculatePenalties: (session: UniversalGameSession<KegelnState>, members: Member[], ruleset?: ClubRulesetConfig): PenaltyProposal[] => {
        const rules = ruleset?.kegeln ?? DEFAULT_CLUB_RULESET.kegeln;
        const st = session.state;
        if (!st) return [];
        const proposals: PenaltyProposal[] = [];
        const mMap = new Map(members.map(m => [m.id, m]));
        const gMap = new Map((session.guests || []).map(g => [g.id, g]));

        let kingId: string | null = null;
        let maxPudel = 0;
        for (const [pid, s] of Object.entries(st.statsByPlayer || {})) {
            if ((s.pudelCount || 0) > maxPudel) { maxPudel = s.pudelCount; kingId = pid; }
        }

        for (const [pid, pStats] of Object.entries(st.statsByPlayer || {})) {
            const pudelAmount = rules.autoBookPudelPenalty ? 0 : (pStats.pudelCount || 0) * rules.pudelPenaltyEur;
            const kingAmount = pid === kingId && maxPudel > 0 ? rules.pudelKingPenaltyEur : 0;
            const amount = pudelAmount + kingAmount;
            if (amount <= 0) continue;
            const reason = [
                pudelAmount > 0 ? `${pStats.pudelCount}x Pudel` : "",
                kingAmount > 0 ? "Pudelkönig" : "",
            ].filter(Boolean).join(" + ") + " (Kegeln)";
            const m = mMap.get(pid);
            const g = gMap.get(pid);
            if (m) {
                proposals.push({ userId: m.id, playerName: m.name, amountEur: amount, reason });
            } else if (g && g.hostMemberId) {
                proposals.push({ userId: g.hostMemberId, playerName: g.name, isGuest: true, guestId: g.id, amountEur: amount, reason: `${reason} (${g.name})` });
            }
        }
        return proposals;
    },
    determineRankings: (session: UniversalGameSession<KegelnState>, members: Member[], ruleset?: ClubRulesetConfig): RankingEntry[] => {
        const rules = ruleset?.kegeln ?? DEFAULT_CLUB_RULESET.kegeln;
        const st = session.state;
        const mMap = new Map(members.map(m => [m.id, m]));
        const gMap = new Map((session.guests || []).map(g => [g.id, g]));
        const playerIds = session.playerOrder || session.memberSnapshot || [];

        const list = playerIds.map(pid => {
            const m = mMap.get(pid);
            const g = gMap.get(pid);
            const pStats = st?.statsByPlayer?.[pid];
            return {
                memberId: pid,
                playerName: m?.name || g?.name || "Kegler",
                isGuest: !!g,
                value: pStats?.totalWood || 0,
                neuner: pStats?.neunerCount || 0,
                kranz: pStats?.kranzCount || 0,
            };
        }).sort((a, b) => b.value - a.value);

        const total = list.length;
        return assignRanks(list).map(item => {
            const placement = placementPoints(item.rank, total, rules.placementMode);
            const neunerBonus = item.neuner * rules.alleNeuneMatrixBonusPoints;
            const kranzBonus = item.kranz * rules.kranzMatrixBonusPoints;
            return {
                memberId: item.memberId,
                playerName: item.playerName,
                isGuest: item.isGuest,
                rank: item.rank,
                scoreOrMetric: item.value,
                matrixPoints: item.isGuest ? 0 : placement + neunerBonus + kranzBonus,
                breakdown: { placement, alleNeune: neunerBonus, kranz: kranzBonus },
            };
        });
    },
    ScorecardComponent: KegelnScorecard,
};
