"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, doc, writeBatch, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { Trash2, AlertTriangle, Settings, Languages, Database, Users, ShieldAlert, Image as ImageIcon, MessageSquarePlus, User, ArrowUpRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useClub } from "@/contexts/ClubContext";
import { cn } from "@/lib/utils";
import NotificationSettings from "@/components/settings/NotificationSettings";
import { ClubAdminStudio } from "@/components/settings/ClubAdminStudio";

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
    const { clubId, clubCollection, clubDoc } = useClub();
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const checkAdmin = async () => {
            if (!user) {
                setIsAdmin(false);
                return;
            }
            const docRef = clubDoc("members", user.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists() && docSnap.data().isAdmin) {
                setIsAdmin(true);
            } else {
                setIsAdmin(false);
            }
        };
        checkAdmin();
    }, [user, clubId, clubDoc]);

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
                const snap = await getDocs(clubCollection(colName));

                if (snap.empty) {
                    addLog(`Populated 0 ${colName}. Skipping.`);
                    continue;
                }

                addLog(`Deleting ${snap.size} docs from ${colName}...`);

                const chunks = [];
                let currentChunk = writeBatch(db);
                let count = 0;

                snap.docs.forEach((docSnap) => {
                    currentChunk.delete(clubDoc(colName, docSnap.id));
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
    const assignRandomAvatars = async () => {
        if (!confirm("Dies wird allen Mitgliedern eine zufällige Avatar-Farbe zuweisen. Fortfahren?")) return;

        const { AVATAR_COLOR_KEYS } = await import("@/lib/avatarColors");

        setIsResetting(true);
        setStatus("Assigning random avatars...");
        setLogs([]);
        addLog("Starting avatar randomization...");

        try {
            const membersSnap = await getDocs(clubCollection("members"));
            addLog(`Found ${membersSnap.size} members.`);

            let updatedCount = 0;
            const chunks = [];
            let currentChunk = writeBatch(db);
            let chunkCount = 0;

            membersSnap.docs.forEach((docSnap) => {
                const randomKey = AVATAR_COLOR_KEYS[Math.floor(Math.random() * AVATAR_COLOR_KEYS.length)];

                currentChunk.update(clubDoc("members", docSnap.id), {
                    avatar: {
                        icon: "",
                        bgColor: randomKey
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
        <div className="space-y-8 pb-10 max-w-7xl mx-auto w-full overflow-x-hidden">
            {/* Header */}
            <div className="relative overflow-hidden rounded-3xl kanpai-hero-banner border border-white/10 p-6 sm:p-8 md:p-10 shadow-sm">
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

            {/* Vereins-Schnellzugriff (besonders praktisch am Smartphone über Tab 'Club') */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { href: "/members", label: "Mitglieder", desc: "Kader & Rollen", icon: Users },
                    { href: "/gallery", label: "Galerie", desc: "Fotos & Abende", icon: ImageIcon },
                    { href: "/feedback", label: "Feedback", desc: "Ideen & Bugs", icon: MessageSquarePlus },
                    { href: "/profile", label: "Mein Profil", desc: "Avatar & Konto", icon: User },
                ].map((item) => {
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="group rounded-2xl border border-white/10 bg-card/60 hover:bg-card/90 hover:border-primary/40 p-3.5 sm:p-4 transition-all flex items-center justify-between gap-2"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="p-2 rounded-xl bg-primary/15 text-primary shrink-0">
                                    <Icon className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-sm font-bold truncate">{item.label}</div>
                                    <div className="text-[11px] text-muted-foreground truncate">{item.desc}</div>
                                </div>
                            </div>
                            <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
                        </Link>
                    );
                })}
            </div>

            {/* Phase 2, 3, 5 & 6: KANPAI Multi-Tenant Club, Design & Regelwerk Studio */}
            <ClubAdminStudio />

            {/* Grid Layout - 3 Columns on Large Screens */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
                {/* 1. Language Settings (kompakt) */}
                <div className="bg-card/60 backdrop-blur-sm border border-white/10 p-5 rounded-3xl flex flex-col justify-between gap-4">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-base font-bold">
                            <Languages className="w-5 h-5 text-primary" />
                            {dict.options.language}
                        </div>
                        <p className="text-xs text-muted-foreground">{dict.options.languageDesc}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { code: "de", flag: "🇩🇪", label: "DE" },
                            { code: "en", flag: "🇺🇸", label: "EN" },
                            { code: "pl", flag: "🇵🇱", label: "PL" }
                        ].map((lang) => (
                            <button
                                key={lang.code}
                                onClick={() => setLanguage(lang.code as any)}
                                className={cn(
                                    "py-2.5 px-3 rounded-xl border transition-all flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer",
                                    language === lang.code
                                        ? "border-primary bg-primary/15 text-[#F5F0EB] shadow-sm"
                                        : "border-white/10 bg-black/20 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                                )}
                            >
                                <span className="text-base">{lang.flag}</span>
                                <span>{lang.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* 2. Notification Settings */}
                <div className="lg:col-span-2 flex flex-col">
                    <NotificationSettings />
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
                        <div className="bg-accent/5 border-accent/20 border p-6 rounded-3xl flex flex-col gap-4">
                            <div className="flex items-center gap-3 text-accent font-bold text-lg">
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
                                    "bg-accent hover:bg-accent/85 text-accent-foreground shadow-sm"
                                )}
                            >
                                <Users className="w-4 h-4" />
                                Random Avatars
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

            {/* Troubleshooting Section (Available for everyone) */}
            <div className="mt-8 pt-8 border-t border-dashed border-border/50">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-orange-500/5 border-orange-500/20 border p-6 rounded-3xl flex flex-col gap-4">
                        <div className="flex items-center gap-3 text-orange-600 font-bold text-lg">
                            <AlertTriangle className="w-5 h-5" />
                            Troubleshooting / App Reparieren
                        </div>
                        <p className="text-sm text-muted-foreground flex-1">
                            Falls du Darstellungsfehler hast, alte Versionen siehst oder Push-Nachrichten nicht ankommen: Dies löscht den App-Cache und erzwingt ein Update.
                        </p>
                        <button
                            onClick={async () => {
                                if (!confirm("Dies wird die App bereinigen und neu laden. Fortfahren?")) return;

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
                            className={cn(
                                "w-full py-3 font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm",
                                "bg-orange-600 hover:bg-orange-700 text-white shadow-orange-900/10"
                            )}
                        >
                            <AlertTriangle className="w-4 h-4" />
                            App Reparieren & Update erzwingen
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
