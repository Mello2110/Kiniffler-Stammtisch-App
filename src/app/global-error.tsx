"use client";

import { useEffect } from "react";
import { AlertOctagon } from "lucide-react";
import "./globals.css"; // Ensure fonts/styles load if possible

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <html lang="de" className="dark">
            <body className="antialiased min-h-screen flex items-center justify-center bg-black/95 text-white">
                <div className="flex flex-col items-center gap-6 p-8 text-center max-w-lg">
                    <AlertOctagon className="h-20 w-20 text-red-600 animate-pulse" />
                    <h1 className="text-4xl font-black tracking-tighter">Kritischer Fehler</h1>
                    <p className="text-gray-400">
                        Die Anwendung konnte nicht geladen werden. Bitte lade die Seite neu oder versuche es später.
                    </p>
                    <button
                        onClick={() => reset()}
                        className="px-6 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform"
                    >
                        Seite neu laden
                    </button>
                </div>
            </body>
        </html>
    );
}
