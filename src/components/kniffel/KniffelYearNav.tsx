"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Folder, FolderOpen } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import type { KniffelSheet } from "@/types";

interface KniffelYearNavProps {
    selectedYear: number;
    selectedMonth: number;
    onSelectYear: (year: number) => void;
    onSelectMonth: (month: number) => void;
    sheets: KniffelSheet[];
}

export function KniffelYearNav({
    selectedYear,
    selectedMonth,
    onSelectYear,
    onSelectMonth,
    sheets
}: KniffelYearNavProps) {
    const { dict } = useLanguage();
    const currentYear = new Date().getFullYear();

    // Generate years from 2016 to current year
    const years = Array.from({ length: currentYear - 2016 + 1 }, (_, i) => 2016 + i).reverse();

    // Track which years are expanded
    const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set([currentYear]));

    const toggleYear = (year: number) => {
        const newExpanded = new Set(expandedYears);
        if (newExpanded.has(year)) {
            newExpanded.delete(year);
        } else {
            newExpanded.add(year);
        }
        setExpandedYears(newExpanded);
    };

    const handleMonthClick = (year: number, month: number) => {
        onSelectYear(year);
        onSelectMonth(month);
    };

    // Count sheets per year/month (placeholder - would need all sheets data in real scenario)
    const getSheetCountForMonth = (year: number, month: number): number => {
        if (year === selectedYear && month === selectedMonth) {
            return sheets.length;
        }
        return 0; // In a real app, you'd query all sheets
    };

    return (
        <div className="bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl ring-1 ring-white/5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 px-2">
                {dict.headers.kniffel.badge}
            </h3>

            <div className="space-y-1">
                {years.map((year) => {
                    const isExpanded = expandedYears.has(year);
                    const isSelectedYear = year === selectedYear;

                    return (
                        <div key={year}>
                            {/* Year Header */}
                            <button
                                onClick={() => toggleYear(year)}
                                className={cn(
                                    "w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                                    isSelectedYear
                                        ? "bg-primary/10 text-primary"
                                        : "text-foreground hover:bg-white/5"
                                )}
                            >
                                {isExpanded ? (
                                    <ChevronDown className="h-4 w-4 shrink-0" />
                                ) : (
                                    <ChevronRight className="h-4 w-4 shrink-0" />
                                )}
                                {isExpanded ? (
                                    <FolderOpen className="h-4 w-4 shrink-0 text-primary" />
                                ) : (
                                    <Folder className="h-4 w-4 shrink-0" />
                                )}
                                <span className="font-bold">{year}</span>
                            </button>

                            {/* Month List */}
                            {isExpanded && (
                                <div className="ml-6 mt-1 space-y-0.5 border-l border-white/10 pl-2">
                                    {dict.kniffel.months.map((monthName: string, monthIndex: number) => {
                                        const isSelectedMonth = isSelectedYear && monthIndex === selectedMonth;
                                        const sheetCount = getSheetCountForMonth(year, monthIndex);

                                        return (
                                            <button
                                                key={monthIndex}
                                                onClick={() => handleMonthClick(year, monthIndex)}
                                                className={cn(
                                                    "w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-all duration-200",
                                                    isSelectedMonth
                                                        ? "bg-primary/20 text-primary font-medium"
                                                        : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                                                )}
                                            >
                                                <span>{monthName}</span>
                                                {sheetCount > 0 && (
                                                    <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-md font-medium">
                                                        {sheetCount}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
