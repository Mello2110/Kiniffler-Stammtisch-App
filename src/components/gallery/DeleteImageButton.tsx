"use client";

import { useState } from "react";
import { Trash2, Loader2, AlertTriangle, Cloud, CheckCircle } from "lucide-react";
import { doc, deleteDoc, getDoc } from "firebase/firestore";
import { db, deleteCloudinaryImage } from "@/lib/firebase";
import type { GalleryImage } from "@/types";

interface DeleteImageButtonProps {
    imageId: string;
    publicId?: string;
    onDelete: () => void;
    variant?: "icon" | "button";
    className?: string;
}

export function DeleteImageButton({ imageId, publicId, onDelete, variant = "icon", className = "" }: DeleteImageButtonProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cloudinaryStatus, setCloudinaryStatus] = useState<"pending" | "success" | "failed" | "skipped">("pending");

    const handleDelete = async () => {
        setIsDeleting(true);
        setError(null);
        setCloudinaryStatus("pending");

        try {
            console.log("[Delete] Starting deletion for image:", imageId);

            // First, verify the document exists
            const docRef = doc(db, "gallery", imageId);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                console.error("[Delete] Document not found:", imageId);
                setError("Bild nicht gefunden. Seite neu laden.");
                setIsDeleting(false);
                return;
            }

            const imageData = docSnap.data() as GalleryImage;
            const imagePublicId = publicId || imageData.publicId;

            console.log("[Delete] Document found, proceeding with deletion...");

            // Delete from Firestore first
            await deleteDoc(docRef);

            // Verify Firestore deletion was successful
            const verifySnap = await getDoc(docRef);
            if (verifySnap.exists()) {
                console.error("[Delete] Document still exists after deletion - permission denied?");
                setError("Löschung fehlgeschlagen. Keine Berechtigung.");
                setIsDeleting(false);
                return;
            }

            console.log("[Delete] ✅ Successfully deleted from Firestore");

            // Now attempt Cloudinary deletion via Cloud Function
            if (imagePublicId) {
                try {
                    console.log("[Delete] Attempting Cloudinary delete for publicId:", imagePublicId);
                    const result = await deleteCloudinaryImage({ publicId: imagePublicId });
                    console.log("[Delete] Cloudinary delete result:", result.data);

                    if ((result.data as any).success) {
                        console.log("[Delete] ✅ Successfully deleted from Cloudinary");
                        setCloudinaryStatus("success");
                    } else {
                        console.warn("[Delete] Cloudinary delete returned non-success:", result.data);
                        setCloudinaryStatus("failed");
                    }
                } catch (cloudinaryError) {
                    console.error("[Delete] Cloudinary delete failed:", cloudinaryError);
                    setCloudinaryStatus("failed");
                    // Continue anyway - Firestore deletion was successful
                }
            } else {
                console.log("[Delete] No publicId available, skipping Cloudinary delete");
                setCloudinaryStatus("skipped");
            }

            onDelete();
            setShowConfirm(false);
        } catch (err: any) {
            console.error("[Delete] Error:", err);

            if (err.code === 'permission-denied') {
                setError("Keine Berechtigung zum Löschen.");
            } else if (err.code === 'not-found') {
                setError("Bild nicht gefunden.");
            } else {
                setError(`Fehler: ${err.message || 'Unbekannter Fehler'}`);
            }
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
                            Das Bild wird aus der Galerie {publicId ? "und Cloudinary " : ""}entfernt.
                        </p>
                    </div>
                </div>

                {error && (
                    <p className="text-red-400 text-xs bg-red-500/10 p-2 rounded">{error}</p>
                )}

                {isDeleting && cloudinaryStatus !== "pending" && (
                    <div className="flex items-center gap-2 text-xs">
                        {cloudinaryStatus === "success" && (
                            <span className="text-green-400 flex items-center gap-1">
                                <Cloud className="h-3 w-3" />
                                <CheckCircle className="h-3 w-3" />
                                Cloudinary ✓
                            </span>
                        )}
                        {cloudinaryStatus === "failed" && (
                            <span className="text-yellow-400">
                                Cloudinary-Löschung fehlgeschlagen (lokal gelöscht)
                            </span>
                        )}
                    </div>
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
