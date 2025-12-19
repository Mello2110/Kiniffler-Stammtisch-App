"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sidebar } from "./Sidebar";
import { useTitle } from "@/contexts/TitleContext";

export function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();
    const { title } = useTitle();

    // Close mobile menu when route changes
    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    return (
        <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-secondary/20 bg-secondary/30 px-6 backdrop-blur-md lg:hidden">
            <div className="flex items-center gap-2 font-bold text-lg">
                <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent max-w-[200px] truncate">
                    {title}
                </span>
            </div>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
            >
                <span className="sr-only">Open main menu</span>
                {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>

            {/* Mobile Menu Overlay */}
            {isOpen && (
                <div className="absolute top-16 left-0 right-0 h-[calc(100vh-4rem)] border-b border-border bg-background p-4 animate-in slide-in-from-top-5">
                    {/* Reuse Sidebar styles/logic but inline for mobile simple view, or just mount Sidebar? 
                Mounting Sidebar might have width issues. Let's make a simplified mobile list.
            */}
                    <div className="flex flex-col gap-4">
                        <Sidebar className="w-full border-none shadow-none" />
                    </div>
                </div>
            )}
        </header>
    );
}
