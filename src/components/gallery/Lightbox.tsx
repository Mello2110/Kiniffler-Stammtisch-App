"use client";

import { useEffect, useCallback } from "react";
import { X, Calendar, User, ChevronLeft, ChevronRight } from "lucide-react";
import type { GalleryImage } from "@/types";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { DeleteImageButton } from "./DeleteImageButton";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface LightboxProps {
    image: GalleryImage | null;
    onClose: () => void;
    onDelete?: () => void;
    onNext?: () => void;
    onPrev?: () => void;
    hasNavigation?: boolean;
    currentIndex?: number;
    totalCount?: number;
}

export function Lightbox({
    image,
    onClose,
    onDelete,
    onNext,
    onPrev,
    hasNavigation = false,
    currentIndex = 0,
    totalCount = 0
}: LightboxProps) {
    const { user } = useAuth();

    // Handle Keyboard Events
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!image) return;

        if (e.key === "Escape") onClose();
        if (e.key === "ArrowRight" && onNext) onNext();
        if (e.key === "ArrowLeft" && onPrev) onPrev();
    }, [image, onClose, onNext, onPrev]);

    useEffect(() => {
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);

    // Handle Swipe Gestures
    let touchStartX = 0;
    let touchEndX = 0;

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX = e.changedTouches[0].screenX;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    };

    const handleSwipe = () => {
        const threshold = 50;
        if (touchStartX - touchEndX > threshold && onNext) {
            onNext(); // Swipe Left -> Next
        }
        if (touchEndX - touchStartX > threshold && onPrev) {
            onPrev(); // Swipe Right -> Prev
        }
    };

    if (!image) return null;

    const handleDelete = () => {
        if (onDelete) {
            onDelete();
        }
        onClose();
    };

    // Check if user can delete (uploaded the image or is admin)
    const canDelete = user && (
        user.uid === image.uploadedBy ||
        (user as any).isAdmin === true
    );

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 animate-in fade-in duration-300 touch-none"
            onClick={onClose}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 md:top-6 md:right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all z-[210]"
            >
                <X className="h-6 w-6" />
            </button>

            {/* Navigation Arrows (Desktop) */}
            {hasNavigation && (
                <>
                    <button
                        onClick={(e) => { e.stopPropagation(); onPrev?.(); }}
                        className="hidden md:flex absolute left-6 top-1/2 -translate-y-1/2 p-4 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all z-[210] group"
                    >
                        <ChevronLeft className="h-10 w-10 transition-transform group-hover:-translate-x-1" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onNext?.(); }}
                        className="hidden md:flex absolute right-6 top-1/2 -translate-y-1/2 p-4 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all z-[210] group"
                    >
                        <ChevronRight className="h-10 w-10 transition-transform group-hover:translate-x-1" />
                    </button>
                </>
            )}

            <div
                className="relative max-w-5xl w-full flex flex-col items-center gap-6"
                onClick={e => e.stopPropagation()}
            >
                <div className="relative w-full max-h-[75vh] flex items-center justify-center">
                    <img
                        key={image.id} // Retrigger animation on image change
                        src={image.url}
                        alt={image.description || "Gallery"}
                        className="max-w-full max-h-[75vh] object-contain transition-all duration-300 animate-in fade-in zoom-in-95 pointer-events-none select-none"
                    />
                </div>

                <div className="w-full flex flex-col md:flex-row items-center justify-between gap-4 px-6 py-4 rounded-3xl bg-white/10 border border-white/10 backdrop-blur-md shadow-xl text-white">
                    <div className="flex flex-col gap-1 w-full">
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest">
                                    {image.year}
                                </span>
                                {totalCount > 0 && (
                                    <span className="text-white/50 text-xs font-bold tracking-widest">
                                        {currentIndex + 1} / {totalCount}
                                    </span>
                                )}
                            </div>

                            {/* Delete button (Desktop position) */}
                            {canDelete && (
                                <div className="hidden md:block">
                                    <DeleteImageButton
                                        imageId={image.id}
                                        onDelete={handleDelete}
                                        variant="button"
                                    />
                                </div>
                            )}
                        </div>

                        {image.description && (
                            <h3 className="text-xl font-bold mt-1 leading-tight">{image.description}</h3>
                        )}

                        <div className="flex items-center gap-4 text-white/50 text-sm mt-1">
                            <span className="flex items-center gap-1.5">
                                <User className="h-4 w-4" />
                                {image.uploaderName || image.uploadedBy}
                            </span>
                            {image.createdAt && (
                                <span className="flex items-center gap-1.5">
                                    <Calendar className="h-4 w-4" />
                                    {format(image.createdAt.toDate ? image.createdAt.toDate() : new Date(), "d. MMMM yyyy", { locale: de })}
                                </span>
                            )}
                            {image.captureDate && (
                                <span className="flex items-center gap-1.5 text-white/30 text-xs">
                                    (Aufnahme: {format(new Date(image.captureDate), "dd.MM.yyyy HH:mm")})
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Delete button (Mobile position) */}
                    {canDelete && (
                        <div className="w-full md:hidden pt-4 border-t border-white/10">
                            <DeleteImageButton
                                imageId={image.id}
                                onDelete={handleDelete}
                                variant="button"
                            />
                        </div>
                    )}
                </div>

                {/* Mobile Hint */}
                <p className="md:hidden text-white/30 text-[10px] uppercase tracking-widest animate-pulse">
                    Wischen für mehr
                </p>
            </div>
        </div>
    );
}
