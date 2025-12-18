"use client";

import { X, Calendar, User } from "lucide-react";
import type { GalleryImage } from "@/types";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface LightboxProps {
    image: GalleryImage | null;
    onClose: () => void;
}

export function Lightbox({ image, onClose }: LightboxProps) {
    if (!image) return null;

    // Handle ESC key
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
    };

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 animate-in fade-in duration-300"
            onClick={onClose}
        >
            <button
                onClick={onClose}
                className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all z-[210]"
            >
                <X className="h-6 w-6" />
            </button>

            <div
                className="relative max-w-5xl w-full flex flex-col items-center gap-6"
                onClick={e => e.stopPropagation()}
            >
                <div className="relative rounded-2xl overflow-hidden border border-white/10 max-h-[80vh] flex items-center justify-center bg-black shadow-2xl">
                    <img
                        src={image.url}
                        alt={image.description || "Gallery"}
                        className="max-w-full max-h-full object-contain transition-all duration-700 animate-in zoom-in-95"
                    />
                </div>

                <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">
                                {image.year}
                            </span>
                            {image.description && (
                                <h3 className="text-xl font-bold text-white">{image.description}</h3>
                            )}
                        </div>
                        <div className="flex items-center gap-4 text-white/50 text-sm">
                            <span className="flex items-center gap-1.5">
                                <User className="h-4 w-4" />
                                {image.uploadedBy}
                            </span>
                            {image.createdAt && (
                                <span className="flex items-center gap-1.5">
                                    <Calendar className="h-4 w-4" />
                                    {format(image.createdAt.toDate ? image.createdAt.toDate() : new Date(), "d. MMMM yyyy", { locale: de })}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
