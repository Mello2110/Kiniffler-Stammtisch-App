"use client";

import { useState } from "react";
import { X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// TYPES & INTERFACES
// ============================================

interface AvatarPickerProps {
    currentIcon: string;
    currentColor: string;
    memberName?: string;
    onSelect: (icon: string, bgColor: string) => void;
    onClose: () => void;
}

// ============================================
// CONSTANTS
// ============================================

const AVATAR_COLORS = [
    { name: "Lachs", class: "bg-rose-400" },
    { name: "Kaminrot", class: "bg-red-600" },
    { name: "Orange", class: "bg-orange-500" },
    { name: "Bernstein", class: "bg-amber-500" },
    { name: "Zitrone", class: "bg-yellow-400" },
    { name: "Limette", class: "bg-lime-500" },
    { name: "Minze", class: "bg-emerald-400" },
    { name: "Smaragd", class: "bg-emerald-600" },
    { name: "Türkis", class: "bg-teal-500" },
    { name: "Cyan", class: "bg-cyan-500" },
    { name: "Himmelblau", class: "bg-sky-500" },
    { name: "Ozeanblau", class: "bg-blue-600" },
    { name: "Indigo", class: "bg-indigo-500" },
    { name: "Violett", class: "bg-violet-500" },
    { name: "Fuchsia", class: "bg-fuchsia-500" },
    { name: "Pink", class: "bg-pink-400" },
] as const;

// ============================================
// COMPONENT
// ============================================

export function AvatarPicker({ currentIcon, currentColor, memberName, onSelect, onClose }: AvatarPickerProps) {
    const [selectedColor, setSelectedColor] = useState(currentColor || "bg-primary");

    const handleConfirm = () => {
        // Keep currentIcon or pass empty string, the icon is not used anymore anyway
        onSelect(currentIcon || "", selectedColor);
        onClose();
    };

    // Calculate initials for preview
    const nameParts = (memberName || "??").trim().split(/\s+/);
    let initials = "";
    if (nameParts.length > 1) {
        initials = (nameParts[0][0] + nameParts[1][0]).toUpperCase();
    } else {
        initials = nameParts[0].substring(0, 2).toUpperCase();
    }

    return (
        <div
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-card border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="text-lg font-bold">Avatar-Farbe auswählen</h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-muted rounded-full transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Color Selection */}
                    <div className="space-y-3">
                        <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                            Farbe auswählen
                        </label>
                        <div className="grid grid-cols-4 gap-4">
                            {AVATAR_COLORS.map((color) => (
                                <button
                                    key={color.class}
                                    onClick={() => setSelectedColor(color.class)}
                                    className={cn(
                                        "h-16 w-full rounded-2xl transition-all flex items-center justify-center relative",
                                        color.class,
                                        selectedColor === color.class
                                            ? "ring-4 ring-offset-2 ring-primary ring-offset-background scale-105 shadow-lg z-10"
                                            : "hover:scale-105 shadow hover:shadow-md"
                                    )}
                                    title={color.name}
                                >
                                    {selectedColor === color.class && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-2xl">
                                            <Check className="h-8 w-8 text-white drop-shadow-md" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="space-y-3">
                        <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                            Vorschau
                        </label>
                        <div className="flex justify-center">
                            <div
                                className={cn(
                                    "h-24 w-24 rounded-full flex items-center justify-center text-white text-4xl font-bold uppercase tracking-wider shadow-lg",
                                    selectedColor
                                )}
                            >
                                {initials}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="p-4 border-t flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 rounded-xl border bg-background hover:bg-muted font-bold transition-all"
                    >
                        Abbrechen
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="flex-1 px-4 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold transition-all"
                    >
                        Speichern
                    </button>
                </div>
            </div>
        </div>
    );
}
