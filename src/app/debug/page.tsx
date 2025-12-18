"use client";

import { useState } from "react";
import { collection, getDocs, deleteDoc, doc, setDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, Trash2, CheckCircle2 } from "lucide-react";

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

    return (
        <div className="p-8 max-w-xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold text-red-600 flex items-center gap-2">
                <Trash2 /> Debug / Reset
            </h1>

            <div className="p-6 border border-destructive/20 bg-destructive/5 rounded-xl space-y-4">
                <h2 className="text-xl font-semibold">Reset Cash System</h2>
                <p className="text-muted-foreground">
                    This will delete all penalties, contributions, and expenses from the database.
                    The calculated balance will become €0.00.
                </p>

                <button
                    onClick={handleResetCash}
                    disabled={isResetting}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                    {isResetting ? <Loader2 className="animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Wipe Cash Data & Reset to 0
                </button>

                {message && (
                    <div className="p-3 bg-white rounded border flex items-center gap-2">
                        <CheckCircle2 className="text-green-500 h-5 w-5" />
                        {message}
                    </div>
                )}
            </div>
        </div>
    );
}
