"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { getDoc } from "firebase/firestore";
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
    MessageSquarePlus,
    Dice5,
    X,
    User,
    Beer
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useClub } from "@/contexts/ClubContext";
import { SyncStatusBadge } from "@/components/common/SyncStatusBadge";

interface MobileSidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
    const pathname = usePathname();
    const { logout, user } = useAuth();
    const { dict } = useLanguage();
    const { clubId, availableClubs, switchClub, clubDoc } = useClub();
    const [memberName, setMemberName] = useState<string>("");

    useEffect(() => {
        const fetchMemberData = async () => {
            if (user?.uid) {
                try {
                    const docRef = clubDoc("members", user.uid);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        setMemberName(data.name || "Member");
                    }
                } catch (error) {
                    console.error("Error fetching member data:", error);
                }
            }
        };
        fetchMemberData();
    }, [user, clubId, clubDoc]);

    const navGroups = [
        {
            title: "Hauptbereich",
            items: [
                { icon: LayoutDashboard, label: dict.sidebar.dashboard, href: "/dashboard", match: (p: string) => p === "/dashboard" },
                { icon: Dice5, label: "Spiele-Arena", href: "/kniffel", match: (p: string) => p.startsWith("/kniffel") || p.includes("/game/") },
                { icon: Trophy, label: "Saison, Analyse & Ruhm", href: "/stats", match: (p: string) => p.startsWith("/stats") || p.startsWith("/statistiken") || p.startsWith("/hall-of-fame") },
                { icon: DollarSign, label: dict.sidebar.finances, href: "/cash", match: (p: string) => p.startsWith("/cash") },
            ],
        },
        {
            title: "Vereinsleben",
            items: [
                { icon: Calendar, label: dict.sidebar.events, href: "/events", match: (p: string) => p.startsWith("/events") },
                { icon: ImageIcon, label: dict.sidebar.gallery, href: "/gallery", match: (p: string) => p.startsWith("/gallery") },
                { icon: Users, label: dict.sidebar.members, href: "/members", match: (p: string) => p.startsWith("/members") },
                { icon: MessageSquarePlus, label: dict.sidebar.feedback, href: "/feedback", match: (p: string) => p.startsWith("/feedback") },
                { icon: Settings, label: "Club-Studio & Regeln", href: "/options", match: (p: string) => p.startsWith("/options") },
            ],
        },
    ];

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop Overlay */}
            <div
                className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300 lg:hidden"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Sidebar Panel */}
            <div className={cn(
                "fixed inset-y-0 right-0 z-50 w-[85%] max-w-[320px] bg-secondary/95 backdrop-blur-md border-l border-white/10 shadow-2xl",
                "animate-in slide-in-from-right duration-300 lg:hidden",
                "flex flex-col"
            )}>
                {/* Header - Close Button */}
                <div className="flex items-center justify-between h-16 px-5 border-b border-white/10">
                    <div className="flex items-center gap-2">
                        <span className="text-xl font-black text-[#F5F0EB] outfit">
                            Menü
                        </span>
                        <SyncStatusBadge />
                    </div>
                    <button
                        onClick={onClose}
                        className="flex items-center justify-center w-11 h-11 rounded-xl text-muted-foreground hover:bg-white/10 active:bg-primary/20 transition-colors"
                        aria-label="Close menu"
                    >
                        <X className="h-6 w-6" />
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
                            <div className="px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                                {group.title}
                            </div>
                            <div className="flex flex-col gap-1.5">
                                {group.items.map((item) => {
                                    const isActive = item.match(pathname);
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={onClose}
                                            className={cn(
                                                "flex items-center gap-3.5 rounded-xl px-4 min-h-[52px] text-base font-medium transition-all duration-200",
                                                isActive
                                                    ? "bg-primary/18 text-[#F5F0EB] border-l-4 border-primary shadow-sm"
                                                    : "text-foreground/80 hover:bg-white/10 active:bg-primary/10 border-l-4 border-transparent"
                                            )}
                                        >
                                            <item.icon className={cn(
                                                "h-5 w-5 shrink-0 transition-transform",
                                                isActive && "scale-110 text-primary"
                                            )} />
                                            <span className="truncate">{item.label}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* Footer - User Info & Logout */}
                <div className="border-t border-white/10 p-4 space-y-2.5 pb-[max(1rem,env(safe-area-inset-bottom))]">
                    {user && (
                        <div className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground bg-white/5 rounded-xl">
                            <UserCircle className="h-6 w-6 shrink-0" />
                            <div className="flex flex-col min-w-0">
                                <span className="font-medium text-foreground truncate">{memberName || "Member"}</span>
                                <span className="text-xs truncate">{user.email}</span>
                            </div>
                        </div>
                    )}

                    <Link
                        href="/profile"
                        onClick={onClose}
                        className="flex w-full items-center gap-3.5 rounded-xl px-4 min-h-[48px] text-sm font-medium text-foreground/80 hover:bg-white/10 active:bg-primary/10 transition-colors"
                    >
                        <User className="h-5 w-5" />
                        Mein Profil
                    </Link>

                    <button
                        onClick={() => {
                            logout();
                            onClose();
                        }}
                        className="flex w-full items-center gap-3.5 rounded-xl px-4 min-h-[48px] text-sm font-medium text-red-400 hover:bg-red-500/10 active:bg-red-500/20 transition-colors"
                    >
                        <LogOut className="h-5 w-5" />
                        Log out
                    </button>
                </div>
            </div>
        </>
    );
}
