"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";
import { BatchUpload } from "@/components/gallery/BatchUpload";
import { ArrowLeft, Calendar, Filter } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { GalleryImage } from "@/types";

interface YearPageClientProps {
    year: string;
}

export default function YearPageClient({ year }: YearPageClientProps) {
    const router = useRouter();
    const yearNum = parseInt(year);
    const [refreshKey, setRefreshKey] = useState(0);
    const [pageSize, setPageSize] = useState(20);

    const [uploadStats, setUploadStats] = useState<{ [year: number]: number } | null>(null);

    // Generate years for tabs (consistent with main gallery page)
    const years = Array.from({ length: 2026 - 2015 + 1 }, (_, i) => 2026 - i);

    const handleUploadComplete = (stats: { [year: number]: number }) => {
        setRefreshKey(prev => prev + 1);
        setUploadStats(stats);

        // Auto-switch logic:
        // If we uploaded files predominantly to a different year, switch there.
        const uploadedYears = Object.keys(stats).map(Number);

        if (uploadedYears.length > 0) {
            // Find the year with the most uploads
            const mainYear = uploadedYears.reduce((a, b) => stats[a] > stats[b] ? a : b);

            if (mainYear !== yearNum) {
                // If the majority of files went to another year, redirect there.
                // But gives a small delay so they can read the stats?
                // Actually, let's Redirect immediately if ALL files went to another year.
                // If it's a mix, stay here and show stats.

                const totalFiles = Object.values(stats).reduce((a, b) => a + b, 0);
                const mainYearCount = stats[mainYear];

                // If > 70% of files went to another year, redirect
                if (mainYearCount / totalFiles > 0.7) {
                    router.push(`/gallery/${mainYear}`);
                }
            }
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20">
            {/* Upload Stats Notification */}
            {uploadStats && (
                <div className="fixed top-20 right-4 z-50 bg-card border shadow-2xl p-6 rounded-2xl max-w-sm animate-in slide-in-from-right duration-500">
                    <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="space-y-1">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <span className="bg-green-500/20 text-green-600 p-1 rounded-md">✅</span>
                                Upload Bericht
                            </h3>
                            <p className="text-muted-foreground text-xs">
                                Deine Fotos wurden automatisch sortiert.
                            </p>
                        </div>
                        <button
                            onClick={() => setUploadStats(null)}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            ✕
                        </button>
                    </div>
                    <div className="space-y-2">
                        {Object.entries(uploadStats).map(([y, count]) => (
                            <div key={y} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                                <span className="font-bold text-primary">{y}</span>
                                <span className="text-sm font-medium bg-background px-2 py-1 rounded-md border">
                                    {count} {count === 1 ? 'Foto' : 'Fotos'}
                                </span>
                            </div>
                        ))}
                    </div>
                    {/* Helper text if split years */}
                    {Object.keys(uploadStats).length > 1 && (
                        <p className="mt-4 text-[10px] text-orange-500 font-bold leading-tight">
                            ⚠ Fotos wurden auf mehrere Jahre verteilt (basierend auf Aufnahmedatum).
                        </p>
                    )}
                </div>
            )}

            {/* Breadcrumbs / Header */}
            <div className="flex flex-col gap-6 px-4 sm:px-0">
                <div className="flex items-center justify-between">
                    <Link
                        href="/gallery"
                        className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition-colors group"
                    >
                        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                        Zurück zum Archiv
                    </Link>
                </div>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-4 rounded-3xl bg-primary/10 text-primary">
                            <Calendar className="h-8 w-8" />
                        </div>
                        <div>
                            <h1 className="text-4xl md:text-5xl font-black outfit tracking-tighter">
                                Jahr <span className="text-primary italic">{year}</span>
                            </h1>
                            <p className="text-muted-foreground font-medium uppercase tracking-[0.2em] text-[10px]">
                                Momente & Erinnerungen
                            </p>
                        </div>
                    </div>

                    {/* Grid Controls */}
                    <div className="flex items-center gap-3 bg-card border rounded-2xl p-2 shadow-sm self-start md:self-end">
                        <div className="flex items-center gap-2 px-3 text-muted-foreground border-r pr-4 mr-1">
                            <Filter className="h-4 w-4" />
                            <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">Anzeigen</span>
                        </div>
                        {[20, 50, 100].map((size) => (
                            <button
                                key={size}
                                onClick={() => setPageSize(size)}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-xs font-black outfit transition-all",
                                    pageSize === size
                                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105"
                                        : "hover:bg-muted text-muted-foreground"
                                )}
                            >
                                {size}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Year Tabs Navigation */}
            <div className="sticky top-[70px] z-30 bg-background/80 backdrop-blur-md border-y py-2 px-4 -mx-4 sm:mx-0 sm:rounded-2xl sm:border mb-8 overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-2 w-max mx-auto md:mx-0">
                    {years.map((y) => (
                        <Link
                            key={y}
                            href={`/gallery/${y}`}
                            className={cn(
                                "px-6 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap",
                                y === yearNum
                                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-105"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                        >
                            {y}
                        </Link>
                    ))}
                </div>
            </div>

            {/* Batch Upload Section */}
            <section className="px-4 sm:px-0">
                <BatchUpload
                    year={yearNum}
                    onUploadComplete={handleUploadComplete}
                />
            </section>

            {/* Photo Grid */}
            <section className="space-y-6 px-4 sm:px-0">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-black outfit">Alle <span className="text-primary">Fotos</span></h2>
                    <div className="h-px flex-1 bg-border/50" />
                </div>

                <GalleryGrid
                    key={`${yearNum}-${refreshKey}-${pageSize}`}
                    year={yearNum}
                    pageSize={pageSize}
                />
            </section>
        </div>
    );
}
