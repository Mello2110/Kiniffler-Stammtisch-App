"use client";

import Link from "next/link";
import { Calendar, Image as ImageIcon, ChevronRight } from "lucide-react";

interface YearCardProps {
    year: number;
    description?: string;
}

export function YearCard({ year, description = "Unsere Momente" }: YearCardProps) {
    return (
        <Link
            href={`/gallery/${year}`}
            className="group relative block aspect-[4/3] sm:aspect-square rounded-3xl overflow-hidden border bg-card hover:border-primary/50 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10"
        >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity">
                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '24px 24px' }} />
            </div>

            {/* Content */}
            <div className="relative h-full p-6 md:p-8 flex flex-col justify-between z-10">
                <div className="flex justify-between items-start">
                    <div className="p-3 rounded-2xl bg-primary/10 text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500">
                        <Calendar className="h-6 w-6" />
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all duration-500">
                        <ChevronRight className="h-6 w-6 text-primary" />
                    </div>
                </div>

                <div className="space-y-2">
                    <h3 className="text-4xl md:text-5xl font-black tracking-tighter outfit">
                        {year}
                    </h3>
                    <p className="text-muted-foreground text-sm font-medium">
                        {description}
                    </p>
                </div>
            </div>

            {/* Hover Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            {/* Corner Accent */}
            <div className="absolute bottom-0 right-0 w-24 h-24 bg-primary/5 rounded-tl-[100px] translate-x-12 translate-y-12 group-hover:translate-x-6 group-hover:translate-y-6 transition-transform duration-500" />
        </Link>
    );
}
