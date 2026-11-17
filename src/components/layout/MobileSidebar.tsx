"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
    Image as ImageIcon,
    Users,
    LogOut,
    Settings,
    MessageSquarePlus,
    BarChart3,
    Award,
    X,
    User,
    Beer
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useClub } from "@/contexts/ClubContext";

interface MobileSidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
    const pathname = usePathname();
    const { logout } = useAuth();
    const { dict, language } = useLanguage();
    const { clubId, availableClubs, switchClub } = useClub();

    // Ergänzende Bereiche (Hauptbereiche Home, Spiele, Saison, Kasse, Termine, Club sind unten in der BottomNav)
    const navGroups = [
        {
            title: language === "de" ? "Vereinsleben & Extras" : language === "pl" ? "Klub i Dodatki" : "Club & Extras",
            items: [
                { icon: Users, label: dict.sidebar.members, href: "/members", match: (p: string) => p.startsWith("/members") },
                { icon: ImageIcon, label: dict.sidebar.gallery, href: "/gallery", match: (p: string) => p.startsWith("/gallery") },
                { icon: BarChart3, label: dict.sidebar.statistiken, href: "/statistiken", match: (p: string) => p.startsWith("/statistiken") },
                { icon: Award, label: dict.sidebar.hof, href: "/hall-of-fame", match: (p: string) => p.startsWith("/hall-of-fame") },
                { icon: MessageSquarePlus, label: dict.sidebar.feedback, href: "/feedback", match: (p: string) => p.startsWith("/feedback") },
            ],
        },
        {
            title: language === "de" ? "Verwaltung" : language === "pl" ? "Ustawienia" : "Settings",
            items: [
                { icon: Settings, label: dict.sidebar.options, href: "/options", match: (p: string) => p.startsWith("/options") },
            ],
        },
    ];

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop Overlay */}
            <div
                className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 lg:hidden"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Sidebar Panel */}
            <div className={cn(
                "fixed inset-y-0 right-0 z-50 w-[82%] max-w-[300px] bg-secondary/95 backdrop-blur-md border-l border-white/10 shadow-2xl",
                "animate-in slide-in-from-right duration-200 lg:hidden",
                "flex flex-col"
            )}>
                {/* Header */}
                <div className="flex items-center justify-between h-14 px-5 border-b border-white/10">
                    <span className="text-lg font-black text-[#F5F0EB] outfit">
                        {language === "de" ? "Menü" : language === "pl" ? "Menu" : "Menu"}
                    </span>
                    <button
                        onClick={onClose}
                        className="flex items-center justify-center w-10 h-10 rounded-xl text-muted-foreground hover:bg-white/10 active:bg-primary/20 transition-colors"
                        aria-label="Close menu"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Club-Wechsler */}
                {availableClubs.length > 1 && (
                    <div className="px-4 pt-3">
                        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2">
                            <Beer className="h-4 w-4 text-primary shrink-0" />
                            <select
                                value={clubId}
                                onChange={(e) => {
                                    switchClub(e.target.value);
                                    onClose();
                                }}
                                aria-label="Aktiver Club"
                                className="w-full bg-transparent text-xs font-semibold text-foreground outline-none cursor-pointer"
                            >
                                {availableClubs.map((c) => (
                                    <option key={c.id} value={c.id} className="bg-background text-foreground">
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                {/* Navigation Items */}
                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
                    {navGroups.map((group) => (
                        <div key={group.title} className="space-y-1.5">
                            <div className="px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                                {group.title}
                            </div>
                            <div className="flex flex-col gap-1">
                                {group.items.map((item) => {
                                    const isActive = item.match(pathname);
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={onClose}
                                            className={cn(
                                                "flex items-center gap-3 rounded-xl px-3.5 min-h-[46px] text-sm font-medium transition-all duration-150",
                                                isActive
                                                    ? "bg-primary/18 text-[#F5F0EB] border-l-4 border-primary shadow-sm"
                                                    : "text-foreground/80 hover:bg-white/10 active:bg-primary/10 border-l-4 border-transparent"
                                            )}
                                        >
                                            <item.icon className={cn(
                                                "h-4.5 w-4.5 shrink-0",
                                                isActive && "text-primary"
                                            )} />
                                            <span className="truncate">{item.label}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* Footer - Profil & Logout (ohne Name/E-Mail-Banner) */}
                <div className="border-t border-white/10 p-3 space-y-1.5 pb-[max(1rem,env(safe-area-inset-bottom))]">
                    <Link
                        href="/profile"
                        onClick={onClose}
                        className="flex w-full items-center gap-3 rounded-xl px-3.5 min-h-[44px] text-sm font-medium text-foreground/80 hover:bg-white/10 transition-colors"
                    >
                        <User className="h-4.5 w-4.5" />
                        {language === "de" ? "Mein Profil" : language === "pl" ? "Mój profil" : "My Profile"}
                    </Link>

                    <button
                        onClick={() => {
                            logout();
                            onClose();
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3.5 min-h-[44px] text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                    >
                        <LogOut className="h-4.5 w-4.5" />
                        Logout
                    </button>
                </div>
            </div>
        </>
    );
}
