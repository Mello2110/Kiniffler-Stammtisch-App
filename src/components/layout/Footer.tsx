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
            <div className="w-full px-4 sm:px-6 lg:px-8 flex flex-col items-center gap-3 md:grid md:grid-cols-3 md:items-center">
                <div className="hidden md:block" aria-hidden="true" />
                {/* Offset by half of the fixed lg:w-64 sidebar (128px) so the brand lockup sits at the true viewport center */}
                <div className="flex items-center justify-center gap-2.5 lg:-translate-x-32">
                    <span className="text-xs sm:text-[13px] font-black tracking-[0.18em] text-primary/80 leading-none">KANPAI</span>
                    <span className="text-[11px] text-muted-foreground/60 font-medium lowercase leading-none">by</span>
                    <a
                        href="https://mellow-solutions-hub.vercel.app"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center opacity-80 hover:opacity-100 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 rounded-sm"
                        title="Mellow Solutions — Developer Hub & Portfolio"
                        aria-label="Mellow Solutions Developer Hub & Portfolio"
                    >
                        <img
                            src="/mellow-solutions-logo.png"
                            alt="Mellow Solutions"
                            className="h-5 sm:h-6 w-auto object-contain select-none"
                        />
                    </a>
                </div>
                <div className="flex items-center justify-center md:justify-end gap-4">
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
