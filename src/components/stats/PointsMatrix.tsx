"use client";

import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useClub } from "@/contexts/ClubContext";
import { pointDocId } from "@/lib/seasonPoints";
import { cn } from "@/lib/utils";
import type { GameDisciplineId, Member, PointEntry } from "@/types";

interface PointsMatrixProps {
    members: Member[];
    points: PointEntry[];
    currentYear: number;
    gameType?: GameDisciplineId | "all";
}

const MONTHS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

export function PointsMatrix({ members, points, currentYear, gameType = "kniffel" }: PointsMatrixProps) {
    const { clubId, clubDoc } = useClub();
    const [editingCell, setEditingCell] = useState<string | null>(null); // "userId_month"
    const [editValue, setEditValue] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const canEdit = gameType !== "all";

    const getMonthPoints = (userId: string, month: number) => {
        return points
            .filter(p => p.userId === userId && p.month === month && p.year === currentYear)
            .reduce((acc, curr) => acc + curr.points, 0);
    };

    const handleCellClick = (userId: string, month: number, currentValue: number) => {
        if (!canEdit) return;
        setEditingCell(`${userId}_${month}`);
        setEditValue(currentValue.toString());
    };

    const handleSave = async (userId: string, month: number) => {
        if (!canEdit) {
            setEditingCell(null);
            return;
        }
        setIsSaving(true);
        try {
            const val = parseInt(editValue) || 0;
            const targetDiscipline: GameDisciplineId = gameType;
            const compositeId = pointDocId(userId, currentYear, month, targetDiscipline);
            const payload = {
                id: compositeId,
                userId,
                month,
                year: currentYear,
                points: val,
                gameType: targetDiscipline,
            };
            await setDoc(clubDoc("points", compositeId), payload, { merge: true });
            if (clubId === "club_original" && targetDiscipline === "kniffel") {
                await setDoc(doc(db, "points", compositeId), payload, { merge: true }).catch(() => {});
            }
            setEditingCell(null);
        } catch (error) {
            console.error("Failed to save points:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const memberTotals = members.map(m => {
        const total = points
            .filter(p => p.userId === m.id && p.year === currentYear)
            .reduce((acc, curr) => acc + curr.points, 0);
        return { ...m, totalPoints: total };
    }).sort((a, b) => b.totalPoints - a.totalPoints);

    return (
        <div className="w-full max-w-full rounded-xl border border-white/20 bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-xl shadow-2xl overflow-x-auto ring-1 ring-white/5">
            {!canEdit && (
                <div className="px-4 py-2 text-[11px] text-muted-foreground border-b border-white/10 bg-black/20">
                    Gesamt-Ansicht aller Disziplinen (schreibgeschützt). Wähle eine einzelne Disziplin zum Bearbeiten.
                </div>
            )}
            <table className="w-full text-sm">
                <thead>
                    <tr>
                        <th className="h-10 px-4 text-left font-medium sticky left-0 bg-secondary z-10 border-r border-white/20">Mitglied</th>
                        {MONTHS.map(m => (
                            <th key={m} className="h-10 px-2 text-center font-medium w-12">{m}</th>
                        ))}
                        <th className="h-10 px-4 text-center font-bold">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {memberTotals.map(member => (
                        <tr key={member.id} className="group">
                            <td className="p-3 sm:p-4 font-medium sticky left-0 bg-secondary z-10 border-r border-white/20 whitespace-nowrap">
                                {member.name}
                            </td>
                            {MONTHS.map((_, monthIndex) => {
                                const currentPoints = getMonthPoints(member.id, monthIndex);
                                const isEditing = editingCell === `${member.id}_${monthIndex}`;

                                return (
                                    <td key={monthIndex} className="p-1 text-center">
                                        {isEditing ? (
                                            <input
                                                type="number"
                                                value={editValue}
                                                disabled={isSaving}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                onBlur={() => handleSave(member.id, monthIndex)}
                                                onKeyDown={(e) => e.key === "Enter" && handleSave(member.id, monthIndex)}
                                                className="w-10 text-center bg-background border rounded px-1 py-0.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                                                autoFocus
                                            />
                                        ) : (
                                            <div
                                                onClick={() => handleCellClick(member.id, monthIndex, currentPoints)}
                                                className={cn(
                                                    "rounded py-1 transition-colors min-h-[24px] flex items-center justify-center",
                                                    canEdit ? "cursor-pointer hover:bg-white/10" : "cursor-default",
                                                    currentPoints > 0 ? "font-bold text-primary" : "text-muted-foreground/30"
                                                )}
                                            >
                                                {currentPoints > 0 ? currentPoints : "-"}
                                            </div>
                                        )}
                                    </td>
                                );
                            })}
                            <td className="p-3 sm:p-4 text-center font-bold">
                                {member.totalPoints}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
