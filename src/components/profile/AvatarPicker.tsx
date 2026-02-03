"use client";

import { useState } from "react";
import { X, Check } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// TYPES & INTERFACES
// ============================================

interface AvatarPickerProps {
    currentIcon: string;
    currentColor: string;
    onSelect: (icon: string, bgColor: string) => void;
    onClose: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IconType = React.ComponentType<{ className?: string }>;

// ============================================
// CONSTANTS
// ============================================

// Available icons organized by category
const AVATAR_ICONS = [
    // Animals
    "Dog", "Cat", "Bird", "Fish", "Bug", "Squirrel", "Rabbit",
    // Objects
    "Beer", "Coffee", "Gamepad2", "Music", "Camera", "Palette", "Book", "Bike", "Car",
    // Activities
    "Dumbbell", "Trophy", "Target", "Dice5", "Plane", "Mountain",
    // Symbols
    "Star", "Heart", "Zap", "Flame", "Sun", "Moon", "Sparkles",
    // People
    "User", "UserCircle", "Smile", "Ghost"
] as const;

const AVATAR_COLORS = [
    { name: "Lila", class: "bg-purple-500" },
    { name: "Blau", class: "bg-blue-500" },
    { name: "Grün", class: "bg-green-500" },
    { name: "Gelb", class: "bg-yellow-500" },
    { name: "Rot", class: "bg-red-500" },
    { name: "Pink", class: "bg-pink-500" },
    { name: "Indigo", class: "bg-indigo-500" },
    { name: "Teal", class: "bg-teal-500" },
    { name: "Orange", class: "bg-orange-500" },
] as const;

// ============================================
// COMPONENT
// ============================================

export function AvatarPicker({ currentIcon, currentColor, onSelect, onClose }: AvatarPickerProps) {
    const [selectedIcon, setSelectedIcon] = useState(currentIcon);
    const [selectedColor, setSelectedColor] = useState(currentColor);

    const handleConfirm = () => {
        onSelect(selectedIcon, selectedColor);
        onClose();
    };

    // Get icon component for preview
    const PreviewIcon = ((LucideIcons as unknown as Record<string, IconType>)[selectedIcon]) || LucideIcons.User;

    return (
        <div
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-card border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="text-lg font-bold">Avatar auswählen</h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-muted rounded-full transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Icon Selection */}
                    <div className="space-y-3">
                        <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                            Icon auswählen
                        </label>
                        <div className="grid grid-cols-6 gap-2">
                            {AVATAR_ICONS.map((iconName) => {
                                const Icon = (LucideIcons as unknown as Record<string, IconType>)[iconName];
                                if (!Icon) return null;

                                return (
                                    <button
                                        key={iconName}
                                        onClick={() => setSelectedIcon(iconName)}
                                        className={cn(
                                            "p-3 rounded-xl border-2 transition-all hover:bg-muted",
                                            selectedIcon === iconName
                                                ? "border-primary bg-primary/10"
                                                : "border-transparent"
                                        )}
                                    >
                                        <Icon className="h-6 w-6 mx-auto" />
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Color Selection */}
                    <div className="space-y-3">
                        <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                            Farbe auswählen
                        </label>
                        <div className="flex flex-wrap gap-3">
                            {AVATAR_COLORS.map((color) => (
                                <button
                                    key={color.class}
                                    onClick={() => setSelectedColor(color.class)}
                                    className={cn(
                                        "h-10 w-10 rounded-full transition-all flex items-center justify-center",
                                        color.class,
                                        selectedColor === color.class
                                            ? "ring-2 ring-offset-2 ring-primary ring-offset-background scale-110"
                                            : "hover:scale-105"
                                    )}
                                    title={color.name}
                                >
                                    {selectedColor === color.class && (
                                        <Check className="h-5 w-5 text-white" />
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
                                    "h-20 w-20 rounded-full flex items-center justify-center text-white",
                                    selectedColor
                                )}
                            >
                                <PreviewIcon className="h-10 w-10" />
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
                        Auswählen
                    </button>
                </div>
            </div>
        </div>
    );
}
