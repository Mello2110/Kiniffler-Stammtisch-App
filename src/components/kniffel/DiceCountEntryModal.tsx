"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

interface DiceCountEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (score: number) => void;
    onStroke: () => void;
    fieldLabel: string;
    multiplier: number;
    playerName: string;
    currentValue?: number | null;
}

// Multiplier mapping for upper section fields
export const UPPER_FIELD_MULTIPLIERS: Record<string, number> = {
    ones: 1,
    twos: 2,
    threes: 3,
    fours: 4,
    fives: 5,
    sixes: 6,
};

export function DiceCountEntryModal({
    isOpen,
    onClose,
    onSave,
    onStroke,
    fieldLabel,
    multiplier,
    playerName,
    currentValue,
}: DiceCountEntryModalProps) {
    const { dict } = useLanguage();
    const [diceCount, setDiceCount] = useState<number | null>(null);

    // Initialize dice count from current value if editing
    useEffect(() => {
        if (isOpen && currentValue !== undefined && currentValue !== null && currentValue >= 0) {
            // Calculate dice count from stored value
            const calculatedCount = Math.round(currentValue / multiplier);
            setDiceCount(calculatedCount);
        } else {
            setDiceCount(null);
        }
    }, [isOpen, currentValue, multiplier]);

    // Calculate the score preview
    const calculatedScore = diceCount !== null ? diceCount * multiplier : 0;

    const handleQuickSelect = (count: number) => {
        // Toggle behavior: clicking same number deselects it
        if (diceCount === count) {
            setDiceCount(null);
        } else {
            setDiceCount(count);
        }
    };

    const handleInputChange = (value: string) => {
        const num = parseInt(value, 10);
        if (value === "") {
            setDiceCount(null);
        } else if (!isNaN(num)) {
            // Clamp between 0 and 5
            setDiceCount(Math.min(Math.max(0, num), 5));
        }
    };

    const handleSave = () => {
        onSave(calculatedScore);
        onClose();
    };

    const handleStroke = () => {
        onStroke();
        onClose();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && diceCount !== null) {
            handleSave();
        } else if (e.key === "Escape") {
            onClose();
        }
    };

    if (!isOpen) return null;

    // Get field-specific question text based on multiplier
    const getQuestionText = () => {
        const fieldNames: Record<number, string> = {
            1: dict.kniffel.ones || "Einser",
            2: dict.kniffel.twos || "Zweier",
            3: dict.kniffel.threes || "Dreier",
            4: dict.kniffel.fours || "Vierer",
            5: dict.kniffel.fives || "Fünfer",
            6: dict.kniffel.sixes || "Sechser",
        };
        const fieldName = fieldNames[multiplier] || fieldLabel;
        return dict.kniffel.howManyDice?.replace("{field}", fieldName) || `Wie viele ${fieldName} gewürfelt?`;
    };

    return (
        <div
            className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div
                className="bg-secondary border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <div>
                        <h3 className="text-lg font-semibold text-foreground">{fieldLabel}</h3>
                        <p className="text-sm text-muted-foreground">{playerName}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-5">
                    {/* Question */}
                    <p className="text-center text-foreground font-medium text-lg">
                        {getQuestionText()}
                    </p>

                    {/* Quick Select Buttons - Large touch targets (1-5, 0 is handled by Streichen) */}
                    <div className="grid grid-cols-5 gap-2 sm:gap-3">
                        {[1, 2, 3, 4, 5].map((count) => (
                            <button
                                key={count}
                                onClick={() => handleQuickSelect(count)}
                                className={cn(
                                    "aspect-square rounded-xl font-bold text-xl sm:text-2xl transition-all duration-150",
                                    "min-h-[56px] sm:min-h-[64px]",
                                    "active:scale-90 touch-manipulation",
                                    diceCount === count
                                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/40 ring-2 ring-primary ring-offset-2 ring-offset-secondary"
                                        : "bg-white/10 border-2 border-white/20 hover:bg-white/20 hover:border-white/30 text-foreground"
                                )}
                            >
                                {count}
                            </button>
                        ))}
                    </div>

                    {/* Score Preview - More prominent */}
                    <div className="text-center py-3 bg-white/5 rounded-xl border border-white/10">
                        {diceCount !== null ? (
                            <div>
                                <p className="text-primary font-bold text-2xl">
                                    = {calculatedScore} {dict.kniffel.points || "Punkte"}
                                </p>
                                <p className="text-muted-foreground text-sm mt-1">
                                    {diceCount} × {multiplier}
                                </p>
                            </div>
                        ) : (
                            <p className="text-muted-foreground">
                                {dict.kniffel.selectDiceCount || "Anzahl auswählen"}
                            </p>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex gap-3 p-4 border-t border-white/10">
                    <button
                        onClick={handleStroke}
                        className="flex-1 py-3 px-4 rounded-xl bg-gray-500/20 hover:bg-gray-500/30 border border-gray-500/30 text-gray-300 font-medium transition-all"
                    >
                        {dict.kniffel.stroke || "Streichen"}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={diceCount === null}
                        className={cn(
                            "flex-1 py-3 px-4 rounded-xl font-medium transition-all",
                            diceCount !== null
                                ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                                : "bg-white/5 text-muted-foreground cursor-not-allowed"
                        )}
                    >
                        {dict.kniffel.enter || "Eintragen"}
                    </button>
                </div>
            </div>
        </div>
    );
}
