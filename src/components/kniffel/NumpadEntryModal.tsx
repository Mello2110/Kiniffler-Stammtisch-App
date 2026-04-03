"use client";

import { useState, useEffect } from "react";
import { X, Delete } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

interface NumpadEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (score: number) => void;
    onStroke: () => void;
    fieldLabel: string;
    playerName: string;
    currentValue?: number | null;
    maxScore?: number;
}

export function NumpadEntryModal({
    isOpen,
    onClose,
    onSave,
    onStroke,
    fieldLabel,
    playerName,
    currentValue,
    maxScore = 30, // maximum achievable score for 3x/4x Pasch and Chance is 30 (5x6)
}: NumpadEntryModalProps) {
    const { dict } = useLanguage();
    const [scoreString, setScoreString] = useState<string>("");

    useEffect(() => {
        if (isOpen && currentValue !== undefined && currentValue !== null && currentValue >= 0) {
            setScoreString(currentValue.toString());
        } else {
            setScoreString("");
        }
    }, [isOpen, currentValue]);

    if (!isOpen) return null;

    const handleNumberClick = (numStr: string) => {
        setScoreString(prev => {
            const nextval = prev + numStr;
            const parsed = parseInt(nextval, 10);
            if (!isNaN(parsed) && parsed > maxScore) {
                return maxScore.toString(); // clamp to max
            }
            return nextval;
        });
    };

    const handleDelete = () => {
        setScoreString(prev => prev.slice(0, -1));
    };

    const handleClear = () => {
        setScoreString("");
    };

    const handleSave = () => {
        if (scoreString !== "") {
            onSave(parseInt(scoreString, 10));
            onClose();
        }
    };

    const handleStroke = () => {
        onStroke();
        onClose();
    };

    const parsedScore = scoreString !== "" ? parseInt(scoreString, 10) : null;

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
                <div className="p-4 space-y-4">
                    {/* Score Display */}
                    <div className="text-center py-4 bg-white/5 rounded-xl border border-white/10 min-h-[80px] flex items-center justify-center">
                        {scoreString !== "" ? (
                            <p className="text-primary font-bold text-4xl">
                                {scoreString}
                            </p>
                        ) : (
                            <p className="text-muted-foreground text-lg">
                                {dict.kniffel.enterPoints || "Punkte eingeben"}
                            </p>
                        )}
                    </div>

                    {/* Numpad Grid */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                            <button
                                key={num}
                                onClick={() => handleNumberClick(num)}
                                className={cn(
                                    "aspect-square rounded-xl font-medium text-2xl transition-all duration-150 touch-manipulation",
                                    "bg-white/10 border border-white/20 hover:bg-white/20 active:scale-95 text-foreground"
                                )}
                            >
                                {num}
                            </button>
                        ))}
                        <button
                            onClick={handleClear}
                            className="aspect-square rounded-xl font-medium text-xl transition-all duration-150 touch-manipulation bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 active:scale-95 text-red-400"
                        >
                            C
                        </button>
                        <button
                            onClick={() => handleNumberClick('0')}
                            className="aspect-square rounded-xl font-medium text-2xl transition-all duration-150 touch-manipulation bg-white/10 border border-white/20 hover:bg-white/20 active:scale-95 text-foreground"
                        >
                            0
                        </button>
                        <button
                            onClick={handleDelete}
                            className="aspect-square rounded-xl font-medium transition-all duration-150 touch-manipulation bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95 text-muted-foreground flex items-center justify-center"
                        >
                            <Delete className="h-6 w-6" />
                        </button>
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
                        disabled={parsedScore === null}
                        className={cn(
                            "flex-1 py-3 px-4 rounded-xl font-medium transition-all",
                            parsedScore !== null
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
