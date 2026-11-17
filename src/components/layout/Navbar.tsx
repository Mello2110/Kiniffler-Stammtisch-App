"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { MobileSidebar } from "./MobileSidebar";
import { useTitle } from "@/contexts/TitleContext";
// SyncStatusBadge removed

export function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();
    const { title } = useTitle();

    // Close mobile menu when route changes
    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    // Prevent body scroll when sidebar is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    return (
        <>
            <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-border/60 bg-background/85 px-4 backdrop-blur-xl lg:hidden">
                <Link href="/dashboard" className="flex items-center gap-2 font-black text-lg hover:opacity-80 transition-opacity active:opacity-60">
                    <span className="text-[#F5F0EB] max-w-[180px] truncate outfit">
                        {title}
                    </span>
                </Link>

                <div className="flex items-center gap-2">
                    {/* SyncStatusBadge removed */}
                    {/* Hamburger Button - 48x48px touch target */}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className={cn(
                            "flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-200",
                            isOpen
                                ? "bg-primary/20 text-primary"
                                : "text-muted-foreground hover:bg-white/10 active:bg-primary/20"
                        )}
                        aria-label={isOpen ? "Close menu" : "Open menu"}
                        aria-expanded={isOpen}
                    >
                        {isOpen ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
                    </button>
                </div>
            </header>

            {/* Mobile Sidebar Overlay */}
            <MobileSidebar isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </>
    );
}
