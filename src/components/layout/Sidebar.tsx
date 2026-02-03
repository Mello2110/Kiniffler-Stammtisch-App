"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
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
    Crown,
    Beer,
    MessageSquarePlus,
    Dice5,
    User
} from "lucide-react";

import { useLanguage } from "@/contexts/LanguageContext";

import { useTitle } from "@/contexts/TitleContext";

export function Sidebar({ className }: { className?: string }) {
    const pathname = usePathname();
    const { logout, user } = useAuth();
    const { dict } = useLanguage();
    const { title, setTitle } = useTitle();

    // Local state for editing value before save
    const [editValue, setEditValue] = useState(title);
    const [isEditing, setIsEditing] = useState(false);
    const [memberName, setMemberName] = useState<string>("");
    const [showEmail, setShowEmail] = useState(true);

    const [isAdmin, setIsAdmin] = useState(false);

    // Sync editValue when title changes externally (though rare) or when entering edit mode
    useEffect(() => {
        setEditValue(title);
    }, [title]);

    useEffect(() => {
        const fetchMemberData = async () => {
            if (user?.uid) {
                try {
                    const docRef = doc(db, "members", user.uid);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        setMemberName(data.name || "Member");
                        setIsAdmin(!!data.isAdmin);
                    }
                } catch (error) {
                    console.error("Error fetching member data:", error);
                }
            }
        };
        fetchMemberData();
    }, [user]);

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

    const navItems = [
        { icon: LayoutDashboard, label: dict.sidebar.dashboard, href: "/dashboard" },
        { icon: Calendar, label: dict.sidebar.events, href: "/events" },
        { icon: Dice5, label: dict.sidebar.kniffel, href: "/kniffel" },
        { icon: Trophy, label: dict.sidebar.stats, href: "/stats" },
        { icon: DollarSign, label: dict.sidebar.finances, href: "/cash" },
        { icon: ImageIcon, label: dict.sidebar.gallery, href: "/gallery" },
        { icon: Users, label: dict.sidebar.members, href: "/members" },
        { icon: Crown, label: dict.sidebar.hof, href: "/hall-of-fame" },
        { icon: MessageSquarePlus, label: dict.sidebar.feedback, href: "/feedback" },
        { icon: Settings, label: dict.sidebar.options, href: "/options" },
    ];

    return (
        <div className={cn("flex h-full w-64 flex-col border-r border-secondary/20 bg-secondary/30 backdrop-blur-md text-card-foreground", className)}>
            <div className="flex h-16 items-center border-b border-secondary/20 px-6">
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
                                className="text-2xl font-bold font-heading bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent truncate"
                                title={title}
                            >
                                {title}
                            </h1>
                        </Link>
                        <button
                            onClick={() => setIsEditing(true)}
                            className="ml-2 p-1 rounded-md hover:bg-primary/20 transition-colors group/edit"
                            aria-label="Edit Title"
                        >
                            <Beer
                                className={cn(
                                    "h-6 w-6 text-primary shrink-0 transition-transform group-hover/edit:scale-110",
                                )}
                            />
                        </button>
                    </div>
                )}
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
                                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300 relative overflow-hidden group/item",
                                    isActive
                                        ? "text-primary shadow-[0_0_20px_rgba(124,58,237,0.15)] bg-gradient-to-r from-primary/10 to-transparent border-l-2 border-primary"
                                        : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                                )}
                            >
                                <item.icon className={cn("h-4 w-4 transition-transform duration-300", isActive && "scale-110")} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
            </div>
            <div className="border-t border-border p-4">
                {user && (
                    <div
                        onClick={() => setShowEmail(!showEmail)}
                        className="mb-3 flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground bg-muted/50 rounded-lg overflow-hidden cursor-pointer hover:bg-muted/80 transition-colors select-none"
                    >
                        <UserCircle className="h-4 w-4 shrink-0" />
                        <span className="truncate">
                            {showEmail ? (user.email || "") : (memberName || "Member")}
                        </span>
                    </div>
                )}

                <Link
                    href="/profile"
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
                >
                    <User className="h-4 w-4" />
                    Mein Profil
                </Link>

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
