"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, doc, writeBatch, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Trash2, AlertTriangle, Settings, Languages, Database, Users, ShieldAlert } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import NotificationSettings from "@/components/settings/NotificationSettings";

const COLLECTIONS_TO_RESET = [
    "members",
    "stammtisch_votes",
    "set_events",
    "penalties",
    "contributions",
    "donations",
    "expenses",
    "points"
];

export default function OptionsPage() {
    const { dict, language, setLanguage } = useLanguage();
    const { user } = useAuth();
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const checkAdmin = async () => {
            if (!user) {
                setIsAdmin(false);
                return;
            }
            const docRef = doc(db, "members", user.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists() && docSnap.data().isAdmin) {
                setIsAdmin(true);
            } else {
                setIsAdmin(false);
            }
        };
        checkAdmin();
    }, [user]);

    // Reset Logic
    const [status, setStatus] = useState<string>("");
    const [isResetting, setIsResetting] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

    const handleReset = async () => {
        if (!confirm(dict.options.resetConfirm)) return;

        setIsResetting(true);
        setStatus(dict.options.resetProcessing);
        setLogs([]);

        try {
            for (const colName of COLLECTIONS_TO_RESET) {
                addLog(`Fetching ${colName}...`);
                const snap = await getDocs(collection(db, colName));

                if (snap.empty) {
                    addLog(`Populated 0 ${colName}. Skipping.`);
                    continue;
                }

                addLog(`Deleting ${snap.size} docs from ${colName}...`);

                const chunks = [];
                let currentChunk = writeBatch(db);
                let count = 0;

                snap.docs.forEach((docSnap) => {
                    currentChunk.delete(doc(db, colName, docSnap.id));
                    count++;
                    if (count === 499) {
                        chunks.push(currentChunk);
                        currentChunk = writeBatch(db);
                        count = 0;
                    }
                });
                if (count > 0) chunks.push(currentChunk);

                await Promise.all(chunks.map(chunk => chunk.commit()));
                addLog(`✅ Cleared ${colName}`);
            }
            setStatus(dict.options.resetSuccess);
        } catch (error: any) {
            console.error(error);
            setStatus(`Error: ${error.message}`);
            addLog(`❌ Error: ${error.message}`);
        } finally {
            setIsResetting(false);
        }
    };

    // --- RANDOM AVATAR UTILITY (Temporary/Admin) ---
    const AVATAR_ICONS = [
        "Dog", "Cat", "Bird", "Fish", "Bug", "Squirrel", "Rabbit",
        "Beer", "Coffee", "Gamepad2", "Music", "Camera", "Palette", "Book", "Bike", "Car",
        "Dumbbell", "Trophy", "Target", "Dice5", "Plane", "Mountain",
        "Star", "Heart", "Zap", "Flame", "Sun", "Moon", "Sparkles",
        "User", "UserCircle", "Smile", "Ghost"
    ];

    const AVATAR_COLORS = [
        "bg-purple-500", "bg-blue-500", "bg-green-500", "bg-yellow-500", "bg-red-500",
        "bg-pink-500", "bg-indigo-500", "bg-teal-500", "bg-orange-500"
    ];

    const assignRandomAvatars = async () => {
        if (!confirm("Dies wird allen Mitgliedern ein zufälliges Avatar (Icon & Farbe) zuweisen. Fortfahren?")) return;

        setIsResetting(true);
        setStatus("Assigning random avatars...");
        setLogs([]);
        addLog("Starting avatar randomization...");

        try {
            const membersSnap = await getDocs(collection(db, "members"));
            addLog(`Found ${membersSnap.size} members.`);

            let updatedCount = 0;
            const chunks = [];
            let currentChunk = writeBatch(db);
            let chunkCount = 0;

            membersSnap.docs.forEach((docSnap) => {
                const randomIcon = AVATAR_ICONS[Math.floor(Math.random() * AVATAR_ICONS.length)];
                const randomColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

                currentChunk.update(doc(db, "members", docSnap.id), {
                    avatar: {
                        icon: randomIcon,
                        bgColor: randomColor
                    }
                });

                updatedCount++;
                chunkCount++;

                if (chunkCount === 499) {
                    chunks.push(currentChunk);
                    currentChunk = writeBatch(db);
                    chunkCount = 0;
                }
            });

            if (chunkCount > 0) chunks.push(currentChunk);

            await Promise.all(chunks.map(chunk => chunk.commit()));

            addLog(`✅ Successfully updated ${updatedCount} members with random avatars.`);
            setStatus("Avatars updated successfully!");
        } catch (error: any) {
            console.error(error);
            setStatus(`Error: ${error.message}`);
            addLog(`❌ Error: ${error.message}`);
        } finally {
            setIsResetting(false);
        }
    };

    return (
        <div className="space-y-8 pb-10 max-w-7xl mx-auto">
            {/* Header */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 via-background to-background border p-8 md:p-12 shadow-sm">
                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-4 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-wider uppercase">
                            <Settings className="h-3 w-3" />
                            {dict.headers.options.badge}
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight outfit">
                            {dict.headers.options.title} <span className="text-primary italic">{dict.headers.options.highlight}</span>
                        </h1>
                        <p className="text-muted-foreground text-lg leading-relaxed">
                            {dict.headers.options.subtext}
                        </p>
                    </div>
                </div>
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
            </div>

            {/* Grid Layout - 3 Columns on Large Screens */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">

                {/* 1. Language Settings */}
                <div className="flex flex-col h-full space-y-4">
                    <div className="flex items-center gap-2 text-xl font-bold px-2">
                        <Languages className="w-6 h-6 text-primary" />
                        {dict.options.language}
                    </div>
                    <div className="flex-1 bg-card/50 backdrop-blur-sm border border-border p-6 rounded-3xl flex flex-col gap-6 shadow-sm hover:shadow-md transition-shadow">
                        <p className="text-muted-foreground">{dict.options.languageDesc}</p>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-auto">
                            {[
                                { code: 'de', flag: '🇩🇪', label: 'Deutsch' },
                                { code: 'en', flag: '🇺🇸', label: 'English' },
                                { code: 'pl', flag: '🇵🇱', label: 'Polski' }
                            ].map((lang) => (
                                <button
                                    key={lang.code}
                                    onClick={() => setLanguage(lang.code as any)}
                                    className={cn(
                                        "aspect-square p-2 rounded-2xl border-2 transition-all hover:border-primary/50 flex flex-col items-center justify-center gap-2",
                                        language === lang.code
                                            ? "border-primary bg-primary/10 scale-105 shadow-md shadow-primary/10 ring-2 ring-primary/20"
                                            : "border-border bg-card/50 hover:bg-muted/50"
                                    )}
                                >
                                    <span className="text-3xl filter drop-shadow-sm">{lang.flag}</span>
                                    <span className="font-bold text-sm text-foreground/80">{lang.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 2. Notification Settings - Spans 2 cols on XL if needed or just 1 */}
                <div className="flex flex-col h-full space-y-4 xl:col-span-2">
                    <NotificationSettings />
                </div>

                {/* 3. Data Management (Admin) */}
                <div className="flex flex-col h-full space-y-4 xl:col-span-3"> {/* Full width on very large screens for admin stuff, or adapt */}
                    {/* Actually, let's put it back to normal grid flow for better responsiveness */}
                </div>

            </div>

            {/* Admin Section Separated for Safety */}
            {isAdmin && (
                <div className="mt-12 pt-8 border-t border-dashed border-border/50">
                    <div className="flex items-center gap-2 text-xl font-bold px-2 mb-6 text-red-500">
                        <ShieldAlert className="w-6 h-6" />
                        Admin Zone
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Data Reset Card */}
                        <div className="bg-red-500/5 border-red-500/20 border p-6 rounded-3xl flex flex-col gap-4">
                            <div className="flex items-center gap-3 text-red-600 font-bold text-lg">
                                <Database className="w-5 h-5" />
                                {dict.options.resetTitle}
                            </div>
                            <p className="text-sm text-muted-foreground flex-1">
                                {dict.options.resetDesc}
                            </p>
                            <button
                                onClick={handleReset}
                                disabled={isResetting}
                                className={cn(
                                    "w-full py-3 font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm",
                                    "bg-red-600 hover:bg-red-700 text-white shadow-red-900/10"
                                )}
                            >
                                <Trash2 className="w-4 h-4" />
                                {isResetting ? dict.options.resetProcessing : dict.options.resetBtn}
                            </button>
                        </div>

                        {/* Random Avatars Card */}
                        <div className="bg-indigo-500/5 border-indigo-500/20 border p-6 rounded-3xl flex flex-col gap-4">
                            <div className="flex items-center gap-3 text-indigo-600 font-bold text-lg">
                                <Users className="w-5 h-5" />
                                Avatar Generator
                            </div>
                            <p className="text-sm text-muted-foreground flex-1">
                                Assigns random avatars to all users. Useful for testing.
                            </p>
                            <button
                                onClick={assignRandomAvatars}
                                disabled={isResetting}
                                className={cn(
                                    "w-full py-3 font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm",
                                    "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-900/10"
                                )}
                            >
                                <Users className="w-4 h-4" />
                                Random Avatars
                            </button>
                        </div>

                        {/* Temporary Fix Button */}
                        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-3xl space-y-4">
                            <div className="font-bold text-red-500 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5" />
                                Troubleshooting
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Klicke hier, falls Push-Benachrichtigungen nicht funktionieren (löscht Cache & SW).
                            </p>
                            <button
                                onClick={async () => {
                                    if (!confirm("Dies wird die App neustarten und dich ausloggen. Fortfahren?")) return;

                                    try {
                                        // Unregister SW
                                        const registrations = await navigator.serviceWorker.getRegistrations();
                                        for (const registration of registrations) {
                                            await registration.unregister();
                                        }

                                        // Clear Cache
                                        const cacheKeys = await caches.keys();
                                        await Promise.all(cacheKeys.map(key => caches.delete(key)));

                                        alert("Reset erfolgreich! Die Seite lädt jetzt neu.");
                                        window.location.reload();
                                    } catch (e) {
                                        alert("Fehler: " + e);
                                    }
                                }}
                                className="w-full py-2 px-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors"
                            >
                                App Reparieren (Reset)
                            </button>
                        </div>

                        {/* Console Card */}
                        {(logs.length > 0 || status) && (
                            <div className="bg-card border border-border p-4 rounded-3xl font-mono text-xs overflow-hidden flex flex-col h-full max-h-[300px]">
                                <div className="font-bold text-muted-foreground mb-2 flex justify-between">
                                    <span>Console Log</span>
                                    {status && <span className={status.includes("Error") ? "text-red-500" : "text-green-500"}>{status}</span>}
                                </div>
                                <div className="overflow-y-auto flex-1 space-y-1 pr-2 custom-scrollbar">
                                    {logs.map((log, i) => (
                                        <div key={i} className="break-all">
                                            {log.startsWith("✅") ? <span className="text-green-600 dark:text-green-400">{log}</span> :
                                                log.startsWith("❌") ? <span className="text-red-600 dark:text-red-400">{log}</span> :
                                                    <span className="text-muted-foreground">{log}</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
