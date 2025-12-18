"use client";

import { X, AlertTriangle, Loader2 } from "lucide-react";
import { useState } from "react";

interface DeleteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    title?: string;
    description?: string;
}

export function DeleteConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title = "Eintrag löschen",
    description = "Bist du sicher, dass du diesen Eintrag löschen möchtest? Diese Aktion kann nicht rückgängig gemacht werden."
}: DeleteConfirmationModalProps) {
    const [isDeleting, setIsDeleting] = useState(false);

    if (!isOpen) return null;

    const handleConfirm = async () => {
        setIsDeleting(true);
        try {
            await onConfirm();
            onClose();
        } catch (error) {
            console.error("Delete failed:", error);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-card border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-muted rounded-full transition-colors"
                        disabled={isDeleting}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6">
                    <p className="text-muted-foreground">
                        {description}
                    </p>
                </div>

                <div className="p-4 bg-muted/30 border-t flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={isDeleting}
                        className="flex-1 px-4 py-2 rounded-xl border bg-background hover:bg-muted font-medium transition-all disabled:opacity-50"
                    >
                        Abbrechen (No)
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isDeleting}
                        className="flex-1 px-4 py-2 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                        {isDeleting ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Löschen...
                            </>
                        ) : (
                            "Löschen (Yes)"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
