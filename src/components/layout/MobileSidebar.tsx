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
    MessageSquarePlus,
    Dice5,
    X,
    User
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { ProfileModal } from "@/components/profile/ProfileModal";

interface MobileSidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
    const pathname = usePathname();
    const { logout, user } = useAuth();
    const { dict } = useLanguage();
    const [memberName, setMemberName] = useState<string>("");
    const [showProfileModal, setShowProfileModal] = useState(false);

    useEffect(() => {
        const fetchMemberData = async () => {
            if (user?.uid) {
                try {
                    const docRef = doc(db, "members", user.uid);
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
    }, [user]);

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

    const handleNavClick = () => {
        onClose();
    };

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
                "fixed inset-y-0 left-0 z-50 w-[85%] max-w-[320px] bg-secondary/95 backdrop-blur-md border-r border-white/10 shadow-2xl",
                "animate-in slide-in-from-left duration-300 lg:hidden",
                "flex flex-col"
            )}>
                {/* Header - Close Button */}
                <div className="flex items-center justify-between h-16 px-5 border-b border-white/10">
                    <span className="text-xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                        Menu
                    </span>
                    <button
                        onClick={onClose}
                        className="flex items-center justify-center w-12 h-12 rounded-xl text-muted-foreground hover:bg-white/10 active:bg-primary/20 transition-colors"
                        aria-label="Close menu"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Navigation Items - 64px height, 18px font */}
                <nav className="flex-1 overflow-y-auto py-4 px-3">
                    <div className="flex flex-col gap-3">
                        {navItems.map((item, index) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={index}
                                    href={item.href}
                                    onClick={handleNavClick}
                                    className={cn(
                                        "flex items-center gap-4 rounded-xl px-5 min-h-[64px] text-lg font-medium transition-all duration-200",
                                        isActive
                                            ? "bg-primary/15 text-primary border-l-4 border-primary shadow-[0_0_20px_rgba(124,58,237,0.1)]"
                                            : "text-foreground/80 hover:bg-white/10 active:bg-primary/10 border-l-4 border-transparent"
                                    )}
                                >
                                    <item.icon className={cn(
                                        "h-7 w-7 shrink-0 transition-transform",
                                        isActive && "scale-110 text-primary"
                                    )} />
                                    <span className="truncate">{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                </nav>

                {/* Footer - User Info & Logout */}
                <div className="border-t border-white/10 p-4 space-y-3">
                    {user && (
                        <div className="flex items-center gap-3 px-4 py-3 text-sm text-muted-foreground bg-white/5 rounded-xl">
                            <UserCircle className="h-6 w-6 shrink-0" />
                            <div className="flex flex-col min-w-0">
                                <span className="font-medium text-foreground truncate">{memberName || "Member"}</span>
                                <span className="text-xs truncate">{user.email}</span>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={() => {
                            setShowProfileModal(true);
                            onClose();
                        }}
                        className="flex w-full items-center gap-4 rounded-xl px-5 min-h-[56px] text-base font-medium text-foreground/80 hover:bg-white/10 active:bg-primary/10 transition-colors"
                    >
                        <User className="h-6 w-6" />
                        Mein Profil
                    </button>

                    <button
                        onClick={() => {
                            logout();
                            onClose();
                        }}
                        className="flex w-full items-center gap-4 rounded-xl px-5 min-h-[56px] text-base font-medium text-red-400 hover:bg-red-500/10 active:bg-red-500/20 transition-colors"
                    >
                        <LogOut className="h-6 w-6" />
                        Log out
                    </button>
                </div>
            </div>

            {/* Profile Modal */}
            <ProfileModal
                isOpen={showProfileModal}
                onClose={() => setShowProfileModal(false)}
            />
        </>
    );
}
