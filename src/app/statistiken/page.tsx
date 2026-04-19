"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Member, KniffelSheet, TokenTransaction } from "@/types";
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    Legend, ResponsiveContainer, Cell
} from "recharts";
import {
    BarChart3, Trophy, Swords, Users, Minus, Dice5, TrendingUp,
    Filter, ChevronUp, ChevronDown, ChevronsUpDown, Sparkles, Star, Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

type GameFilter = "all" | "ranked" | "unranked";
type SeasonFilter = "current" | "all" | number; // number = specific year
type SortKey = "name" | "participations" | "wins" | "avgScore" | "strokes" | "kniffels" | "highscore" | "bonusPoints";
type SortDir = "asc" | "desc";
// chartMetric: which column to bar-chart, or 'scores_over_time' for line chart
type ChartMetric = "participations" | "wins" | "avgScore" | "strokes" | "kniffels" | "highscore" | "bonusPoints" | "scores_over_time";

interface PlayerStats {
    id: string;
    name: string;
    participations: number;
    wins: number;
    avgScore: number;
    strokes: number;
    kniffels: number;
    highscore: number;
    bonusPoints: number; // sum of: upper bonus (35) + fixed-value fields per game
    scoreHistory: { label: string; score: number }[];
}

// ─── Score helpers (mirrors KniffelScorecard exactly) ───────────────────────

const UPPER_FIELDS = ["ones", "twos", "threes", "fours", "fives", "sixes"];
const getNum = (v: any): number => (typeof v === "number" ? v : 0);

const calcTotal = (scoreObj: any): number => {
    const upper = UPPER_FIELDS.reduce((s, f) => s + getNum(scoreObj[f]), 0);
    const bonus = upper >= 63 ? 35 : 0;
    const lower = Object.entries(scoreObj)
        .filter(([k]) => !UPPER_FIELDS.includes(k))
        .reduce((s, [, v]) => s + getNum(v), 0);
    return upper + bonus + lower;
};

/**
 * Saison-Matrixbonuspunkte für einen Spieler in einem Spiel.
 * Spiegelt die handleTransferPoints-Logik exakt wider:
 *   +1 wenn Spieler einen Kniffel gewürfelt hat (kniffel > 0)
 *   +1 wenn Spieler die höchste Chance als Erster eingetragen hat (via chanceTimestamps)
 *   +1 wenn Spieler die niedrigste Chance als Erster eingetragen hat (via chanceTimestamps)
 */
const calcMatrixBonusPoints = (
    uid: string,
    scoreObj: any,
    allScores: Record<string, any>,
    chanceTimestamps: Record<string, number>
): number => {
    let bonus = 0;

    // +1 für Kniffel
    if (typeof scoreObj.kniffel === "number" && scoreObj.kniffel > 0) bonus += 1;

    // Chance-Bonus: alle numerischen Chance-Werte sammeln
    const chanceEntries: { uid: string; value: number; ts: number }[] = [];
    Object.entries(allScores).forEach(([pid, sc]) => {
        const cv = (sc as any)?.chance;
        if (typeof cv === "number") {
            chanceEntries.push({ uid: pid, value: cv, ts: chanceTimestamps[pid] ?? Infinity });
        }
    });

    if (chanceEntries.length > 1) {
        const myChance = typeof scoreObj.chance === "number" ? scoreObj.chance : null;
        if (myChance !== null) {
            const values = chanceEntries.map(e => e.value);
            const maxV = Math.max(...values);
            const minV = Math.min(...values);

            // +1 für höchste Chance (erster bei Gleichstand)
            if (myChance === maxV) {
                const tied = chanceEntries.filter(e => e.value === maxV);
                const earliest = tied.reduce((a, b) => a.ts <= b.ts ? a : b);
                if (earliest.uid === uid) bonus += 1;
            }

            // +1 für niedrigste Chance (erster bei Gleichstand)
            if (myChance === minV) {
                const tied = chanceEntries.filter(e => e.value === minV);
                const earliest = tied.reduce((a, b) => a.ts <= b.ts ? a : b);
                if (earliest.uid === uid) bonus += 1;
            }
        }
    }

    return bonus;
};

// ─── Chart Color Palette ─────────────────────────────────────────────────────

const COLORS = ["#7C3AED", "#00BCD4", "#FF9800", "#C62828", "#1A5C2E", "#D4A017", "#EC4899", "#6B7280"];

// ─── Sheet year helper ───────────────────────────────────────────────────────

const getSheetYear = (sheet: KniffelSheet): number => {
    // Prefer createdAt Firestore Timestamp; fall back to month field or current year
    if ((sheet as any).createdAt?.seconds) {
        return new Date((sheet as any).createdAt.seconds * 1000).getFullYear();
    }
    if (typeof (sheet as any).month === "string") {
        const m = parseInt((sheet as any).month.split("-")[0]);
        if (!isNaN(m) && m > 2000) return m;
    }
    return new Date().getFullYear();
};

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function StatistikenPage() {
    const [members, setMembers] = useState<Member[]>([]);
    const [sheets, setSheets] = useState<KniffelSheet[]>([]);
    const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());
    const [tokenTransactions, setTokenTransactions] = useState<TokenTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const currentYear = new Date().getFullYear();
    const [seasonFilter, setSeasonFilter] = useState<SeasonFilter>("current");
    const [gameFilter, setGameFilter] = useState<GameFilter>("all");
    const [chartMetric, setChartMetric] = useState<ChartMetric>("scores_over_time");
    const [sortKey, setSortKey] = useState<SortKey>("participations");
    const [sortDir, setSortDir] = useState<SortDir>("desc");
    const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());

    useEffect(() => {
        (async () => {
            try {
                const [memSnap, sheetSnap, pointSnap] = await Promise.all([
                    getDocs(collection(db, "members")),
                    getDocs(collection(db, "kniffelSheets")),
                    getDocs(collection(db, "points")),
                ]);

                const fetchedMembers = memSnap.docs.map(d => ({ id: d.id, ...d.data() } as Member));
                const fetchedSheets = sheetSnap.docs.map(d => ({ id: d.id, ...d.data() } as KniffelSheet));

                const ids = new Set<string>();
                pointSnap.docs.forEach(d => {
                    const contribs = d.data().sheetContributions;
                    if (contribs) Object.keys(contribs).forEach(id => ids.add(id));
                });

                setMembers(fetchedMembers);
                setSheets(fetchedSheets);
                setSubmittedIds(ids);
                setSelectedPlayers(new Set(fetchedMembers.map(m => m.id)));

                // Fetch Token Transactions
                const transSnap = await getDocs(query(collection(db, "tokenTransactions"), orderBy("timestamp", "desc")));
                setTokenTransactions(transSnap.docs.map(d => {
                    const data = d.data();
                    return {
                        ...data,
                        timestamp: data.timestamp
                    } as TokenTransaction;
                }));
            } catch (err) {
                console.error("Error fetching stats data", err);
            } finally {
                setIsLoading(false);
            }
        })();
    }, []);

    // Available years from sheet data
    const availableYears = useMemo(() => {
        const years = new Set<number>();
        sheets.forEach(s => years.add(getSheetYear(s)));
        return Array.from(years).sort((a, b) => b - a);
    }, [sheets]);

    // Apply season filter then game filter
    const filteredSheets = useMemo(() => {
        return sheets.filter(s => {
            // Season filter
            const year = getSheetYear(s);
            if (seasonFilter === "current" && year !== currentYear) return false;
            if (typeof seasonFilter === "number" && year !== seasonFilter) return false;
            // Game filter
            const isRanked = s.isSubmitted || submittedIds.has(s.id) || s.isSubmitted === undefined;
            if (gameFilter === "ranked") return isRanked;
            if (gameFilter === "unranked") return !isRanked;
            return true;
        });
    }, [sheets, submittedIds, seasonFilter, gameFilter, currentYear]);

    // Compute per-player stats
    const playerStats = useMemo<PlayerStats[]>(() => {
        const memberMap = new Map(members.map(m => [m.id, m]));

        const stats: Record<string, PlayerStats> = {};
        members.forEach(m => {
            stats[m.id] = {
                id: m.id, name: m.name,
                participations: 0, wins: 0, avgScore: 0,
                strokes: 0, kniffels: 0, highscore: 0, bonusPoints: 0,
                scoreHistory: [],
            };
        });

        const sortedSheets = [...filteredSheets].sort((a, b) => {
            return ((a as any).createdAt?.seconds ?? 0) - ((b as any).createdAt?.seconds ?? 0);
        });

        sortedSheets.forEach((sheet, idx) => {
            if (!sheet.scores) return;
            const label = `Spiel ${idx + 1}`;
            let maxScore = -1;
            let winners: string[] = [];

            Object.entries(sheet.scores).forEach(([uid, scoreObj]) => {
                if (!memberMap.has(uid)) return;
                const s = stats[uid];
                if (!s) return;

                s.participations++;
                const total = calcTotal(scoreObj);
                s.scoreHistory.push({ label, score: total });
                if (total > s.highscore) s.highscore = total;

                // Strokes
                Object.values(scoreObj).forEach((v: any) => {
                    if (v === "stroke") s.strokes++;
                });

                // Kniffel count
                if (typeof scoreObj.kniffel === "number" && scoreObj.kniffel > 0) {
                    s.kniffels++;
                }

                // Saison-Matrixbonuspunkte (Kniffel +1, höchste Chance +1, niedrigste Chance +1)
                const chanceTimestamps: Record<string, number> = (sheet as any).chanceTimestamps ?? {};
                s.bonusPoints += calcMatrixBonusPoints(uid, scoreObj, sheet.scores!, chanceTimestamps);

                // Winner tracking
                if (total > maxScore) { maxScore = total; winners = [uid]; }
                else if (total === maxScore) { winners.push(uid); }
            });

            winners.forEach(uid => { if (stats[uid]) stats[uid].wins++; });
        });

        Object.values(stats).forEach(s => {
            const scores = s.scoreHistory.map(h => h.score);
            s.avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        });

        return Object.values(stats).filter(s => s.participations > 0);
    }, [filteredSheets, members]);

    // Sort table
    const sortedStats = useMemo(() => {
        return [...playerStats].sort((a, b) => {
            const va = a[sortKey] as any;
            const vb = b[sortKey] as any;
            const cmp = typeof va === "string" ? va.localeCompare(vb) : (vb - va);
            return sortDir === "asc" ? -cmp : cmp;
        });
    }, [playerStats, sortKey, sortDir]);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
        else { setSortKey(key); setSortDir("desc"); }
    };

    const SortIcon = ({ k }: { k: SortKey }) => {
        if (sortKey !== k) return <ChevronsUpDown className="h-3 w-3 text-muted-foreground/50" />;
        return sortDir === "desc"
            ? <ChevronDown className="h-3 w-3 text-primary" />
            : <ChevronUp className="h-3 w-3 text-primary" />;
    };

    // Chart data
    const chartData = useMemo(() => {
        const filtered = playerStats.filter(p => selectedPlayers.has(p.id));

        if (chartMetric === "scores_over_time") {
            // Line chart: one entry per game, one line per player
            const allLabels = new Set<string>();
            playerStats.forEach(p => p.scoreHistory.forEach(h => allLabels.add(h.label)));
            return Array.from(allLabels).map(label => {
                const point: any = { label };
                filtered.forEach(p => {
                    const entry = p.scoreHistory.find(h => h.label === label);
                    if (entry) point[p.name] = entry.score;
                });
                return point;
            });
        }

        // Bar chart for any other metric
        return filtered.map(p => ({
            name: p.name,
            value: p[chartMetric as keyof PlayerStats] as number,
        }));
    }, [chartMetric, playerStats, selectedPlayers]);

    const togglePlayer = (id: string) => {
        setSelectedPlayers(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    if (isLoading) return (
        <div className="p-10 text-center animate-pulse text-muted-foreground">
            Lade Statistiken...
        </div>
    );

    // ─── Config arrays ───────────────────────────────────────────────────────

    const GAME_FILTERS: { label: string; value: GameFilter }[] = [
        { label: "Alle Spiele", value: "all" },
        { label: "Nur gewertete", value: "ranked" },
        { label: "Nur ungewertete", value: "unranked" },
    ];

    const COL_HEADERS: { label: string; key: SortKey; color?: string }[] = [
        { label: "Spieler", key: "name" },
        { label: "Teilnahmen", key: "participations" },
        { label: "Siege", key: "wins", color: "text-primary" },
        { label: "Ø Punkte", key: "avgScore" },
        { label: "Highscore", key: "highscore", color: "text-orange-400" },
        { label: "Bonuspunkte", key: "bonusPoints", color: "text-yellow-400" },
        { label: "Striche", key: "strokes", color: "text-red-400" },
        { label: "Kniffel", key: "kniffels", color: "text-purple-400" },
    ];

    const TD_COLORS: Record<string, string> = {
        wins: "text-primary font-bold",
        highscore: "text-orange-400 font-semibold",
        bonusPoints: "text-yellow-400",
        strokes: "text-red-400",
        kniffels: "text-purple-400",
    };

    const CHART_METRICS: { label: string; value: ChartMetric }[] = [
        { label: "Punkte-Verlauf", value: "scores_over_time" },
        { label: "Siege", value: "wins" },
        { label: "Teilnahmen", value: "participations" },
        { label: "Ø Punkte", value: "avgScore" },
        { label: "Highscore", value: "highscore" },
        { label: "Bonuspunkte", value: "bonusPoints" },
        { label: "Striche", value: "strokes" },
        { label: "Kniffel", value: "kniffels" },
    ];

    const memberColorMap = new Map(members.map((m, i) => [m.id, COLORS[i % COLORS.length]]));

    return (
        <div className="space-y-8 pb-10">

            {/* ── Hero Header ──────────────────────────────────────────── */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 via-background to-background border p-6 md:p-12">
                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-4 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] md:text-xs font-bold tracking-wider uppercase">
                            <BarChart3 className="h-3 w-3" /> Analyse
                        </div>
                        <h1 className="text-3xl md:text-5xl font-black tracking-tight outfit leading-none">
                            Spiel <span className="text-primary italic">Statistiken</span>
                        </h1>
                        <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
                            Tauche tief in eure Spieldaten ein. Striche, Siege, Bonuspunkte und mehr auf einen Blick.
                        </p>
                    </div>
                    <div className="flex items-center gap-4 text-muted-foreground self-start md:self-auto">
                        <div className="flex flex-col items-end">
                            <span className="text-xl md:text-2xl font-black text-foreground outfit">{filteredSheets.length}</span>
                            <span className="text-[10px] uppercase font-bold tracking-widest">Spiele</span>
                        </div>
                        <div className="h-8 w-px bg-border" />
                        <div className="flex flex-col items-end">
                            <span className="text-xl md:text-2xl font-black text-foreground outfit">{playerStats.length}</span>
                            <span className="text-[10px] uppercase font-bold tracking-widest">Spieler</span>
                        </div>
                        <div className="h-8 w-px bg-border" />
                        <BarChart3 className="h-6 w-6 md:h-8 md:w-8 opacity-20" />
                    </div>
                </div>
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
            </div>

            {/* ── Filter Bar ───────────────────────────────────────────── */}
            <div className="flex flex-col gap-4">
                {/* Season filter */}
                <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1.5 text-xs md:text-sm text-muted-foreground font-medium w-full sm:w-auto mb-1 sm:mb-0">
                        <Calendar className="h-4 w-4" /> Saison:
                    </span>
                    <div className="flex flex-wrap gap-2">
                        {[
                            { label: `${currentYear} (aktuell)`, value: "current" as SeasonFilter },
                            { label: "Alle Saisons", value: "all" as SeasonFilter },
                            ...availableYears
                                .filter(y => y !== currentYear)
                                .map(y => ({ label: `${y}`, value: y as SeasonFilter })),
                        ].map(opt => (
                            <button
                                key={String(opt.value)}
                                onClick={() => setSeasonFilter(opt.value)}
                                className={cn(
                                    "px-3 py-1.5 rounded-full text-xs font-semibold transition-all border shrink-0",
                                    seasonFilter === opt.value
                                        ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                                        : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                                )}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Game type filter */}
                <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1.5 text-xs md:text-sm text-muted-foreground font-medium w-full sm:w-auto mb-1 sm:mb-0">
                        <Filter className="h-4 w-4" /> Spiele:
                    </span>
                    <div className="flex flex-wrap gap-2">
                        {GAME_FILTERS.map(f => (
                            <button
                                key={f.value}
                                onClick={() => setGameFilter(f.value)}
                                className={cn(
                                    "px-3 py-1.5 rounded-full text-xs font-semibold transition-all border shrink-0",
                                    gameFilter === f.value
                                        ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                                        : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                                )}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Section 1: Rankings Table ─────────────────────────────── */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg md:text-xl font-bold flex items-center gap-2 text-foreground">
                        <Swords className="h-5 w-5 text-primary" />
                        Rangliste
                    </h2>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold md:hidden">Seitlich scrollen für mehr →</span>
                </div>
                <div className="bg-card border rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs md:text-sm border-collapse">
                            <thead>
                                <tr className="border-b bg-muted/20">
                                    {COL_HEADERS.map((col, i) => (
                                        <th
                                            key={col.key}
                                            className={cn(
                                                "px-4 py-3 font-semibold text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none",
                                                i === 0 ? "text-left sticky left-0 z-20 bg-muted/20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]" : "text-center"
                                            )}
                                            onClick={() => handleSort(col.key)}
                                        >
                                            <div className={cn("flex items-center gap-1", i > 0 && "justify-center")}>
                                                {col.label}
                                                <SortIcon k={col.key} />
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {sortedStats.map((p, idx) => (
                                    <tr
                                        key={p.id}
                                        className={cn(
                                            "border-b last:border-0 transition-colors hover:bg-muted/30",
                                            idx === 0 && sortKey !== "name" && "bg-yellow-500/5 line-winner"
                                        )}
                                    >
                                        <td className="px-4 py-3 font-semibold sticky left-0 z-10 bg-card/95 backdrop-blur-sm border-r border-white/5 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                            <div className="flex items-center gap-2 min-w-[100px]">
                                                <span
                                                    className="inline-block w-2 h-2 rounded-full shrink-0"
                                                    style={{ backgroundColor: memberColorMap.get(p.id) ?? "#888" }}
                                                />
                                                <span className="truncate">{p.name}</span>
                                                {idx === 0 && sortKey !== "name" && (
                                                    <Trophy className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center font-mono opacity-80">{p.participations}</td>
                                        <td className={cn("px-4 py-3 text-center font-mono", TD_COLORS.wins)}>{p.wins}</td>
                                        <td className="px-4 py-3 text-center font-mono opacity-80">{p.avgScore}</td>
                                        <td className={cn("px-4 py-3 text-center font-mono", TD_COLORS.highscore)}>{p.highscore}</td>
                                        <td className={cn("px-4 py-3 text-center font-mono", TD_COLORS.bonusPoints)}>{p.bonusPoints}</td>
                                        <td className={cn("px-4 py-3 text-center font-mono", TD_COLORS.strokes)}>{p.strokes}</td>
                                        <td className={cn("px-4 py-3 text-center font-mono", TD_COLORS.kniffels)}>{p.kniffels}</td>
                                    </tr>
                                ))}
                                {sortedStats.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                                            Keine Daten für diesen Filter.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Bonus points legend */}
                <div className="mt-4 p-3 bg-muted/10 rounded-xl border border-white/5">
                    <p className="text-[10px] md:text-xs text-muted-foreground leading-relaxed">
                        <Star className="h-3 w-3 text-yellow-400 inline-block mr-1.5 -mt-0.5" />
                        <strong>Bonuspunkte</strong> (Matrix): +1 für Kniffel gewürfelt · +1 für höchste Chance (als Erster) · +1 für niedrigste Chance (als Erster)
                    </p>
                </div>
            </section>

            {/* ── Section 2: Charts ────────────────────────────────────── */}
            <section className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-primary" />
                        Grafiken
                    </h2>
                    {/* Metric selector */}
                    <div className="flex flex-wrap gap-1.5">
                        {CHART_METRICS.map(m => (
                            <button
                                key={m.value}
                                onClick={() => setChartMetric(m.value)}
                                className={cn(
                                    "px-3 py-1 rounded-full text-[10px] md:text-xs font-semibold transition-all border",
                                    chartMetric === m.value
                                        ? "bg-primary text-primary-foreground border-primary shadow-md"
                                        : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                                )}
                            >
                                {m.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Player toggles */}
                <div className="flex flex-wrap gap-1.5 pb-2">
                    {members.map(m => {
                        const color = memberColorMap.get(m.id) ?? "#888";
                        const active = selectedPlayers.has(m.id);
                        return (
                            <button
                                key={m.id}
                                onClick={() => togglePlayer(m.id)}
                                className={cn(
                                    "px-2.5 py-1 rounded-full text-[10px] md:text-xs font-semibold border transition-all",
                                    !active && "opacity-30 grayscale"
                                )}
                                style={{
                                    borderColor: active ? color : "hsl(var(--border))",
                                    backgroundColor: active ? `${color}15` : "transparent",
                                    color: active ? color : "hsl(var(--muted-foreground))",
                                }}
                            >
                                {m.name}
                            </button>
                        );
                    })}
                </div>

                {/* Chart canvas */}
                <div className="bg-card border rounded-2xl p-4 md:p-6 h-[22rem] md:h-96 shadow-inner relative overflow-hidden">
                    {chartData.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                            Keine Daten vorhanden.
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            {chartMetric === "scores_over_time" ? (
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                    <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" hide={chartData.length > 20} />
                                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={30} />
                                    <Tooltip
                                        contentStyle={{ 
                                            background: "rgba(20, 20, 20, 0.9)", 
                                            border: "1px solid hsl(var(--border))", 
                                            borderRadius: "12px",
                                            fontSize: "12px",
                                            backdropFilter: "blur(4px)",
                                            color: "#fff"
                                        }}
                                        labelStyle={{ color: "#aaa" }}
                                        itemStyle={{ padding: "0 2px" }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                                    {members
                                        .filter(m => selectedPlayers.has(m.id))
                                        .map(m => (
                                            <Line
                                                key={m.id}
                                                type="monotone"
                                                dataKey={m.name}
                                                stroke={memberColorMap.get(m.id)}
                                                strokeWidth={2.5}
                                                dot={{ r: 3, strokeWidth: 2 }}
                                                activeDot={{ r: 5, strokeWidth: 0 }}
                                                connectNulls={false}
                                            />
                                        ))}
                                </LineChart>
                            ) : (
                                <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 30 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                                    <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                                    <YAxis 
                                        type="category" 
                                        dataKey="name" 
                                        tick={{ fontSize: 11, fontWeight: 500 }} 
                                        width={70} 
                                        stroke="hsl(var(--muted-foreground))"
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip
                                        contentStyle={{ 
                                            background: "rgba(20, 20, 20, 0.9)", 
                                            border: "1px solid hsl(var(--border))", 
                                            borderRadius: "12px",
                                            fontSize: "12px",
                                            backdropFilter: "blur(4px)",
                                            color: "#fff"
                                        }}
                                        labelStyle={{ color: "#aaa" }}
                                        itemStyle={{ color: "#fff" }}
                                        formatter={(value) => [value, CHART_METRICS.find(m => m.value === chartMetric)?.label ?? ""]}
                                    />
                                    <Bar dataKey="value" name={CHART_METRICS.find(m => m.value === chartMetric)?.label ?? ""} radius={[0, 4, 4, 0]} barSize={20}>
                                        {chartData.map((entry: any, i) => {
                                            const member = members.find(m => m.name === entry.name);
                                            const color = member ? (memberColorMap.get(member.id) ?? COLORS[i % COLORS.length]) : COLORS[i % COLORS.length];
                                            return <Cell key={i} fill={color} />;
                                        })}
                                    </Bar>
                                </BarChart>
                            )}
                        </ResponsiveContainer>
                    )}
                </div>
            </section>

            {/* ── Section 3: Token History ────────────────────────────────── */}
            <section className="space-y-4">
                <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
                    <Dice5 className="h-5 w-5 text-blue-400" />
                    Token Historie
                </h2>
                <div className="bg-card border rounded-2xl overflow-hidden">
                    <div className="max-h-[400px] overflow-y-auto">
                        {tokenTransactions.length === 0 ? (
                            <div className="p-10 text-center text-muted-foreground opacity-50">
                                Noch keine Token-Bewegungen aufgezeichnet.
                            </div>
                        ) : (
                            <div className="divide-y divide-border/50">
                                {tokenTransactions.map((t) => {
                                    const member = members.find(m => m.id === t.memberId);
                                    const ts = t.timestamp?.toDate ? t.timestamp.toDate() : (t.timestamp as any)?.seconds ? new Date((t.timestamp as any).seconds * 1000) : new Date();
                                    
                                    return (
                                        <div key={t.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    "p-2 rounded-xl shrink-0",
                                                    t.type === 'shiny' ? "bg-yellow-500/20 text-yellow-500" : "bg-blue-500/20 text-blue-500"
                                                )}>
                                                    {t.type === 'shiny' ? <Star className="h-5 w-5 fill-current" /> : <Dice5 className="h-5 w-5" />}
                                                </div>
                                                <div className="flex flex-col">
                                                    <div className="text-sm font-bold flex items-center gap-2">
                                                        {member?.name || "Unbekannt"}
                                                        {t.type === 'shiny' && <span className="text-[10px] bg-yellow-500 text-black px-1 rounded font-black italic">SHINY!</span>}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground line-clamp-1">{t.reason}</div>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <div className={cn(
                                                    "text-sm font-black",
                                                    t.amount > 0 ? "text-green-400" : "text-red-400"
                                                )}>
                                                    {t.amount > 0 ? "+" : ""}{t.amount} {t.type === 'shiny' ? "Shiny" : "Token"}
                                                </div>
                                                <div className="text-[10px] text-muted-foreground uppercase tracking-tight">
                                                    {ts.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
                <p className="text-[10px] text-muted-foreground italic px-2">
                    * Tokens werden automatisch für das Ausrichten von Events und frühzeitiges Abstimmen vergeben. Sie können am Jahresende gegen Saisonpunkte getauscht werden (5:1).
                </p>
            </section>
        </div>
    );
}
