"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";
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
    Beer,
    MessageSquarePlus,
    Dice5,
    User,
    PanelLeftClose,
    PanelLeftOpen,
    ChevronLeft,
    ChevronRight
} from "lucide-react";

import { useLanguage } from "@/contexts/LanguageContext";
import { useClub } from "@/contexts/ClubContext";
import { useTitle } from "@/contexts/TitleContext";
import { ClubLogo } from "@/components/common/ClubLogo";

interface SidebarProps {
    className?: string;
    collapsed?: boolean;
    onToggleCollapse?: () => void;
}

export function Sidebar({ className, collapsed = false, onToggleCollapse }: SidebarProps) {
    const pathname = usePathname();
    const { logout, user } = useAuth();
    const { dict, language } = useLanguage();
    const { title, setTitle } = useTitle();
    const { clubId, club, availableClubs, switchClub, clubDoc } = useClub();

    const [editValue, setEditValue] = useState(title);
    const [isEditing, setIsEditing] = useState(false);
    const [memberName, setMemberName] = useState<string>("");
    const [showEmail, setShowEmail] = useState(true);
    const touchStartX = useRef<number | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0]?.clientX ?? null;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!onToggleCollapse || touchStartX.current === null) return;
        const endX = e.changedTouches[0]?.clientX;
        if (endX === undefined) return;
        const deltaX = endX - touchStartX.current;
        touchStartX.current = null;
        if (deltaX < -45 && !collapsed) {
            onToggleCollapse();
        } else if (deltaX > 45 && collapsed) {
            onToggleCollapse();
        }
    };

    useEffect(() => {
        setEditValue(title);
    }, [title]);

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

    const handleSave = () => {
        const newTitle = editValue.trim() || "Stammtisch";
        setTitle(newTitle);
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") handleSave();
        if (e.key === "Escape") {
            setEditValue(title);
            setIsEditing(false);
        }
    };

    const primaryGroups = [
        {
            title: language === "de" ? "Hauptbereich" : language === "pl" ? "Główne" : "Main",
            items: [
                { icon: LayoutDashboard, label: dict.sidebar.dashboard, href: "/dashboard", match: (p: string) => p === "/dashboard" },
                { icon: Dice5, label: language === "de" ? "Spiele-Arena" : language === "pl" ? "Arena gier" : "Game Arena", href: "/kniffel", match: (p: string) => p.startsWith("/kniffel") || p.includes("/game/") },
                { icon: Trophy, label: dict.sidebar.stats, href: "/stats", match: (p: string) => p.startsWith("/stats") || p.startsWith("/statistiken") || p.startsWith("/hall-of-fame") },
                { icon: DollarSign, label: dict.sidebar.finances, href: "/cash", match: (p: string) => p.startsWith("/cash") },
            ],
        },
        {
            title: language === "de" ? "Vereinsleben" : language === "pl" ? "Klub" : "Club Life",
            items: [
                { icon: Calendar, label: dict.sidebar.events, href: "/events", match: (p: string) => p.startsWith("/events") },
                { icon: ImageIcon, label: dict.sidebar.gallery, href: "/gallery", match: (p: string) => p.startsWith("/gallery") },
                { icon: Users, label: dict.sidebar.members, href: "/members", match: (p: string) => p.startsWith("/members") },
                { icon: MessageSquarePlus, label: dict.sidebar.feedback, href: "/feedback", match: (p: string) => p.startsWith("/feedback") },
                { icon: Settings, label: dict.sidebar.options, href: "/options", match: (p: string) => p.startsWith("/options") },
            ],
        },
    ];

    return (
        <div
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className={cn(
                "flex h-full flex-col border-r border-border/60 bg-secondary/40 backdrop-blur-xl text-card-foreground transition-all duration-300",
                collapsed ? "w-[76px]" : "w-64",
                className
            )}
        >
            {onToggleCollapse && (
                <button
                    type="button"
                    onClick={onToggleCollapse}
                    className="absolute -right-3.5 top-20 z-50 flex h-11 w-7 items-center justify-center rounded-full border border-border/80 bg-card/95 text-muted-foreground shadow-lg backdrop-blur-md hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors cursor-pointer"
                    title={collapsed ? (language === "de" ? "Menü ausklappen" : "Expand sidebar") : (language === "de" ? "Menü einklappen" : "Collapse sidebar")}
                    aria-label={collapsed ? (language === "de" ? "Menü ausklappen" : "Expand sidebar") : (language === "de" ? "Menü einklappen" : "Collapse sidebar")}
                >
                    {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </button>
            )}
            <div className={cn("flex h-16 items-center border-b border-border/60", collapsed ? "justify-center px-2" : "px-4")}>
                {isEditing && !collapsed ? (
                    <input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleSave}
                        onKeyDown={handleKeyDown}
                        autoFocus
                        className="w-full bg-background/50 text-2xl font-bold font-heading border border-primary rounded px-2 py-1 outline-none text-foreground"
                    />
                ) : collapsed ? (
                    <div className="flex items-center justify-center gap-1 w-full">
                        <button
                            type="button"
                            onClick={onToggleCollapse}
                            className="flex items-center justify-center w-11 h-11 rounded-xl hover:bg-primary/15 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                            title={language === "de" ? "Menü ausklappen" : "Expand sidebar"}
                            aria-label={language === "de" ? "Menü ausklappen" : "Expand sidebar"}
                        >
                            <PanelLeftOpen className="h-5 w-5" />
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center w-full gap-1.5 group min-w-0">
                        <Link href="/dashboard" className="flex items-center gap-2.5 truncate flex-1 min-w-0 hover:opacity-80 transition-opacity cursor-pointer">
                            <ClubLogo club={club} size="sm" />
                            <h1
                                className="text-xl font-black font-heading text-[#F5F0EB] truncate"
                                title={title}
                            >
                                {title}
                            </h1>
                        </Link>
                        <button
                            type="button"
                            onClick={() => setIsEditing(true)}
                            className="p-1.5 rounded-lg hover:bg-primary/20 transition-colors group/edit cursor-pointer shrink-0"
                            aria-label="Edit Title"
                            title="Titel bearbeiten"
                        >
                            <Beer className="h-4 w-4 text-accent shrink-0 transition-transform group-hover/edit:scale-110" />
                        </button>
                        {onToggleCollapse && (
                            <button
                                type="button"
                                onClick={onToggleCollapse}
                                className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
                                title={language === "de" ? "Menü einklappen" : "Collapse sidebar"}
                                aria-label={language === "de" ? "Menü einklappen" : "Collapse sidebar"}
                            >
                                <PanelLeftClose className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className={cn("flex-1 overflow-y-auto py-4 space-y-6", collapsed ? "px-2" : "px-3")}>
                {primaryGroups.map((group, idx) => (
                    <div key={group.title} className="space-y-1">
                        {collapsed ? (
                            idx > 0 && <div className="h-px bg-border/50 mx-2 my-2" />
                        ) : (
                            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                                {group.title}
                            </div>
                        )}
                        <nav className="grid gap-1">
                            {group.items.map((item) => {
                                const isActive = item.match(pathname);
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        title={collapsed ? item.label : undefined}
                                        aria-label={item.label}
                                        className={cn(
                                            "flex items-center rounded-xl py-2.5 text-sm font-semibold transition-all duration-200 relative overflow-hidden min-h-[42px]",
                                            collapsed ? "justify-center px-0" : "gap-3 px-3",
                                            isActive
                                                ? collapsed
                                                    ? "text-primary bg-primary/20 shadow-sm"
                                                    : "text-[#F5F0EB] bg-primary/18 border-l-2 border-primary shadow-sm"
                                                : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                                        )}
                                    >
                                        <item.icon className={cn("h-4 w-4 shrink-0 transition-transform duration-200", isActive ? "scale-110 text-primary" : "")} />
                                        {!collapsed && <span className="truncate">{item.label}</span>}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                ))}
            </div>

            <div className={cn("border-t border-border/60 space-y-2", collapsed ? "p-2" : "p-4")}>
                {!collapsed && availableClubs.length > 1 && (
                    <div className="px-1 pb-1">
                        <select
                            value={clubId}
                            onChange={(e) => switchClub(e.target.value)}
                            className="w-full text-xs font-bold bg-background border border-primary/30 rounded-lg px-2 py-1.5 text-primary truncate"
                            title="Verein / Mandant wechseln"
                        >
                            {availableClubs.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div className={cn("grid gap-1 pt-1", collapsed ? "grid-cols-1" : "grid-cols-2")}>
                    <Link
                        href="/profile"
                        title={collapsed ? "Profil" : undefined}
                        aria-label="Profil"
                        className={cn(
                            "flex items-center justify-center rounded-xl py-2 text-xs font-semibold text-muted-foreground transition-all hover:bg-muted hover:text-foreground min-h-[40px]",
                            collapsed ? "px-0" : "gap-2 px-2.5"
                        )}
                    >
                        <User className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>Profil</span>}
                    </Link>

                    <button
                        type="button"
                        onClick={() => logout()}
                        title={collapsed ? "Logout" : undefined}
                        aria-label="Logout"
                        className={cn(
                            "flex items-center justify-center rounded-xl py-2 text-xs font-semibold text-red-400/90 transition-all hover:bg-red-500/10 hover:text-red-400 cursor-pointer min-h-[40px]",
                            collapsed ? "px-0" : "gap-2 px-2.5"
                        )}
                    >
                        <LogOut className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>Logout</span>}
                    </button>
                </div>
            </div>
        </div>
    );
}
