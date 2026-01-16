"use client";

import { useState, useMemo, useCallback } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Member, KniffelSheet, KniffelScores } from "@/types";

interface KniffelScorecardProps {
    sheet: KniffelSheet;
    members: Member[];
}

type ScoreField = keyof KniffelScores;
type SortDirection = "asc" | "desc" | null;

const UPPER_FIELDS: ScoreField[] = ["ones", "twos", "threes", "fours", "fives", "sixes"];
const LOWER_FIELDS: ScoreField[] = ["threeOfAKind", "fourOfAKind", "fullHouse", "smallStraight", "largeStraight", "kniffel", "chance"];

export function KniffelScorecard({ sheet, members }: KniffelScorecardProps) {
    const { dict } = useLanguage();
    const [localScores, setLocalScores] = useState(sheet.scores);
    const [sortDirection, setSortDirection] = useState<SortDirection>(null);

    // Get members that were part of this sheet
    const sheetMembers = useMemo(() => {
        return members.filter(m => sheet.memberSnapshot.includes(m.id));
    }, [members, sheet.memberSnapshot]);

    // Calculate upper section sum for a member
    const calculateUpperSum = useCallback((memberId: string): number => {
        const scores = localScores[memberId];
        if (!scores) return 0;
        return UPPER_FIELDS.reduce((sum, field) => sum + (scores[field] || 0), 0);
    }, [localScores]);

    // Calculate bonus (35 if upper sum >= 63)
    const calculateBonus = useCallback((memberId: string): number => {
        return calculateUpperSum(memberId) >= 63 ? 35 : 0;
    }, [calculateUpperSum]);

    // Calculate lower section sum for a member
    const calculateLowerSum = useCallback((memberId: string): number => {
        const scores = localScores[memberId];
        if (!scores) return 0;
        return LOWER_FIELDS.reduce((sum, field) => sum + (scores[field] || 0), 0);
    }, [localScores]);

    // Calculate total score
    const calculateTotal = useCallback((memberId: string): number => {
        return calculateUpperSum(memberId) + calculateBonus(memberId) + calculateLowerSum(memberId);
    }, [calculateUpperSum, calculateBonus, calculateLowerSum]);

    // Sort members by total score
    const sortedMembers = useMemo(() => {
        if (!sortDirection) return sheetMembers;

        return [...sheetMembers].sort((a, b) => {
            const scoreA = calculateTotal(a.id);
            const scoreB = calculateTotal(b.id);
            return sortDirection === "desc" ? scoreB - scoreA : scoreA - scoreB;
        });
    }, [sheetMembers, sortDirection, calculateTotal]);

    // Toggle sort direction
    const toggleSort = () => {
        if (!sortDirection) setSortDirection("desc");
        else if (sortDirection === "desc") setSortDirection("asc");
        else setSortDirection(null);
    };

    // Handle score change
    const handleScoreChange = async (memberId: string, field: ScoreField, value: string) => {
        const numValue = value === "" ? null : parseInt(value, 10);
        if (value !== "" && isNaN(numValue as number)) return;

        // Update local state immediately
        setLocalScores(prev => ({
            ...prev,
            [memberId]: {
                ...prev[memberId],
                [field]: numValue
            }
        }));

        // Persist to Firebase
        try {
            await updateDoc(doc(db, "kniffelSheets", sheet.id), {
                [`scores.${memberId}.${field}`]: numValue
            });
        } catch (error) {
            console.error("Error updating score:", error);
        }
    };

    // Determine Kniffel row highlighting
    const getKniffelHighlight = (memberId: string): boolean => {
        const scores = localScores[memberId];
        return scores?.kniffel !== null && scores?.kniffel !== undefined;
    };

    // Determine Chance row highlighting
    const getChanceHighlight = (memberId: string): "highest" | "lowest" | null => {
        // Get all filled chance values
        const filledChanceValues: { memberId: string; value: number }[] = [];

        sortedMembers.forEach(m => {
            const scores = localScores[m.id];
            if (scores?.chance !== null && scores?.chance !== undefined) {
                filledChanceValues.push({ memberId: m.id, value: scores.chance });
            }
        });

        // No highlighting if no values or only checking non-filled cell
        const currentScores = localScores[memberId];
        if (currentScores?.chance === null || currentScores?.chance === undefined) {
            return null;
        }

        if (filledChanceValues.length === 0) return null;
        if (filledChanceValues.length === 1) return null; // Single value, no min/max comparison

        const values = filledChanceValues.map(v => v.value);
        const maxValue = Math.max(...values);
        const minValue = Math.min(...values);

        const currentValue = currentScores.chance;

        if (currentValue === maxValue) return "highest";
        if (currentValue === minValue) return "lowest";
        return null;
    };

    // Field label mapping
    const getFieldLabel = (field: ScoreField): string => {
        const labels: Record<ScoreField, string> = {
            ones: dict.kniffel.ones,
            twos: dict.kniffel.twos,
            threes: dict.kniffel.threes,
            fours: dict.kniffel.fours,
            fives: dict.kniffel.fives,
            sixes: dict.kniffel.sixes,
            threeOfAKind: dict.kniffel.threeOfAKind,
            fourOfAKind: dict.kniffel.fourOfAKind,
            fullHouse: dict.kniffel.fullHouse,
            smallStraight: dict.kniffel.smallStraight,
            largeStraight: dict.kniffel.largeStraight,
            kniffel: dict.kniffel.kniffelRow,
            chance: dict.kniffel.chance
        };
        return labels[field];
    };

    const renderScoreInput = (memberId: string, field: ScoreField) => {
        const scores = localScores[memberId];
        const value = scores?.[field];
        const isKniffel = field === "kniffel";
        const isChance = field === "chance";

        let highlightClass = "";
        if (isKniffel && getKniffelHighlight(memberId)) {
            highlightClass = "bg-yellow-500/30 border-yellow-400/50";
        } else if (isChance) {
            const chanceHighlight = getChanceHighlight(memberId);
            if (chanceHighlight === "highest") {
                highlightClass = "bg-green-500/30 border-green-400/50";
            } else if (chanceHighlight === "lowest") {
                highlightClass = "bg-orange-500/30 border-orange-400/50";
            }
        }

        return (
            <input
                type="number"
                min="0"
                value={value ?? ""}
                onChange={(e) => handleScoreChange(memberId, field, e.target.value)}
                className={cn(
                    "w-full text-center px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm",
                    highlightClass
                )}
            />
        );
    };

    return (
        <div className="overflow-x-auto">
            {/* Sort Button */}
            <div className="flex justify-end mb-3">
                <button
                    onClick={toggleSort}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
                >
                    {!sortDirection && <ArrowUpDown className="h-4 w-4" />}
                    {sortDirection === "desc" && <ArrowDown className="h-4 w-4 text-primary" />}
                    {sortDirection === "asc" && <ArrowUp className="h-4 w-4 text-primary" />}
                    {dict.kniffel.sort}
                    {sortDirection === "desc" && ` (${dict.kniffel.sortDesc})`}
                    {sortDirection === "asc" && ` (${dict.kniffel.sortAsc})`}
                </button>
            </div>

            <table className="w-full text-sm">
                <thead>
                    <tr>
                        <th className="text-left p-2 font-semibold"></th>
                        {sortedMembers.map(member => (
                            <th key={member.id} className="text-center p-2 font-semibold min-w-[100px]">
                                {member.name}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {/* Upper Section Header */}
                    <tr className="bg-primary/10">
                        <td colSpan={sortedMembers.length + 1} className="p-2 font-bold text-primary text-xs uppercase tracking-wider">
                            {dict.kniffel.upperSection}
                        </td>
                    </tr>

                    {/* Upper Section Fields */}
                    {UPPER_FIELDS.map(field => (
                        <tr key={field} className="border-b border-white/5">
                            <td className="p-2 font-medium">{getFieldLabel(field)}</td>
                            {sortedMembers.map(member => (
                                <td key={member.id} className="p-1">
                                    {renderScoreInput(member.id, field)}
                                </td>
                            ))}
                        </tr>
                    ))}

                    {/* Upper Sum */}
                    <tr className="bg-white/5 font-semibold">
                        <td className="p-2">{dict.kniffel.upperSum}</td>
                        {sortedMembers.map(member => (
                            <td key={member.id} className="p-2 text-center">
                                {calculateUpperSum(member.id)}
                            </td>
                        ))}
                    </tr>

                    {/* Bonus */}
                    <tr className="bg-white/5 font-semibold">
                        <td className="p-2">{dict.kniffel.bonus}</td>
                        {sortedMembers.map(member => (
                            <td key={member.id} className="p-2 text-center">
                                <span className={cn(
                                    calculateBonus(member.id) > 0 && "text-green-400"
                                )}>
                                    {calculateBonus(member.id)}
                                </span>
                            </td>
                        ))}
                    </tr>

                    {/* Lower Section Header */}
                    <tr className="bg-primary/10">
                        <td colSpan={sortedMembers.length + 1} className="p-2 font-bold text-primary text-xs uppercase tracking-wider">
                            {dict.kniffel.lowerSection}
                        </td>
                    </tr>

                    {/* Lower Section Fields */}
                    {LOWER_FIELDS.map(field => (
                        <tr key={field} className="border-b border-white/5">
                            <td className="p-2 font-medium">{getFieldLabel(field)}</td>
                            {sortedMembers.map(member => (
                                <td key={member.id} className="p-1">
                                    {renderScoreInput(member.id, field)}
                                </td>
                            ))}
                        </tr>
                    ))}

                    {/* Lower Sum */}
                    <tr className="bg-white/5 font-semibold">
                        <td className="p-2">{dict.kniffel.lowerSum}</td>
                        {sortedMembers.map(member => (
                            <td key={member.id} className="p-2 text-center">
                                {calculateLowerSum(member.id)}
                            </td>
                        ))}
                    </tr>

                    {/* Total Score */}
                    <tr className="bg-primary/20 font-bold text-lg">
                        <td className="p-3">{dict.kniffel.total}</td>
                        {sortedMembers.map(member => (
                            <td key={member.id} className="p-3 text-center text-primary">
                                {calculateTotal(member.id)}
                            </td>
                        ))}
                    </tr>
                </tbody>
            </table>
        </div>
    );
}
