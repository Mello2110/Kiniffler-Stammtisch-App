"use client";

import React, { useState, useEffect } from "react";
import { onSnapshotsInSync } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export function SyncStatusBadge({ className }: { className?: string }) {
    const [isOnline, setIsOnline] = useState<boolean>(
        typeof navigator !== "undefined" ? navigator.onLine : true
    );
    const [isSynced, setIsSynced] = useState<boolean>(true);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const handleOnline = () => {
            setIsOnline(true);
            setIsSynced(false);
        };
        const handleOffline = () => {
            setIsOnline(false);
        };

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        const unsubSync = onSnapshotsInSync(db, () => {
            setIsSynced(true);
        });

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
            unsubSync();
        };
    }, []);

    return (
        <div
            className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all select-none",
                !isOnline
                    ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                    : !isSynced
                        ? "bg-blue-500/15 border-blue-500/30 text-blue-400"
                        : "bg-emerald-500/10 border-emerald-500/25 text-emerald-400",
                className
            )}
            title={
                !isOnline
                    ? "Offline-Modus: Änderungen werden lokal im IndexedDB-Cache gespeichert und automatisch synchronisiert, sobald wieder Verbindung besteht."
                    : "Echtzeit-Synchronisation mit Firestore aktiv"
            }
        >
            {!isOnline ? (
                <>
                    <WifiOff className="h-3 w-3" />
                    <span>Offline-Cache</span>
                </>
            ) : !isSynced ? (
                <>
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    <span>Sync...</span>
                </>
            ) : (
                <>
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Live-Sync</span>
                </>
            )}
        </div>
    );
}
