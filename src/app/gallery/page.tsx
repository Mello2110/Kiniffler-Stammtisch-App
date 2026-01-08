"use client";

import { useState } from "react";
import { Sparkles, Camera, Map } from "lucide-react";
import { YearCard } from "@/components/gallery/YearCard";
import { EditableHeader } from "@/components/common/EditableHeader";
import { BatchUpload } from "@/components/gallery/BatchUpload";

export default function GalleryPage() {
    const [refreshKey, setRefreshKey] = useState(0);

    // Generate years from 2015 to 2026
    const years = Array.from({ length: 2026 - 2015 + 1 }, (_, i) => 2026 - i);

    const handleUploadComplete = (stats: { [year: number]: number }) => {
        // Refresh year cards to show updated counts
        setRefreshKey(prev => prev + 1);
        console.log("[Gallery] Upload complete, stats:", stats);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-10 pb-20">
            {/* Header Section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 via-background to-background border p-8 md:p-12">
                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-4 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-wider uppercase">
                            <Sparkles className="h-3 w-3" />
                            Archiv
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight outfit">
                            Foto <span className="text-primary italic">Archiv</span>
                        </h1>
                        <p className="text-muted-foreground text-lg leading-relaxed">
                            Lade deine Bilder zentral hoch – sie werden automatisch nach Jahr sortiert.
                        </p>
                    </div>

                    <div className="flex items-center gap-4 text-muted-foreground">
                        <div className="flex flex-col items-end">
                            <span className="text-2xl font-black text-foreground outfit">11</span>
                            <span className="text-xs uppercase font-bold tracking-widest">Jahre Fokus</span>
                        </div>
                        <div className="h-10 w-px bg-border" />
                        <Camera className="h-8 w-8 opacity-20" />
                    </div>
                </div>

                {/* Decorative background elements */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
            </div>

            {/* Central Upload Section */}
            <div className="px-4 sm:px-0">
                <BatchUpload onUploadComplete={handleUploadComplete} />
            </div>

            {/* Year Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 px-4 sm:px-0">
                {years.map((year) => (
                    <YearCard
                        key={year}
                        year={year}
                        refreshKey={refreshKey}
                        description={
                            year === 2026 ? "Zukunftspläne" :
                                year === 2025 ? "Aktuelles Jahr" :
                                    year === 2024 ? "Die letzte Sause" :
                                        undefined
                        }
                    />
                ))}
            </div>

            {/* Empty State / Info */}
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center border-2 border-dashed rounded-[40px] bg-muted/20">
                <Map className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <EditableHeader
                    pageId="gallery"
                    headerId="search-title"
                    defaultText="Durchsuche die Jahresarchive"
                    as="h3"
                    className="text-xl font-bold mb-2"
                />
                <p className="text-muted-foreground max-w-md text-sm">
                    Klicke auf ein Jahr, um alle Fotos aus diesem Zeitraum zu sehen.
                </p>
            </div>
        </div>
    );
}
