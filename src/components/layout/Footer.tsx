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
        <footer className="w-full border-t border-border py-4 text-xs text-muted-foreground bg-background/50 backdrop-blur-sm">
            <div className="w-full px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 opacity-70">
                    <span className="font-bold tracking-widest text-primary/70">KANPAI</span>
                </div>
                <div className="flex items-center gap-4">
                    <p className="text-center whitespace-nowrap opacity-70">
                        &copy; {new Date().getFullYear()} Stammtisch Dashboard. v1.2.0
                    </p>
                    <button
                        onClick={handleForceUpdate}
                        className="opacity-50 hover:opacity-100 transition-opacity flex items-center gap-1 text-primary"
                        title="App aktualisieren"
                    >
                        <RefreshCw className="h-3 w-3" />
                    </button>
                </div>
            </div>
        </footer>
    );
}
