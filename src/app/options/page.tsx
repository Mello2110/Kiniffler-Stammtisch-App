"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, deleteDoc, doc, writeBatch, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Trash2, AlertTriangle, Settings, Languages, Database } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

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
        // const checkAdmin = async () => {
        //     if (!user) return;
        //     const docRef = doc(db, "members", user.uid);
        //     const docSnap = await getDoc(docRef);
        //     if (docSnap.exists() && docSnap.data().isAdmin) {
        //         setIsAdmin(true);
        //     }
        // };
        // checkAdmin();
        setIsAdmin(true); // GLOBAL ACCESS UNLOCKED FOR EVENT
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

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 via-background to-background border p-8 md:p-12">
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

                    <div className="flex items-center gap-4 text-muted-foreground">
                        <Settings className="h-8 w-8 opacity-20" />
                    </div>
                </div>

                <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
            </div>

            <div className="grid gap-8 lg:grid-cols-2 items-stretch">
                {/* Language Settings */}
                <section className="flex flex-col space-y-4">
                    <div className="flex items-center gap-2 text-xl font-bold">
                        <Languages className="w-6 h-6 text-primary" />
                        {dict.options.language}
                    </div>
                    <p className="text-muted-foreground min-h-[3rem] hidden md:block">{dict.options.languageDesc}</p>

                    <div className="flex-1 border border-border bg-card/30 p-8 rounded-3xl flex flex-col justify-center gap-6">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
                            <button
                                onClick={() => setLanguage('de')}
                                className={cn(
                                    "aspect-square p-4 rounded-2xl border-2 transition-all hover:border-primary/50 flex flex-col items-center justify-center gap-3",
                                    language === 'de' ? "border-primary bg-primary/10 scale-105 shadow-lg shadow-primary/10" : "border-border bg-card hover:bg-muted/50"
                                )}
                            >
                                <span className="text-4xl">🇩🇪</span>
                                <span className="font-bold">Deutsch</span>
                            </button>
                            <button
                                onClick={() => setLanguage('en')}
                                className={cn(
                                    "aspect-square p-4 rounded-2xl border-2 transition-all hover:border-primary/50 flex flex-col items-center justify-center gap-3",
                                    language === 'en' ? "border-primary bg-primary/10 scale-105 shadow-lg shadow-primary/10" : "border-border bg-card hover:bg-muted/50"
                                )}
                            >
                                <span className="text-4xl">🇺🇸</span>
                                <span className="font-bold">English</span>
                            </button>
                            <button
                                onClick={() => setLanguage('pl')}
                                className={cn(
                                    "aspect-square p-4 rounded-2xl border-2 transition-all hover:border-primary/50 flex flex-col items-center justify-center gap-3",
                                    language === 'pl' ? "border-primary bg-primary/10 scale-105 shadow-lg shadow-primary/10" : "border-border bg-card hover:bg-muted/50"
                                )}
                            >
                                <span className="text-4xl">🇵🇱</span>
                                <span className="font-bold">Polski</span>
                            </button>
                        </div>
                    </div>
                </section>

                {/* Data Management */}
                <section className="flex flex-col space-y-4">
                    <div className="flex items-center gap-2 text-xl font-bold">
                        <Database className="w-6 h-6 text-red-500" />
                        {dict.options.data}
                    </div>
                    <p className="text-muted-foreground min-h-[3rem] hidden md:block">{dict.options.dataDesc}</p>

                    <div className="flex-1 border border-red-500/50 bg-red-500/5 p-8 rounded-3xl flex flex-col justify-between space-y-6">
                        <div className="space-y-4">
                            <h3 className="font-bold text-red-500 flex items-center gap-2 text-lg">
                                <AlertTriangle className="w-6 h-6" />
                                {dict.options.resetTitle}
                            </h3>
                            <p className="text-muted-foreground leading-relaxed">
                                {dict.options.resetDesc}
                            </p>
                        </div>

                        <div className="space-y-4 mt-auto">
                            <button
                                onClick={handleReset}
                                disabled={isResetting || !isAdmin}
                                title={!isAdmin ? "Nur für Admins verfügbar" : undefined}
                                className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-lg shadow-red-900/20"
                            >
                                <Trash2 className="w-5 h-5" />
                                {isResetting ? dict.options.resetProcessing : dict.options.resetBtn}
                            </button>

                            {/* Mini Logs */}
                            {logs.length > 0 && (
                                <div className="bg-black/40 p-3 rounded-lg border font-mono text-xs h-32 overflow-y-auto">
                                    {logs.map((log, i) => (
                                        <div key={i} className="py-0.5">
                                            {log.startsWith("✅") ? <span className="text-green-400">{log}</span> :
                                                log.startsWith("❌") ? <span className="text-red-400">{log}</span> :
                                                    <span className="text-muted-foreground">{log}</span>}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {status && (
                                <div className={`text-center font-bold text-sm ${status.includes("Error") ? "text-red-500" : "text-green-500"}`}>
                                    {status}
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
