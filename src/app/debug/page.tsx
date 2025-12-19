"use client";

import { useState } from "react";
import { collection, getDocs, deleteDoc, doc, setDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, Trash2, CheckCircle2, AlertTriangle } from "lucide-react";

export default function DebugPage() {
    const [isResetting, setIsResetting] = useState(false);
    const [message, setMessage] = useState("");

    const handleResetCash = async () => {
        if (!confirm("Are you SURE? This will delete ALL penalties, contributions, and expenses!")) return;

        setIsResetting(true);
        setMessage("Deleting data...");

        try {
            const batch = writeBatch(db);

            // 1. Delete Penalties
            const penSnap = await getDocs(collection(db, "penalties"));
            penSnap.docs.forEach(d => batch.delete(d.ref));

            // 2. Delete Contributions
            const conSnap = await getDocs(collection(db, "contributions"));
            conSnap.docs.forEach(d => batch.delete(d.ref));

            // 3. Delete Expenses
            const expSnap = await getDocs(collection(db, "expenses"));
            expSnap.docs.forEach(d => batch.delete(d.ref));

            // 4. Reset Config
            batch.set(doc(db, "config", "cash"), { startingBalance: 0 });

            await batch.commit();

            setMessage("Success! Cash balance is now 0 and history is cleared.");
        } catch (error: any) {
            console.error(error);
            setMessage("Error: " + error.message);
        } finally {
            setIsResetting(false);
        }
    };

    const handleGlobalReset = async () => {
        if (!confirm("⚠️ DANGER: This will delete ALL EVENTS, ALL POINTS, ALL VOTES, and ALL CASH DATA. Are you absolutely sure?")) return;

        setIsResetting(true);
        setMessage("Performing Master Reset...");

        try {
            const batch = writeBatch(db);

            // Helper to delete all docs in a collection
            const deleteCollection = async (path: string) => {
                const snap = await getDocs(collection(db, path));
                snap.docs.forEach(d => batch.delete(d.ref));
            };

            // 1. Delete All Collections
            await deleteCollection("set_events");
            await deleteCollection("stammtisch_votes");
            await deleteCollection("points");
            await deleteCollection("penalties");
            await deleteCollection("contributions");
            await deleteCollection("expenses");

            // 2. Reset Members Points (optional fallback)
            const membersSnap = await getDocs(collection(db, "members"));
            membersSnap.docs.forEach(d => {
                batch.update(d.ref, { points: 0 });
            });

            // 3. Reset Config
            batch.set(doc(db, "config", "cash"), { startingBalance: 0 });

            await batch.commit();

            setMessage("MASTER RESET COMPLETE. All data has been wiped.");
        } catch (error: any) {
            console.error(error);
            setMessage("Error: " + error.message);
        } finally {
            setIsResetting(false);
        }
    };

    return (
        <div className="p-8 max-w-xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold text-red-600 flex items-center gap-2">
                <Trash2 /> Debug / Reset
            </h1>

            <div className="space-y-6">
                <div className="p-6 border border-destructive/20 bg-destructive/5 rounded-xl space-y-4">
                    <h2 className="text-xl font-semibold">Reset Cash System</h2>
                    <p className="text-muted-foreground">
                        This will delete all penalties, contributions, and expenses.
                    </p>
                    <button
                        onClick={handleResetCash}
                        disabled={isResetting}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {isResetting ? <Loader2 className="animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        Wipe Cash Data Only
                    </button>
                </div>

                <div className="p-6 border border-red-600/50 bg-red-600/5 rounded-xl space-y-4 animate-in slide-in-from-bottom-4">
                    <h2 className="text-xl font-bold text-red-600 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        DANGER ZONE: Master Reset
                    </h2>
                    <p className="text-muted-foreground">
                        This will wipe the <strong>ENTIRE DATABASE</strong>: Events, Votes, Points, and Cash History.
                        Use this to start completely fresh.
                    </p>
                    <button
                        onClick={handleGlobalReset}
                        disabled={isResetting}
                        className="w-full bg-red-600 text-white px-4 py-3 rounded-lg font-bold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isResetting ? <Loader2 className="animate-spin" /> : <Trash2 className="h-5 w-5" />}
                        DELETE EVERYTHING (Factory Reset)
                    </button>
                </div>

                {message && (
                    <div className="p-3 bg-white rounded border flex items-center gap-2 animate-in fade-in">
                        <CheckCircle2 className="text-green-500 h-5 w-5" />
                        {message}
                    </div>
                )}
            </div>
        </div>
    );
}
