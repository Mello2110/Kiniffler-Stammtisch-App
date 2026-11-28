"use client";

import { useMemo } from "react";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useClub } from "@/contexts/ClubContext";
import { cn } from "@/lib/utils";
import type { KniffelSheet } from "@/types";

interface KniffelYearNavProps {
    selectedYear: number;
    selectedMonth: number;
    onSelectYear: (year: number) => void;
    onSelectMonth: (month: number) => void;
    sheets: Pick<KniffelSheet, "year" | "month">[];
}

export function KniffelYearNav({
    selectedYear,
    selectedMonth,
    onSelectYear,
    onSelectMonth,
    sheets
}: KniffelYearNavProps) {
    const { dict } = useLanguage();
    const { club } = useClub();
    const currentYear = new Date().getFullYear();
    const startYear = Math.min(club?.foundingYear || currentYear, currentYear);

    const years = useMemo(
        () => Array.from({ length: currentYear - startYear + 1 }, (_, i) => currentYear - i),
        [currentYear, startYear]
    );

    const monthCounts = useMemo(() => {
        const counts = new Array<number>(12).fill(0);
        for (const s of sheets) {
            if (s.year === selectedYear && s.month >= 0 && s.month < 12) {
                counts[s.month] += 1;
            }
        }
        return counts;
    }, [sheets, selectedYear]);

    const totalYearSessions = useMemo(
        () => monthCounts.reduce((sum, c) => sum + c, 0),
        [monthCounts]
    );

    const canGoPrevYear = selectedYear > startYear;
    const canGoNextYear = selectedYear < currentYear;

    return (
        <div className="bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl ring-1 ring-white/5 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    Zeitraum
                </h3>
                <span className="text-[11px] font-semibold text-muted-foreground">
                    {totalYearSessions} {totalYearSessions === 1 ? "Runde" : "Runden"} in {selectedYear}
                </span>
            </div>

            {/* Compact Year Stepper + Dropdown */}
            <div className="flex items-center gap-2 min-w-0">
                <button
                    type="button"
                    disabled={!canGoPrevYear}
                    onClick={() => canGoPrevYear && onSelectYear(selectedYear - 1)}
                    className="shrink-0 p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Vorheriges Jahr"
                    aria-label="Vorheriges Jahr"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>

                <div className="relative flex-1 min-w-0 h-10 rounded-xl border border-primary/30 bg-background/80 flex items-center justify-center px-3 focus-within:ring-2 focus-within:ring-primary/50">
                    <span className="text-sm font-black text-foreground select-none pointer-events-none">
                        {selectedYear}
                    </span>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <select
                        value={selectedYear}
                        onChange={(e) => onSelectYear(Number(e.target.value))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        aria-label="Jahr auswählen"
                    >
                        {years.map((year) => (
                            <option key={year} value={year} className="bg-background text-foreground">
                                {year}{year === startYear && years.length > 1 ? " (Gründung)" : ""}
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    type="button"
                    disabled={!canGoNextYear}
                    onClick={() => canGoNextYear && onSelectYear(selectedYear + 1)}
                    className="shrink-0 p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Nächstes Jahr"
                    aria-label="Nächstes Jahr"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>

            {/* Compact Month Grid: 2x6 on tablets, 3x4 on mobile & desktop sidebar */}
            <div className="grid grid-cols-3 sm:grid-cols-6 xl:grid-cols-3 gap-1.5">
                {dict.kniffel.months.map((monthName: string, monthIndex: number) => {
                    const isSelectedMonth = monthIndex === selectedMonth;
                    const count = monthCounts[monthIndex];
                    const shortName = monthName.slice(0, 3);

                    return (
                        <button
                            key={monthIndex}
                            type="button"
                            onClick={() => onSelectMonth(monthIndex)}
                            title={`${monthName} ${selectedYear}${count > 0 ? ` (${count})` : ""}`}
                            className={cn(
                                "relative flex items-center justify-between gap-1 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 border cursor-pointer",
                                isSelectedMonth
                                    ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                                    : count > 0
                                        ? "bg-primary/10 text-foreground border-primary/25 hover:bg-primary/20"
                                        : "bg-white/[0.03] text-muted-foreground border-white/5 hover:bg-white/10 hover:text-foreground"
                            )}
                        >
                            <span className="truncate">{shortName}</span>
                            {count > 0 && (
                                <span
                                    className={cn(
                                        "text-[10px] px-1.5 py-0.2 rounded-full font-bold leading-tight shrink-0",
                                        isSelectedMonth
                                            ? "bg-black/25 text-primary-foreground"
                                            : "bg-primary/20 text-primary"
                                    )}
                                >
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
