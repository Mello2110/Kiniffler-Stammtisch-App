"use client";

import Link from "next/link";
import { Calendar, ChevronRight } from "lucide-react";

interface YearCardProps {
    year: number;
    description?: string;
}

export function YearCard({ year, description = "Unsere Momente" }: YearCardProps) {
    return (
        <Link
            href={`/gallery/${year}`}
            className="group relative flex flex-col justify-between rounded-2xl overflow-hidden border border-[#F5F0EB]/10 bg-card/75 hover:bg-card/95 hover:border-primary/45 transition-all duration-300 p-4 sm:p-5 min-h-[128px] shadow-sm hover:shadow-lg"
        >
            <div className="flex items-center justify-between">
                <div className="p-2 rounded-xl bg-primary/15 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                    <Calendar className="h-4 w-4" />
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </div>

            <div className="mt-4 space-y-0.5">
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F5F0EB] outfit">
                    {year}
                </h3>
                <p className="text-xs text-muted-foreground font-medium truncate">
                    {description}
                </p>
            </div>
        </Link>
    );
}
