"use client";

import { cn } from "@/lib/utils";
import type { Member } from "@/types";
import * as LucideIcons from "lucide-react";

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
    sm: "h-8 w-8 text-sm",
    md: "h-10 w-10 text-base",
    lg: "h-20 w-20 text-3xl",
} as const;

const ICON_SIZES = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-10 w-10",
} as const;

// ============================================
// COMPONENT
// ============================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IconType = React.ComponentType<{ className?: string }>;

export function MemberAvatar({ member, size = "md", className }: MemberAvatarProps) {
    // Get icon component from Lucide
    const iconName = member.avatar?.icon || "User";
    const bgColor = member.avatar?.bgColor || "bg-primary";

    // Dynamic icon lookup - use type assertion through unknown
    const IconComponent = ((LucideIcons as unknown as Record<string, IconType>)[iconName]) || LucideIcons.User;

    return (
        <div
            className={cn(
                "rounded-full flex items-center justify-center text-white shrink-0",
                SIZE_CLASSES[size],
                bgColor,
                className
            )}
        >
            <IconComponent className={cn(ICON_SIZES[size])} />
        </div>
    );
}
