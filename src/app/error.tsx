"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error);
    }, [error]);

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background text-foreground animate-in fade-in zoom-in-95 duration-300">
            <div className="rounded-full bg-red-500/10 p-6">
                <AlertTriangle className="h-12 w-12 text-red-500" />
            </div>
            <div className="text-center space-y-2 max-w-md px-4">
                <h2 className="text-2xl font-black outfit tracking-tight">
                    Hoppla! Etwas ist schiefgelaufen.
                </h2>
                <p className="text-muted-foreground text-sm">
                    Ein unerwarteter Fehler ist aufgetreten. Wir wurden benachrichtigt und kümmern uns darum.
                </p>
                {process.env.NODE_ENV === "development" && (
                    <div className="mt-4 p-4 bg-red-950/20 text-red-200 text-xs font-mono rounded-lg text-left overflow-auto max-h-40 max-w-full">
                        {error.message}
                    </div>
                )}
            </div>
            <button
                onClick={() => reset()}
                className="mt-4 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 hover:scale-105 transition-all"
            >
                <RotateCcw className="h-4 w-4" />
                Erneut versuchen
            </button>
        </div>
    );
}
