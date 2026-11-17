"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Dice5,
    Trophy,
    Wallet,
    Calendar,
    Settings
} from "lucide-react";
import { cn } from "@/lib/utils";
import { triggerHaptic } from "@/lib/haptics";

export function MobileBottomNav() {
    const pathname = usePathname();

    const tabs = [
        {
            label: "Home",
            href: "/dashboard",
            icon: LayoutDashboard,
            match: (p: string) => p === "/dashboard" || p.startsWith("/club/"),
        },
        {
            label: "Spiele",
            href: "/kniffel",
            icon: Dice5,
            match: (p: string) => p.startsWith("/kniffel") || p.includes("/game/"),
        },
        {
            label: "Saison",
            href: "/stats",
            icon: Trophy,
            match: (p: string) => p.startsWith("/stats") || p.startsWith("/statistiken") || p.startsWith("/hall-of-fame"),
        },
        {
            label: "Kasse",
            href: "/cash",
            icon: Wallet,
            match: (p: string) => p.startsWith("/cash"),
        },
        {
            label: "Termine",
            href: "/events",
            icon: Calendar,
            match: (p: string) => p.startsWith("/events"),
        },
        {
            label: "Club",
            href: "/options",
            icon: Settings,
            match: (p: string) => p.startsWith("/options") || p.startsWith("/members") || p.startsWith("/gallery") || p.startsWith("/profile") || p.startsWith("/feedback"),
        },
    ];

    return (
        <nav
            aria-label="Mobile Navigation"
            className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-white/10 bg-background/85 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
        >
            <div className="grid grid-cols-6 h-16 max-w-2xl mx-auto px-1">
                {tabs.map((tab) => {
                    const isActive = tab.match(pathname);
                    const Icon = tab.icon;
                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            onClick={() => triggerHaptic("tap")}
                            className={cn(
                                "flex flex-col items-center justify-center gap-1 rounded-xl transition-all relative",
                                isActive
                                    ? "text-primary font-bold"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {isActive && (
                                <span className="absolute top-0 w-8 h-0.5 rounded-full bg-primary" />
                            )}
                            <Icon className={cn("h-5 w-5 transition-transform", isActive && "scale-110")} />
                            <span className="text-[10px] tracking-tight leading-none truncate max-w-full px-0.5">
                                {tab.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
