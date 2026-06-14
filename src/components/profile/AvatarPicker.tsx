"use client";

import { useState } from "react";
import { X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { AVATAR_COLORS, getAvatarColorHex } from "@/lib/avatarColors";

// ============================================
// TYPES & INTERFACES
// ============================================

interface AvatarPickerProps {
    currentIcon: string;
    currentColor: string;   // Now a color KEY, e.g. "lachs", "indigo"
    memberName?: string;
    onSelect: (icon: string, bgColor: string) => void;
    onClose: () => void;
}

// ============================================
// COMPONENT
// ============================================

export function AvatarPicker({ currentIcon, currentColor, memberName, onSelect, onClose }: AvatarPickerProps) {
    const [selectedKey, setSelectedKey] = useState(currentColor || "indigo");

    const handleConfirm = () => {
        onSelect(currentIcon || "", selectedKey);
        onClose();
    };

    // Calculate initials for preview
    const nameParts = (memberName || "??").trim().split(/\s+/);
    const initials = nameParts.length > 1
        ? (nameParts[0][0] + nameParts[1][0]).toUpperCase()
        : nameParts[0].substring(0, 2).toUpperCase();

    const selectedHex = getAvatarColorHex(selectedKey);

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
                    {/* Color Grid */}
                    <div className="space-y-3">
                        <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                            Farbe auswählen
                        </label>
                        <div className="grid grid-cols-4 gap-4">
                            {AVATAR_COLORS.map((color) => {
                                const isSelected = selectedKey === color.key;
                                return (
                                    <button
                                        key={color.key}
                                        onClick={() => setSelectedKey(color.key)}
                                        className={cn(
                                            "h-16 w-full rounded-2xl transition-all flex items-center justify-center relative",
                                            isSelected
                                                ? "ring-4 ring-offset-2 ring-primary ring-offset-background scale-105 shadow-lg z-10"
                                                : "hover:scale-105 shadow hover:shadow-md"
                                        )}
                                        style={{ backgroundColor: color.hex }}
                                        title={color.name}
                                    >
                                        {isSelected && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/25 rounded-2xl">
                                                <Check className="h-8 w-8 text-white drop-shadow-md" />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="space-y-3">
                        <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                            Vorschau
                        </label>
                        <div className="flex justify-center">
                            <div
                                className="h-24 w-24 rounded-full flex items-center justify-center text-white text-4xl font-bold uppercase tracking-wider shadow-lg select-none"
                                style={{ backgroundColor: selectedHex }}
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
