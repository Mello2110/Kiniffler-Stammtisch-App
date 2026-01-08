"use client";

import { RefreshCw } from "lucide-react";

export function Footer() {
    const handleForceUpdate = async () => {
        if (!confirm("App wirklich neu laden? Dies leert den Cache.")) return;

        try {
            // 1. Unregister Service Workers
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const registration of registrations) {
                    await registration.unregister();
                }
            }

            // 2. Clear Caches
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                for (const name of cacheNames) {
                    await caches.delete(name);
                }
            }

            // 3. Reload
            window.location.reload();
        } catch (error) {
            console.error("Cache clear failed:", error);
            window.location.reload();
        }
    };

    return (
        <footer className="w-full border-t border-border py-6 text-sm text-muted-foreground bg-background/50 backdrop-blur-sm">
            <div className="w-full px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 items-center gap-4">
                <div className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity justify-self-start">
                    <img src="/kanpai-logo.png" alt="KANPAI" className="h-6 w-6 object-contain" />
                    <span className="text-xs font-bold tracking-widest text-[#8B5CF6]">KANPAI</span>
                </div>
                <div className="justify-self-center flex flex-col items-center gap-1">
                    <p className="text-center whitespace-nowrap">
                        &copy; {new Date().getFullYear()} Stammtisch Dashboard. <span className="opacity-50 text-xs">v1.2.0</span> All rights reserved.
                    </p>
                    <button
                        onClick={handleForceUpdate}
                        className="text-[10px] uppercase tracking-widest bg-primary/10 hover:bg-primary/20 text-primary px-2 py-1 rounded-md transition-colors flex items-center gap-1"
                    >
                        <RefreshCw className="h-3 w-3" />
                        App Aktualisieren
                    </button>
                </div>
            </div>
        </footer>
    );
}
