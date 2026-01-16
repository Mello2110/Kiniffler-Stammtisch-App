"use client";

import { useState } from "react";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useLanguage } from "@/contexts/LanguageContext";
import { ChevronDown, ChevronRight, Trash2, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { KniffelScorecard } from "./KniffelScorecard";
import type { Member, KniffelSheet } from "@/types";

interface KniffelSheetListProps {
    sheets: KniffelSheet[];
    members: Member[];
    loading: boolean;
    selectedYear: number;
    selectedMonth: number;
}

export function KniffelSheetList({
    sheets,
    members,
    loading,
    selectedYear,
    selectedMonth
}: KniffelSheetListProps) {
    const { dict } = useLanguage();
    const [expandedSheet, setExpandedSheet] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const handleDelete = async (sheetId: string) => {
        if (!confirm(dict.kniffel.confirmDelete)) return;

        setDeletingId(sheetId);
        try {
            await deleteDoc(doc(db, "kniffelSheets", sheetId));
            if (expandedSheet === sheetId) {
                setExpandedSheet(null);
            }
        } catch (error) {
            console.error("Error deleting sheet:", error);
        } finally {
            setDeletingId(null);
        }
    };

    const formatDate = (timestamp: any): string => {
        if (!timestamp) return "";
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString("de-DE", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    if (loading) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                {dict.common.loading}
            </div>
        );
    }

    if (sheets.length === 0) {
        return (
            <div className="bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl ring-1 ring-white/5 text-center">
                <p className="text-muted-foreground">{dict.kniffel.noSheets}</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {sheets.map((sheet, index) => {
                const isExpanded = expandedSheet === sheet.id;
                const isDeleting = deletingId === sheet.id;

                return (
                    <div
                        key={sheet.id}
                        className={cn(
                            "bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl ring-1 ring-white/5 overflow-hidden transition-all duration-300",
                            isExpanded && "ring-primary/30"
                        )}
                    >
                        {/* Sheet Header */}
                        <div
                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors"
                            onClick={() => setExpandedSheet(isExpanded ? null : sheet.id)}
                        >
                            <div className="flex items-center gap-3">
                                {isExpanded ? (
                                    <ChevronDown className="h-5 w-5 text-primary" />
                                ) : (
                                    <ChevronRight className="h-5 w-5" />
                                )}
                                <div>
                                    <h3 className="font-semibold">
                                        Game #{sheets.length - index}
                                    </h3>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Calendar className="h-3 w-3" />
                                        {dict.kniffel.createdOn} {formatDate(sheet.createdAt)}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(sheet.id);
                                }}
                                disabled={isDeleting}
                                className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-500 transition-colors disabled:opacity-50"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Expanded Scorecard */}
                        {isExpanded && (
                            <div className="border-t border-white/10 p-4">
                                <KniffelScorecard
                                    sheet={sheet}
                                    members={members}
                                />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
