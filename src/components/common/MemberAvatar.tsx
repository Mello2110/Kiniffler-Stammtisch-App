"use client";

import { cn } from "@/lib/utils";
import type { Member } from "@/types";

// ============================================
// TYPES & INTERFACES
// ============================================

interface MemberAvatarProps {
    member: Pick<Member, "avatar" | "name">;
    size?: "sm" | "md" | "lg";
    className?: string;
}

// ============================================
// CONSTANTS
// ============================================

const SIZE_CLASSES = {
    sm: "h-8 w-8 text-xs font-medium",
    md: "h-10 w-10 text-sm font-bold",
    lg: "h-20 w-20 text-3xl font-bold",
} as const;

// ============================================
// COMPONENT
// ============================================

export function MemberAvatar({ member, size = "md", className }: MemberAvatarProps) {
    const bgColor = member.avatar?.bgColor || "bg-primary";
    
    // Calculate initials: First letter of up to first two words, or first two letters of first word
    const nameParts = (member.name || "??").trim().split(/\s+/);
    let initials = "";
    if (nameParts.length > 1) {
        initials = (nameParts[0][0] + nameParts[1][0]).toUpperCase();
    } else {
        initials = nameParts[0].substring(0, 2).toUpperCase();
    }

    return (
        <div
            className={cn(
                "rounded-full flex items-center justify-center text-white shrink-0 uppercase tracking-wider",
                SIZE_CLASSES[size],
                bgColor,
                className
            )}
        >
            {initials}
        </div>
    );
}
