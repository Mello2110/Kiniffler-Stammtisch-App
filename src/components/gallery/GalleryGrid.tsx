"use client";

import { useState, useEffect, useRef } from "react";
import { collection, query, orderBy, where, limit, startAfter, getDocs, QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, Maximize2, Camera, Check, CheckSquare, Square } from "lucide-react";
import type { GalleryImage } from "@/types";
import { cn } from "@/lib/utils";
import { BulkActionBar } from "./BulkActionBar";

interface GalleryGridProps {
    onImageClick: (image: GalleryImage) => void;
    year?: number;
    pageSize?: number;
    refreshKey?: number;
}

export function GalleryGrid({ onImageClick, year, pageSize = 20, refreshKey = 0 }: GalleryGridProps) {
    const [images, setImages] = useState<GalleryImage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const observer = useRef<IntersectionObserver | null>(null);
    const lastElementRef = useRef<HTMLDivElement>(null);

    // Get selected images
    const selectedImages = images.filter(img => selectedIds.has(img.id));

    // Toggle selection
    const toggleSelect = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    // Clear selection
    const clearSelection = () => {
        setSelectedIds(new Set());
    };

    // Select all visible images
    const selectAll = () => {
        if (selectedIds.size === images.length) {
            // All selected, deselect all
            setSelectedIds(new Set());
        } else {
            // Select all
            setSelectedIds(new Set(images.map(img => img.id)));
        }
    };

    const allSelected = images.length > 0 && selectedIds.size === images.length;

    // Initial Load
    useEffect(() => {
        setIsLoading(true);
        setImages([]);
        setLastDoc(null);
        setHasMore(true);
        setSelectedIds(new Set());

        const fetchImages = async () => {
            try {
                let q = query(
                    collection(db, "gallery"),
                    orderBy("createdAt", "desc"),
                    limit(pageSize)
                );

                if (year) {
                    q = query(q, where("year", "==", year));
                }

                const snapshot = await getDocs(q);
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GalleryImage));

                setImages(data);
                setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
                setHasMore(snapshot.docs.length === pageSize);
            } catch (error) {
                console.error("Error fetching images:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchImages();
    }, [year, pageSize, refreshKey]);

    // Infinite Scroll Logic
    const loadMore = async () => {
        if (!lastDoc || isLoadingMore || !hasMore) return;

        setIsLoadingMore(true);
        try {
            let q = query(
                collection(db, "gallery"),
                orderBy("createdAt", "desc"),
                startAfter(lastDoc),
                limit(pageSize)
            );

            if (year) {
                q = query(q, where("year", "==", year));
            }

            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GalleryImage));

            setImages(prev => [...prev, ...data]);
            setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
            setHasMore(snapshot.docs.length === pageSize);
        } catch (error) {
            console.error("Error loading more images:", error);
        } finally {
            setIsLoadingMore(false);
        }
    };

    // Intersection Observer for Infinite Scroll
    useEffect(() => {
        if (isLoading) return;
        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                loadMore();
            }
        });

        if (lastElementRef.current) {
            observer.current.observe(lastElementRef.current);
        }

        return () => {
            if (observer.current) observer.current.disconnect();
        };
    }, [lastDoc, hasMore, isLoading]);

    // Refresh after bulk delete
    const handleBulkDeleteComplete = () => {
        // Remove deleted images from state
        setImages(prev => prev.filter(img => !selectedIds.has(img.id)));
        setSelectedIds(new Set());
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground animate-in fade-in">
                <div className="relative">
                    <Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" />
                    <Loader2 className="h-12 w-12 animate-spin text-primary absolute inset-0 blur-sm" />
                </div>
                <p className="mt-4 font-bold outfit tracking-widest uppercase text-xs">Entwickle Filme...</p>
            </div>
        );
    }

    if (images.length === 0) {
        return (
            <div className="text-center py-20 border-2 border-dashed rounded-[40px] bg-muted/20 animate-in zoom-in-95">
                <div className="p-6 bg-muted/50 rounded-full inline-block mb-4">
                    <Camera className="h-10 w-10 text-muted-foreground/30" />
                </div>
                <h3 className="text-xl font-bold mb-2">Keine Fotos für {year}</h3>
                <p className="text-muted-foreground max-w-xs mx-auto text-sm">
                    Für dieses Jahr wurden noch keine Schnappschüsse geteilt.
                </p>
            </div>
        );
    }

    return (
        <>
            {/* Select All Button */}
            {images.length > 0 && (
                <div className="flex justify-end mb-4">
                    <button
                        onClick={selectAll}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                            allSelected
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {allSelected ? (
                            <>
                                <CheckSquare className="h-4 w-4" />
                                Alle abwählen
                            </>
                        ) : (
                            <>
                                <Square className="h-4 w-4" />
                                Alle markieren
                            </>
                        )}
                    </button>
                </div>
            )}
            <div className="space-y-10">
                <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-6 space-y-6">
                    {images.map((image, index) => {
                        const isSelected = selectedIds.has(image.id);

                        return (
                            <div
                                key={image.id}
                                ref={index === images.length - 1 ? lastElementRef : null}
                                className={cn(
                                    "relative group break-inside-avoid rounded-[2.5rem] overflow-hidden cursor-pointer border bg-card transition-all duration-500 shadow-sm hover:shadow-2xl animate-in fade-in slide-in-from-bottom-4",
                                    isSelected
                                        ? "border-primary ring-2 ring-primary/50 scale-[0.98]"
                                        : "hover:border-primary/50 hover:shadow-primary/20"
                                )}
                                style={{ animationDelay: `${index * 50}ms` }}
                                onClick={() => onImageClick(image)}
                            >
                                <img
                                    src={image.url}
                                    alt={image.description || "Stammtisch Foto"}
                                    className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-110"
                                    loading="lazy"
                                />

                                {/* Selection Checkbox */}
                                <button
                                    onClick={(e) => toggleSelect(image.id, e)}
                                    className={cn(
                                        "absolute top-3 left-3 z-10 h-8 w-8 rounded-xl flex items-center justify-center transition-all",
                                        isSelected
                                            ? "bg-primary text-primary-foreground scale-110"
                                            : "bg-black/50 text-white opacity-0 group-hover:opacity-100 hover:bg-primary hover:text-primary-foreground"
                                    )}
                                >
                                    <Check className={cn("h-5 w-5", isSelected ? "opacity-100" : "opacity-70")} />
                                </button>

                                {/* Selected overlay */}
                                {isSelected && (
                                    <div className="absolute inset-0 bg-primary/10 pointer-events-none" />
                                )}

                                {/* Premium Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-6">
                                    <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-500 flex items-end justify-between gap-4">
                                        <div className="space-y-1">
                                            {image.description && (
                                                <p className="text-white text-sm font-bold line-clamp-2 leading-tight">
                                                    {image.description}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-2">
                                                <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-[10px] font-black text-primary-foreground uppercase">
                                                    {(image.uploaderName || image.uploadedBy || "?")[0]}
                                                </div>
                                                <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">
                                                    By {image.uploaderName || image.uploadedBy}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-xl border border-white/10 shrink-0">
                                            <Maximize2 className="h-4 w-4 text-white" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Load More indicator */}
                {hasMore && (
                    <div className="flex justify-center py-10">
                        <div className="flex flex-col items-center gap-4 text-muted-foreground">
                            <Loader2 className={cn("h-8 w-8 animate-spin text-primary", !isLoadingMore && "opacity-0")} />
                            <p className="text-[10px] font-black outfit tracking-[0.3em] uppercase">
                                {isLoadingMore ? "Lade weitere Momente..." : "Scrolle für mehr"}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Bulk Action Bar */}
            <BulkActionBar
                selectedImages={selectedImages}
                onClearSelection={clearSelection}
                onDeleteComplete={handleBulkDeleteComplete}
            />
        </>
    );
}
