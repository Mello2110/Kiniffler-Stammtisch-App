"use client";

import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useLanguage } from "@/contexts/LanguageContext";
import { X } from "lucide-react";
import type { Member, KniffelScores } from "@/types";

interface AddSheetModalProps {
    isOpen: boolean;
    onClose: () => void;
    members: Member[];
    selectedYear: number;
    selectedMonth: number;
}

export function AddSheetModal({
    isOpen,
    onClose,
    members,
    selectedYear,
    selectedMonth
}: AddSheetModalProps) {
    const { dict } = useLanguage();
    const [isCreating, setIsCreating] = useState(false);

    if (!isOpen) return null;

    const createEmptyScores = (): KniffelScores => ({
        ones: null,
        twos: null,
        threes: null,
        fours: null,
        fives: null,
        sixes: null,
        threeOfAKind: null,
        fourOfAKind: null,
        fullHouse: null,
        smallStraight: null,
        largeStraight: null,
        kniffel: null,
        chance: null
    });

    const handleCreate = async () => {
        setIsCreating(true);
        try {
            // Create scores object with empty entries for each member
            const scores: { [memberId: string]: KniffelScores } = {};
            members.forEach(member => {
                scores[member.id] = createEmptyScores();
            });

            await addDoc(collection(db, "kniffelSheets"), {
                year: selectedYear,
                month: selectedMonth,
                createdAt: serverTimestamp(),
                memberSnapshot: members.map(m => m.id),
                scores
            });

            onClose();
        } catch (error) {
            console.error("Error creating sheet:", error);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative z-10 w-full max-w-md mx-4 bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl ring-1 ring-white/5 p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold outfit">{dict.kniffel.addSheet}</h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="space-y-4">
                    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                        <p className="text-sm text-muted-foreground mb-2">{dict.kniffel.selectMonth}</p>
                        <p className="text-lg font-semibold">
                            {dict.kniffel.months[selectedMonth]} {selectedYear}
                        </p>
                    </div>

                    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                        <p className="text-sm text-muted-foreground mb-2">Players ({members.length})</p>
                        <div className="flex flex-wrap gap-1">
                            {members.slice(0, 5).map(member => (
                                <span
                                    key={member.id}
                                    className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-md"
                                >
                                    {member.name}
                                </span>
                            ))}
                            {members.length > 5 && (
                                <span className="text-xs px-2 py-1 bg-white/10 text-muted-foreground rounded-md">
                                    +{members.length - 5} more
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-muted-foreground hover:bg-white/5 transition-all font-medium"
                    >
                        {dict.kniffel.cancel}
                    </button>
                    <button
                        onClick={handleCreate}
                        disabled={isCreating || members.length === 0}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/25"
                    >
                        {isCreating ? "..." : dict.kniffel.createSheet}
                    </button>
                </div>
            </div>
        </div>
    );
}
