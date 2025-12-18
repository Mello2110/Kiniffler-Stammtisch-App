"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import type { Member, PointEntry } from "@/types";

interface PointsMatrixProps {
    members: Member[];
    points: PointEntry[];
    currentYear: number;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function PointsMatrix({ members, points, currentYear }: PointsMatrixProps) {
    const [editingCell, setEditingCell] = useState<string | null>(null); // "userId_month"
    const [editValue, setEditValue] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Helper to get point entry
    const getPointEntry = (userId: string, month: number) => {
        return points.find(p => p.userId === userId && p.month === month && p.year === currentYear);
    };

    const handleCellClick = (userId: string, month: number, currentValue: number) => {
        setEditingCell(`${userId}_${month}`);
        setEditValue(currentValue === 0 ? "" : currentValue.toString());
    };

    const handleSave = async (userId: string, month: number) => {
        setIsSaving(true);
        try {
            const val = parseInt(editValue) || 0;
            const compositeId = `${userId}_${currentYear}_${month}`;
            const ref = doc(db, "points", compositeId);

            await setDoc(ref, {
                id: compositeId,
                userId,
                month,
                year: currentYear,
                points: val
            });
            setEditingCell(null);
        } catch (error) {
            console.error("Error saving points:", error);
        } finally {
            setIsSaving(false);
        }
    };

    // Calculate totals for sorting
    const memberTotals = members.map(m => {
        const total = points
            .filter(p => p.userId === m.id && p.year === currentYear)
            .reduce((acc, curr) => acc + curr.points, 0);
        return { ...m, totalPoints: total };
    }).sort((a, b) => b.totalPoints - a.totalPoints);

    return (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b bg-muted/50">
                        <th className="h-10 px-4 text-left font-medium sticky left-0 bg-background/95 backdrop-blur z-10">Member</th>
                        {MONTHS.map(m => (
                            <th key={m} className="h-10 px-2 text-center font-medium w-12">{m}</th>
                        ))}
                        <th className="h-10 px-4 text-center font-bold bg-muted/20">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {memberTotals.map(member => (
                        <tr key={member.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                            <td className="p-4 font-medium sticky left-0 bg-background/95 backdrop-blur z-10 border-r md:border-r-0">
                                {member.name}
                            </td>
                            {MONTHS.map((_, monthIndex) => {
                                const entry = getPointEntry(member.id, monthIndex);
                                const currentPoints = entry ? entry.points : 0;
                                const isEditing = editingCell === `${member.id}_${monthIndex}`;

                                return (
                                    <td key={monthIndex} className="p-1 text-center border-l border-dashed border-border/50 first:border-l-0">
                                        {isEditing ? (
                                            <input
                                                type="number"
                                                value={editValue}
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
                                                    "cursor-pointer hover:bg-muted rounded py-1 transition-colors min-h-[24px] flex items-center justify-center",
                                                    currentPoints > 0 ? "font-bold text-primary" : "text-muted-foreground/30"
                                                )}
                                            >
                                                {currentPoints > 0 ? currentPoints : "-"}
                                            </div>
                                        )}
                                    </td>
                                );
                            })}
                            <td className="p-4 text-center font-bold bg-muted/5 border-l">
                                {member.totalPoints}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
