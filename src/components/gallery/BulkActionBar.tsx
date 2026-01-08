"use client";

import { useState } from "react";
import { Download, Trash2, X, Loader2, CheckSquare, Cloud } from "lucide-react";
import JSZip from "jszip";
import { doc, deleteDoc } from "firebase/firestore";
import { db, bulkDeleteCloudinaryImages } from "@/lib/firebase";
import type { GalleryImage } from "@/types";

interface BulkActionBarProps {
    selectedImages: GalleryImage[];
    onClearSelection: () => void;
    onDeleteComplete: () => void;
}

export function BulkActionBar({ selectedImages, onClearSelection, onDeleteComplete }: BulkActionBarProps) {
    const [isDownloading, setIsDownloading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0, phase: "firestore" as "firestore" | "cloudinary" });

    const handleDownload = async () => {
        if (selectedImages.length === 0 || isDownloading) return;

        setIsDownloading(true);
        setProgress({ current: 0, total: selectedImages.length, phase: "firestore" });

        try {
            const zip = new JSZip();

            for (let i = 0; i < selectedImages.length; i++) {
                const img = selectedImages[i];
                setProgress({ current: i + 1, total: selectedImages.length, phase: "firestore" });

                try {
                    // Fetch image as blob
                    const response = await fetch(img.url);
                    const blob = await response.blob();

                    // Extract filename from URL or use ID
                    const urlParts = img.url.split('/');
                    const filename = urlParts[urlParts.length - 1].split('?')[0] || `${img.id}.jpg`;

                    zip.file(filename, blob);
                } catch (err) {
                    console.error(`[BulkDownload] Failed to fetch ${img.id}:`, err);
                }
            }

            // Generate ZIP and download
            const content = await zip.generateAsync({ type: "blob" });
            const timestamp = new Date().toISOString().slice(0, 10);
            const link = document.createElement("a");
            link.href = URL.createObjectURL(content);
            link.download = `gallery-images-${timestamp}.zip`;
            link.click();
            URL.revokeObjectURL(link.href);

            console.log("[BulkDownload] Success!");
        } catch (err) {
            console.error("[BulkDownload] Error:", err);
        } finally {
            setIsDownloading(false);
            setProgress({ current: 0, total: 0, phase: "firestore" });
        }
    };

    const handleDelete = async () => {
        if (selectedImages.length === 0 || isDeleting) return;

        setIsDeleting(true);
        setProgress({ current: 0, total: selectedImages.length, phase: "firestore" });

        try {
            // Phase 1: Delete from Firestore
            console.log("[BulkDelete] Phase 1: Deleting from Firestore...");
            for (let i = 0; i < selectedImages.length; i++) {
                const img = selectedImages[i];
                setProgress({ current: i + 1, total: selectedImages.length, phase: "firestore" });

                try {
                    await deleteDoc(doc(db, "gallery", img.id));
                    console.log(`[BulkDelete] Firestore deleted: ${img.id}`);
                } catch (err) {
                    console.error(`[BulkDelete] Failed to delete from Firestore: ${img.id}`, err);
                }
            }

            // Phase 2: Delete from Cloudinary via Cloud Function
            const publicIds = selectedImages
                .filter(img => img.publicId)
                .map(img => img.publicId!);

            if (publicIds.length > 0) {
                console.log(`[BulkDelete] Phase 2: Deleting ${publicIds.length} images from Cloudinary...`);
                setProgress({ current: 0, total: publicIds.length, phase: "cloudinary" });

                try {
                    const result = await bulkDeleteCloudinaryImages({ publicIds });
                    console.log("[BulkDelete] Cloudinary result:", result.data);
                } catch (err) {
                    console.error("[BulkDelete] Cloudinary bulk delete failed:", err);
                    // Continue anyway - Firestore deletion was successful
                }
            } else {
                console.log("[BulkDelete] No publicIds found, skipping Cloudinary delete");
            }

            console.log("[BulkDelete] Complete!");
            onClearSelection();
            onDeleteComplete();
        } catch (err) {
            console.error("[BulkDelete] Error:", err);
        } finally {
            setIsDeleting(false);
            setShowDeleteConfirm(false);
            setProgress({ current: 0, total: 0, phase: "firestore" });
        }
    };

    if (selectedImages.length === 0) return null;

    // Delete confirmation dialog
    if (showDeleteConfirm) {
        return (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-4">
                <div className="bg-card border border-red-500/30 rounded-3xl p-6 shadow-2xl space-y-4 min-w-[300px]">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-red-500/10">
                            <Trash2 className="h-6 w-6 text-red-500" />
                        </div>
                        <div>
                            <p className="font-bold text-lg">{selectedImages.length} Bilder löschen?</p>
                            <p className="text-sm text-muted-foreground">Diese Aktion kann nicht rückgängig gemacht werden.</p>
                        </div>
                    </div>

                    {isDeleting && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Lösche...</span>
                                <span>{progress.current}/{progress.total}</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-red-500 transition-all"
                                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowDeleteConfirm(false)}
                            disabled={isDeleting}
                            className="flex-1 px-4 py-3 rounded-2xl bg-muted hover:bg-muted/80 font-bold text-sm transition-colors disabled:opacity-50"
                        >
                            Abbrechen
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="flex-1 px-4 py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Löschen...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="h-4 w-4" />
                                    Löschen
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-4">
            <div className="bg-card border rounded-full px-6 py-4 shadow-2xl flex items-center gap-4">
                {/* Selection count */}
                <div className="flex items-center gap-2 pr-4 border-r">
                    <CheckSquare className="h-5 w-5 text-primary" />
                    <span className="font-bold text-sm whitespace-nowrap">
                        {selectedImages.length} ausgewählt
                    </span>
                </div>

                {/* Download button */}
                <button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 hover:bg-primary/20 text-primary font-bold text-sm transition-colors disabled:opacity-50"
                >
                    {isDownloading ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {progress.current}/{progress.total}
                        </>
                    ) : (
                        <>
                            <Download className="h-4 w-4" />
                            <span className="hidden sm:inline">Download</span>
                        </>
                    )}
                </button>

                {/* Delete button */}
                <button
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isDeleting}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold text-sm transition-colors disabled:opacity-50"
                >
                    <Trash2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Löschen</span>
                </button>

                {/* Clear selection */}
                <button
                    onClick={onClearSelection}
                    className="p-2 rounded-full hover:bg-muted transition-colors"
                    title="Auswahl aufheben"
                >
                    <X className="h-5 w-5 text-muted-foreground" />
                </button>
            </div>
        </div>
    );
}
