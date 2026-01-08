"use client";

import { useState } from "react";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";
import { BatchUpload } from "@/components/gallery/BatchUpload";
import { ArrowLeft, Calendar, Filter } from "lucide-react";
import Link from "next/link";
import type { GalleryImage } from "@/types";

interface YearPageClientProps {
    year: string;
}

export default function YearPageClient({ year }: YearPageClientProps) {
    const yearNum = parseInt(year);
    const [refreshKey, setRefreshKey] = useState(0);
    const [pageSize, setPageSize] = useState(20);

    return (
        <div className="max-w-7xl mx-auto space-y-10 pb-20">
            {/* Breadcrumbs / Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-4 sm:px-0">
                <div className="space-y-4">
                    <Link
                        href="/gallery"
                        className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition-colors group"
                    >
                        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                        Zurück zum Archiv
                    </Link>
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
                </div>

                {/* Grid Controls */}
                <div className="flex items-center gap-3 bg-card border rounded-2xl p-2 shadow-sm self-start md:self-center">
                    <div className="flex items-center gap-2 px-3 text-muted-foreground border-r pr-4 mr-1">
                        <Filter className="h-4 w-4" />
                        <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">Anzeigen</span>
                    </div>
                    {[20, 50, 100].map((size) => (
                        <button
                            key={size}
                            onClick={() => setPageSize(size)}
                            className={`px-4 py-2 rounded-xl text-xs font-black outfit transition-all ${pageSize === size
                                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105"
                                : "hover:bg-muted text-muted-foreground"
                                }`}
                        >
                            {size}
                        </button>
                    ))}
                </div>
            </div>

            {/* Batch Upload Section */}
            <section className="px-4 sm:px-0">
                <BatchUpload
                    year={yearNum}
                    onUploadComplete={() => setRefreshKey(prev => prev + 1)}
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
