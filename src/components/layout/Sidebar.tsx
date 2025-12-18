"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Calendar,
    Trophy,
    Image as ImageIcon,
    Users,
    LogOut,
    Settings,
    DollarSign,
    UserCircle,
    Crown
} from "lucide-react";

const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/" },
    { icon: Calendar, label: "Events", href: "/events" },
    { icon: Trophy, label: "Stats (Points)", href: "/stats" },
    { icon: DollarSign, label: "Finances", href: "/cash" },
    { icon: ImageIcon, label: "Gallery", href: "/gallery" },
    { icon: Users, label: "Members", href: "/members" },
    { icon: Crown, label: "Hall of Fame", href: "/hall-of-fame" },
];

export function Sidebar({ className }: { className?: string }) {
    const pathname = usePathname();
    const { logout, user } = useAuth();

    return (
        <div className={cn("flex h-full w-64 flex-col border-r border-border bg-card text-card-foreground", className)}>
            <div className="flex h-16 items-center border-b border-border px-6">
                <h1 className="text-2xl font-bold font-heading bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                    Stammtisch
                </h1>
            </div>
            <div className="flex-1 overflow-y-auto py-4">
                <nav className="grid gap-1 px-2">
                    {navItems.map((item, index) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={index}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all hover:text-primary",
                                    isActive
                                        ? "bg-primary/10 text-primary"
                                        : "text-muted-foreground hover:bg-muted"
                                )}
                            >
                                <item.icon className="h-4 w-4" />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
            </div>
            <div className="border-t border-border p-4">
                {user && (
                    <div className="mb-3 flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground bg-muted/50 rounded-lg overflow-hidden">
                        <UserCircle className="h-4 w-4 shrink-0" />
                        <span className="truncate" title={user.email || ""}>{user.email}</span>
                    </div>
                )}

                <button
                    onClick={() => logout()}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-500/80 transition-all hover:bg-red-500/10 hover:text-red-500"
                >
                    <LogOut className="h-4 w-4" />
                    Log out
                </button>
            </div>
        </div>
    );
}
