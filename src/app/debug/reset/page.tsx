"use client";

import { useState } from "react";
import { collection, getDocs, deleteDoc, doc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Trash2, AlertTriangle, CheckCircle } from "lucide-react";

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

export default function ResetDataPage() {
    const [status, setStatus] = useState<string>("");
    const [isResetting, setIsResetting] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

    const handleReset = async () => {
        if (!confirm("ARE YOU SURE? This will delete ALL data. This cannot be undone.")) return;

        setIsResetting(true);
        setStatus("Starting reset...");
        setLogs([]);

        try {
            for (const colName of COLLECTIONS_TO_RESET) {
                addLog(`Fetching ${colName}...`);
                const snap = await getDocs(collection(db, colName));

                if (snap.empty) {
                    addLog(`Populated 0 ${colName}. Skipping.`);
                    continue;
                }

                addLog(`Deleting ${snap.size} documents from ${colName}...`);

                // Firestore batches are limited to 500 ops
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
            setStatus("Reset Complete!");
        } catch (error: any) {
            console.error(error);
            setStatus(`Error: ${error.message}`);
            addLog(`❌ Error: ${error.message}`);
        } finally {
            setIsResetting(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto p-4 space-y-8">
            <div className="border border-red-500/50 bg-red-500/10 p-8 rounded-3xl text-center space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 text-red-500 mb-4">
                    <Trash2 className="w-8 h-8" />
                </div>
                <h1 className="text-3xl font-bold font-heading text-red-500">Danger Zone</h1>
                <p className="text-muted-foreground">
                    This tool helps you wipe all application data.
                    Use this to clear test data and start fresh.
                </p>

                <button
                    onClick={handleReset}
                    disabled={isResetting}
                    className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isResetting ? (
                        <>Processing...</>
                    ) : (
                        <>
                            <AlertTriangle className="w-5 h-5" />
                            DELETE EVERYTHING
                        </>
                    )}
                </button>
            </div>

            {/* Logs */}
            <div className="bg-black/40 p-6 rounded-2xl border font-mono text-sm h-64 overflow-y-auto">
                {logs.length === 0 && <span className="text-muted-foreground opacity-50">Waiting for command...</span>}
                {logs.map((log, i) => (
                    <div key={i} className="py-1 border-b border-border/50 last:border-0">
                        {log.startsWith("✅") ? <span className="text-green-400">{log}</span> :
                            log.startsWith("❌") ? <span className="text-red-400">{log}</span> :
                                <span className="text-muted-foreground">{log}</span>}
                    </div>
                ))}
            </div>

            {status && (
                <div className={`text-center font-bold ${status.includes("Error") ? "text-red-500" : "text-green-500"}`}>
                    {status}
                </div>
            )}
        </div>
    );
}
