"use client";

import { useState } from "react";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface DeleteImageButtonProps {
    imageId: string;
    onDelete: () => void;
    variant?: "icon" | "button";
    className?: string;
}

export function DeleteImageButton({ imageId, onDelete, variant = "icon", className = "" }: DeleteImageButtonProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDelete = async () => {
        setIsDeleting(true);
        setError(null);

        try {
            console.log("[Delete] Deleting image:", imageId);
            await deleteDoc(doc(db, "gallery", imageId));
            console.log("[Delete] Successfully deleted from Firestore");

            // Note: Image remains in Cloudinary (requires server-side API for deletion)
            // This is acceptable for free tier usage

            onDelete();
            setShowConfirm(false);
        } catch (err) {
            console.error("[Delete] Error:", err);
            setError("Fehler beim Löschen. Bitte erneut versuchen.");
        } finally {
            setIsDeleting(false);
        }
    };

    if (showConfirm) {
        return (
            <div className={`bg-black/90 backdrop-blur-sm rounded-2xl p-4 space-y-3 ${className}`}>
                <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
                    <div>
                        <p className="text-white font-bold text-sm">Bild löschen?</p>
                        <p className="text-white/60 text-xs mt-1">
                            Das Bild wird aus der Galerie entfernt.
                        </p>
                    </div>
                </div>

                {error && (
                    <p className="text-red-400 text-xs bg-red-500/10 p-2 rounded">{error}</p>
                )}

                <div className="flex gap-2">
                    <button
                        onClick={() => setShowConfirm(false)}
                        disabled={isDeleting}
                        className="flex-1 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors disabled:opacity-50"
                    >
                        Abbrechen
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="flex-1 px-3 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isDeleting ? (
                            <>
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Löschen...
                            </>
                        ) : (
                            "Löschen"
                        )}
                    </button>
                </div>
            </div>
        );
    }

    if (variant === "icon") {
        return (
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setShowConfirm(true);
                }}
                className={`p-2 rounded-xl bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white transition-all ${className}`}
                title="Bild löschen"
            >
                <Trash2 className="h-4 w-4" />
            </button>
        );
    }

    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                setShowConfirm(true);
            }}
            className={`px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white transition-all flex items-center gap-2 text-sm font-bold ${className}`}
        >
            <Trash2 className="h-4 w-4" />
            Löschen
        </button>
    );
}
