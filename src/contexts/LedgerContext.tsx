"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { collection, query, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { LedgerEntry } from "@/types";

interface LedgerContextType {
    entries: LedgerEntry[];
    loading: boolean;
}

const LedgerContext = createContext<LedgerContextType>({
    entries: [],
    loading: true,
});

export function LedgerProvider({ children }: { children: ReactNode }) {
    const [entries, setEntries] = useState<LedgerEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, "ledger_entries"));
        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const fetched: LedgerEntry[] = [];
                snapshot.forEach((doc) => {
                    fetched.push({ id: doc.id, ...doc.data() } as LedgerEntry);
                });
                setEntries(fetched);
                setLoading(false);
            },
            (err) => {
                console.error("LedgerContext: error fetching ledger_entries", err);
                setLoading(false);
            }
        );
        return () => unsubscribe();
    }, []);

    return (
        <LedgerContext.Provider value={{ entries, loading }}>
            {children}
        </LedgerContext.Provider>
    );
}

export function useLedgerContext() {
    return useContext(LedgerContext);
}
