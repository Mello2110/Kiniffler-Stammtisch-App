"use client";

import { useState } from "react";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useLanguage } from "@/contexts/LanguageContext";
import { useClub } from "@/contexts/ClubContext";
import { ChevronDown, ChevronRight, Trash2, Calendar, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { KniffelScorecard } from "./KniffelScorecard";
import { DeleteConfirmationModal } from "@/components/common/DeleteConfirmationModal";
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
    const { clubId, clubDoc } = useClub();
    const [expandedSheet, setExpandedSheet] = useState<string | null>(null);
    const [fullscreenSheetId, setFullscreenSheetId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    const handleDelete = async (sheetId: string) => {
        setDeletingId(sheetId);
        try {
            await deleteDoc(clubDoc("kniffelSheets", sheetId));
            if (clubId === "club_original") {
                await deleteDoc(doc(db, "kniffelSheets", sheetId)).catch(() => {});
            }
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
        <>
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

                            <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setExpandedSheet(sheet.id);
                                        setFullscreenSheetId(sheet.id);
                                    }}
                                    className="p-2 rounded-lg text-muted-foreground hover:bg-primary/15 hover:text-primary transition-colors cursor-pointer"
                                    title={dict.kniffel.enterFullscreen}
                                >
                                    <Maximize2 className="h-4 w-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (fullscreenSheetId === sheet.id) setFullscreenSheetId(null);
                                        setConfirmDeleteId(sheet.id);
                                    }}
                                    disabled={isDeleting}
                                    className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-500 transition-colors disabled:opacity-50 cursor-pointer"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        {/* Expanded Scorecard */}
                        {(isExpanded || fullscreenSheetId === sheet.id) && (
                            <div className="border-t border-white/10 p-3 sm:p-4">
                                <KniffelScorecard
                                    sheet={sheet}
                                    members={members}
                                    externalFullscreen={fullscreenSheetId === sheet.id}
                                    onExitFullscreen={() => setFullscreenSheetId(null)}
                                />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
        <DeleteConfirmationModal
            isOpen={!!confirmDeleteId}
            onClose={() => setConfirmDeleteId(null)}
            onConfirm={async () => {
                if (confirmDeleteId) {
                    await handleDelete(confirmDeleteId);
                }
            }}
            title="Kniffel-Sheet löschen"
            description={dict.kniffel.confirmDelete}
        />
    </>
    );
}
