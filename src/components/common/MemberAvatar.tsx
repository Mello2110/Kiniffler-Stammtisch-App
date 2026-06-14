"use client";

import { cn } from "@/lib/utils";
import { getAvatarColorHex } from "@/lib/avatarColors";
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
    sm: "h-8 w-8 text-xs font-semibold",
    md: "h-10 w-10 text-sm font-bold",
    lg: "h-20 w-20 text-3xl font-bold",
} as const;

// ============================================
// COMPONENT
// ============================================

export function MemberAvatar({ member, size = "md", className }: MemberAvatarProps) {
    // bgColor now stores a color KEY (e.g. "lachs", "indigo") or a legacy Tailwind string.
    // We always resolve to a hex value so Tailwind purging cannot affect us.
    const colorKey = member.avatar?.bgColor || "indigo";
    const bgHex = getAvatarColorHex(colorKey);

    // Calculate initials: first letter of first two words, or first two chars of the name
    const nameParts = (member.name || "??").trim().split(/\s+/);
    const initials = nameParts.length > 1
        ? (nameParts[0][0] + nameParts[1][0]).toUpperCase()
        : nameParts[0].substring(0, 2).toUpperCase();

    return (
        <div
            className={cn(
                "rounded-full flex items-center justify-center text-white shrink-0 uppercase tracking-wider select-none",
                SIZE_CLASSES[size],
                className
            )}
            style={{ backgroundColor: bgHex }}
        >
            {initials}
        </div>
    );
}
