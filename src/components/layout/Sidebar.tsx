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
    Beer,
    MessageSquarePlus,
    Dice5,
    User
} from "lucide-react";

import { useLanguage } from "@/contexts/LanguageContext";
import { useClub } from "@/contexts/ClubContext";
import { useTitle } from "@/contexts/TitleContext";

export function Sidebar({ className }: { className?: string }) {
    const pathname = usePathname();
    const { logout, user } = useAuth();
    const { dict } = useLanguage();
    const { title, setTitle } = useTitle();
    const { clubId, availableClubs, switchClub, clubDoc } = useClub();

    const [editValue, setEditValue] = useState(title);
    const [isEditing, setIsEditing] = useState(false);
    const [memberName, setMemberName] = useState<string>("");
    const [showEmail, setShowEmail] = useState(true);

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

    return (
        <div className={cn("flex h-full w-64 flex-col border-r border-border/60 bg-secondary/40 backdrop-blur-xl text-card-foreground", className)}>
            <div className="flex h-16 items-center border-b border-border/60 px-6">
                {isEditing ? (
                    <input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleSave}
                        onKeyDown={handleKeyDown}
                        autoFocus
                        className="w-full bg-background/50 text-2xl font-bold font-heading border border-primary rounded px-2 py-1 outline-none text-foreground"
                    />
                ) : (
                    <div className="flex items-center w-full group">
                        <Link href="/dashboard" className="block truncate max-w-[170px] hover:opacity-80 transition-opacity cursor-pointer">
                            <h1
                                className="text-2xl font-black font-heading text-[#F5F0EB] truncate"
                                title={title}
                            >
                                {title}
                            </h1>
                        </Link>
                        <button
                            onClick={() => setIsEditing(true)}
                            className="ml-auto p-1.5 rounded-lg hover:bg-primary/20 transition-colors group/edit cursor-pointer"
                            aria-label="Edit Title"
                        >
                            <Beer className="h-5 w-5 text-accent shrink-0 transition-transform group-hover/edit:scale-110" />
                        </button>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
                {primaryGroups.map((group) => (
                    <div key={group.title} className="space-y-1">
                        <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                            {group.title}
                        </div>
                        <nav className="grid gap-1">
                            {group.items.map((item) => {
                                const isActive = item.match(pathname);
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 relative overflow-hidden",
                                            isActive
                                                ? "text-[#F5F0EB] bg-primary/18 border-l-2 border-primary shadow-sm"
                                                : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                                        )}
                                    >
                                        <item.icon className={cn("h-4 w-4 transition-transform duration-200", isActive ? "scale-110 text-primary" : "")} />
                                        <span className="truncate">{item.label}</span>
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                ))}
            </div>

            <div className="border-t border-border/60 p-4 space-y-2">
                {availableClubs.length > 1 && (
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

                {user && (
                    <div
                        onClick={() => setShowEmail(!showEmail)}
                        className="flex items-center gap-3 px-3 py-2 text-xs text-muted-foreground bg-muted/40 rounded-xl overflow-hidden cursor-pointer hover:bg-muted/70 transition-colors select-none"
                    >
                        <UserCircle className="h-4 w-4 shrink-0 text-accent" />
                        <span className="truncate font-medium">
                            {showEmail ? (user.email || "") : (memberName || "Member")}
                        </span>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-1 pt-1">
                    <Link
                        href="/profile"
                        className="flex items-center justify-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
                    >
                        <User className="h-3.5 w-3.5" />
                        Profil
                    </Link>

                    <button
                        onClick={() => logout()}
                        className="flex items-center justify-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold text-red-400/90 transition-all hover:bg-red-500/10 hover:text-red-400 cursor-pointer"
                    >
                        <LogOut className="h-3.5 w-3.5" />
                        Logout
                    </button>
                </div>
            </div>
        </div>
    );
}
