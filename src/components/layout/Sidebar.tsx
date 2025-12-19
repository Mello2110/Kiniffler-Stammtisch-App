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
    Beer
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

    // Sync editValue when title changes externally (though rare) or when entering edit mode
    useEffect(() => {
        setEditValue(title);
    }, [title]);

    useEffect(() => {
        const fetchMemberName = async () => {
            if (user?.uid) {
                try {
                    const docRef = doc(db, "members", user.uid);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        setMemberName(docSnap.data().name || "Member");
                    }
                } catch (error) {
                    console.error("Error fetching member name:", error);
                }
            }
        };
        fetchMemberName();
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
        { icon: LayoutDashboard, label: dict.sidebar.dashboard, href: "/" },
        { icon: Calendar, label: dict.sidebar.events, href: "/events" },
        { icon: Trophy, label: dict.sidebar.stats, href: "/stats" },
        { icon: DollarSign, label: dict.sidebar.finances, href: "/cash" },
        { icon: ImageIcon, label: dict.sidebar.gallery, href: "/gallery" },
        { icon: Users, label: dict.sidebar.members, href: "/members" },
        { icon: Crown, label: dict.sidebar.hof, href: "/hall-of-fame" },
        { icon: Settings, label: dict.sidebar.options, href: "/options" },
    ];

    return (
        <div className={cn("flex h-full w-64 flex-col border-r border-border bg-card text-card-foreground", className)}>
            <div className="flex h-16 items-center border-b border-border px-6">
                {isEditing ? (
                    <input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleSave}
                        onKeyDown={handleKeyDown}
                        autoFocus
                        className="w-full bg-background text-2xl font-bold font-heading border border-primary rounded px-2 py-1 outline-none text-foreground"
                    />
                ) : (
                    <div className="flex items-center w-full group">
                        <h1
                            className="text-2xl font-bold font-heading bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent truncate max-w-[170px]"
                            title={title}
                        >
                            {title}
                        </h1>
                        <Beer
                            onClick={() => setIsEditing(true)}
                            className="ml-2 h-6 w-6 text-primary cursor-pointer transition-transform hover:scale-110 hover:drop-shadow-sm shrink-0"
                        />
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
