"use client";

import { useState, useMemo, useCallback } from "react";
import { doc, updateDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowUpDown, ArrowUp, ArrowDown, X, ChevronDown, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Member, KniffelSheet, KniffelScores, ScoreValue } from "@/types";

interface KniffelScorecardProps {
    sheet: KniffelSheet;
    members: Member[];
}

type ScoreField = keyof KniffelScores;
type SortMethod = "scoreHigh" | "scoreLow" | "alphabet" | "manual";

const UPPER_FIELDS: ScoreField[] = ["ones", "twos", "threes", "fours", "fives", "sixes"];
const LOWER_FIELDS: ScoreField[] = ["threeOfAKind", "fourOfAKind", "fullHouse", "smallStraight", "largeStraight", "kniffel", "chance"];

// Fields with fixed point values (auto-fill)
const FIXED_POINT_FIELDS: Record<ScoreField, number> = {
    fullHouse: 25,
    smallStraight: 30,
    largeStraight: 40,
    kniffel: 50,
} as any;

export function KniffelScorecard({ sheet, members }: KniffelScorecardProps) {
    const { dict } = useLanguage();
    const [localScores, setLocalScores] = useState(sheet.scores);
    const [sortMethod, setSortMethod] = useState<SortMethod>("manual");
    const [showSortDropdown, setShowSortDropdown] = useState(false);

    // Get members that were part of this sheet
    const sheetMembers = useMemo(() => {
        return members.filter(m => sheet.memberSnapshot.includes(m.id));
    }, [members, sheet.memberSnapshot]);

    // Helper to get numeric value (strokes count as 0)
    const getNumericValue = (value: ScoreValue): number => {
        if (value === "stroke" || value === null) return 0;
        return value;
    };

    // Check if value is a stroke
    const isStroke = (value: ScoreValue): boolean => {
        return value === "stroke";
    };

    // Calculate upper section sum for a member
    const calculateUpperSum = useCallback((memberId: string): number => {
        const scores = localScores[memberId];
        if (!scores) return 0;
        return UPPER_FIELDS.reduce((sum, field) => sum + getNumericValue(scores[field]), 0);
    }, [localScores]);

    // Calculate bonus (35 if upper sum >= 63)
    const calculateBonus = useCallback((memberId: string): number => {
        return calculateUpperSum(memberId) >= 63 ? 35 : 0;
    }, [calculateUpperSum]);

    // Calculate lower section sum for a member
    const calculateLowerSum = useCallback((memberId: string): number => {
        const scores = localScores[memberId];
        if (!scores) return 0;
        return LOWER_FIELDS.reduce((sum, field) => sum + getNumericValue(scores[field]), 0);
    }, [localScores]);

    // Calculate total score
    const calculateTotal = useCallback((memberId: string): number => {
        return calculateUpperSum(memberId) + calculateBonus(memberId) + calculateLowerSum(memberId);
    }, [calculateUpperSum, calculateBonus, calculateLowerSum]);

    // Sort members based on selected method
    const sortedMembers = useMemo(() => {
        switch (sortMethod) {
            case "scoreHigh":
                return [...sheetMembers].sort((a, b) => calculateTotal(b.id) - calculateTotal(a.id));
            case "scoreLow":
                return [...sheetMembers].sort((a, b) => calculateTotal(a.id) - calculateTotal(b.id));
            case "alphabet":
                return [...sheetMembers].sort((a, b) => a.name.localeCompare(b.name));
            case "manual":
            default:
                return sheetMembers;
        }
    }, [sheetMembers, sortMethod, calculateTotal]);

    // Get sort icon
    const getSortIcon = () => {
        switch (sortMethod) {
            case "scoreHigh": return <ArrowDown className="h-4 w-4" />;
            case "scoreLow": return <ArrowUp className="h-4 w-4" />;
            default: return <ArrowUpDown className="h-4 w-4" />;
        }
    };

    // Get sort label
    const getSortLabel = () => {
        switch (sortMethod) {
            case "scoreHigh": return dict.kniffel.sortScoreHigh;
            case "scoreLow": return dict.kniffel.sortScoreLow;
            case "alphabet": return dict.kniffel.sortAlphabet;
            case "manual": return dict.kniffel.sortManual;
        }
    };

    // Handle score change with auto-fill for fixed point fields
    const handleScoreChange = async (memberId: string, field: ScoreField, value: string) => {
        let newValue: ScoreValue;

        // Check if user typed '-' for stroke
        if (value === "-" || value.toLowerCase() === "stroke" || value.toLowerCase() === "strich") {
            newValue = "stroke";
        } else if (value === "") {
            newValue = null;
        } else {
            const numValue = parseInt(value, 10);
            if (isNaN(numValue)) return;

            // Auto-fill fixed point fields
            if (field in FIXED_POINT_FIELDS && numValue > 0) {
                newValue = FIXED_POINT_FIELDS[field as keyof typeof FIXED_POINT_FIELDS];
            } else {
                newValue = numValue;
            }
        }

        // Update local state immediately
        setLocalScores(prev => ({
            ...prev,
            [memberId]: {
                ...prev[memberId],
                [field]: newValue
            }
        }));

        // Persist to Firebase
        try {
            await updateDoc(doc(db, "kniffelSheets", sheet.id), {
                [`scores.${memberId}.${field}`]: newValue
            });
        } catch (error) {
            console.error("Error updating score:", error);
        }
    };

    // Toggle stroke for a field
    const toggleStroke = async (memberId: string, field: ScoreField) => {
        const scores = localScores[memberId];
        const currentValue = scores?.[field];
        const newValue: ScoreValue = currentValue === "stroke" ? null : "stroke";

        setLocalScores(prev => ({
            ...prev,
            [memberId]: {
                ...prev[memberId],
                [field]: newValue
            }
        }));

        try {
            await updateDoc(doc(db, "kniffelSheets", sheet.id), {
                [`scores.${memberId}.${field}`]: newValue
            });
        } catch (error) {
            console.error("Error toggling stroke:", error);
        }
    };

    // Create penalty for a player
    const createPenalty = async (member: Member) => {
        const confirmed = confirm(`${dict.kniffel.penaltyConfirm} ${member.name}?`);
        if (!confirmed) return;

        try {
            await addDoc(collection(db, "penalties"), {
                userId: member.id,
                amount: 1,
                reason: dict.kniffel.penaltyReason,
                date: new Date().toISOString().split("T")[0],
                isPaid: false,
                createdAt: serverTimestamp()
            });
            alert(`✓ 1€ ${dict.kniffel.penalty} - ${member.name}`);
        } catch (error) {
            console.error("Error creating penalty:", error);
        }
    };

    // Determine Kniffel row highlighting (exclude strokes)
    const getKniffelHighlight = (memberId: string): boolean => {
        const scores = localScores[memberId];
        const value = scores?.kniffel;
        return value !== null && value !== undefined && value !== "stroke";
    };

    // Determine Chance row highlighting (exclude strokes)
    const getChanceHighlight = (memberId: string): "highest" | "lowest" | null => {
        const filledChanceValues: { memberId: string; value: number }[] = [];

        sortedMembers.forEach(m => {
            const scores = localScores[m.id];
            const value = scores?.chance;
            if (value !== null && value !== undefined && value !== "stroke" && typeof value === "number") {
                filledChanceValues.push({ memberId: m.id, value });
            }
        });

        const currentScores = localScores[memberId];
        const currentValue = currentScores?.chance;
        if (currentValue === null || currentValue === undefined || currentValue === "stroke" || typeof currentValue !== "number") {
            return null;
        }

        if (filledChanceValues.length === 0) return null;
        if (filledChanceValues.length === 1) return null;

        const values = filledChanceValues.map(v => v.value);
        const maxValue = Math.max(...values);
        const minValue = Math.min(...values);

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
        const isStrokeValue = isStroke(value);
        const isFixedField = field in FIXED_POINT_FIELDS;

        let highlightClass = "";
        if (isStrokeValue) {
            highlightClass = "bg-gray-500/20 border-gray-400/30 text-gray-400 line-through";
        } else if (isKniffel && getKniffelHighlight(memberId)) {
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
            <div className="flex items-center gap-1">
                <input
                    type="text"
                    value={isStrokeValue ? "-" : (value ?? "")}
                    onChange={(e) => handleScoreChange(memberId, field, e.target.value)}
                    placeholder={isFixedField ? String(FIXED_POINT_FIELDS[field as keyof typeof FIXED_POINT_FIELDS]) : ""}
                    className={cn(
                        "w-full text-center px-1 py-1.5 rounded-lg bg-white/5 border border-white/10 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm",
                        highlightClass
                    )}
                />
                <button
                    onClick={() => toggleStroke(memberId, field)}
                    className={cn(
                        "p-1 rounded transition-colors shrink-0",
                        isStrokeValue
                            ? "bg-gray-500/30 text-gray-300"
                            : "hover:bg-white/10 text-muted-foreground hover:text-foreground"
                    )}
                    title={dict.kniffel.stroke}
                >
                    <X className="h-3 w-3" />
                </button>
            </div>
        );
    };

    return (
        <div className="overflow-x-auto">
            {/* Sort Dropdown */}
            <div className="flex justify-end mb-3 relative">
                <button
                    onClick={() => setShowSortDropdown(!showSortDropdown)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
                >
                    {getSortIcon()}
                    <span>{dict.kniffel.sort}: {getSortLabel()}</span>
                    <ChevronDown className={cn("h-4 w-4 transition-transform", showSortDropdown && "rotate-180")} />
                </button>

                {showSortDropdown && (
                    <div className="absolute top-full right-0 mt-1 z-10 bg-secondary border border-white/10 rounded-xl shadow-xl overflow-hidden min-w-[180px]">
                        {(["scoreHigh", "scoreLow", "alphabet", "manual"] as SortMethod[]).map(method => (
                            <button
                                key={method}
                                onClick={() => {
                                    setSortMethod(method);
                                    setShowSortDropdown(false);
                                }}
                                className={cn(
                                    "w-full px-4 py-2 text-left text-sm hover:bg-white/10 transition-colors",
                                    sortMethod === method && "bg-primary/20 text-primary"
                                )}
                            >
                                {method === "scoreHigh" && dict.kniffel.sortScoreHigh}
                                {method === "scoreLow" && dict.kniffel.sortScoreLow}
                                {method === "alphabet" && dict.kniffel.sortAlphabet}
                                {method === "manual" && dict.kniffel.sortManual}
                            </button>
                        ))}
                    </div>
                )}
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
                                <span className={cn(calculateBonus(member.id) > 0 && "text-green-400")}>
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
                            <td className="p-2 font-medium">
                                {getFieldLabel(field)}
                                {field in FIXED_POINT_FIELDS && (
                                    <span className="text-xs text-muted-foreground ml-1">
                                        ({FIXED_POINT_FIELDS[field as keyof typeof FIXED_POINT_FIELDS]})
                                    </span>
                                )}
                            </td>
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

                    {/* Penalty Row */}
                    <tr className="bg-red-500/10 border-t-2 border-red-500/30">
                        <td className="p-2 font-medium flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-red-400" />
                            {dict.kniffel.penalty}
                        </td>
                        {sortedMembers.map(member => (
                            <td key={member.id} className="p-2 text-center">
                                <button
                                    onClick={() => createPenalty(member)}
                                    className="px-3 py-1 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 rounded-lg transition-colors border border-red-500/30"
                                >
                                    1€
                                </button>
                            </td>
                        ))}
                    </tr>
                </tbody>
            </table>
        </div>
    );
}
