"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { ClubTenant } from "@/types";

interface ClubLogoProps {
    club?: Pick<ClubTenant, "name" | "logoUrl" | "logoBackground"> | null;
    size?: "sm" | "md" | "lg";
    className?: string;
}

export function ClubLogo({ club, size = "md", className }: ClubLogoProps) {
    if (!club?.logoUrl) return null;

    const sizeClasses = {
        sm: "h-7 w-7 rounded-lg",
        md: "h-9 w-9 rounded-xl",
        lg: "h-16 w-16 rounded-2xl",
    }[size];

    const bgClasses =
        club.logoBackground === "light"
            ? "bg-white/95 border-white/80 p-1 shadow-sm"
            : club.logoBackground === "dark"
                ? "bg-zinc-950/90 border-white/15 p-1"
                : "bg-white/[0.04] border-white/10 p-0.5";

    return (
        <div
            className={cn(
                "relative shrink-0 overflow-hidden border flex items-center justify-center",
                sizeClasses,
                bgClasses,
                className
            )}
        >
            <img
                src={club.logoUrl}
                alt={club.name ? `${club.name} Logo` : "Vereinslogo"}
                className="max-h-full max-w-full w-auto h-auto object-contain"
            />
        </div>
    );
}
