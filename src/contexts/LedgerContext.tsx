"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { query, onSnapshot } from "firebase/firestore";
import { LedgerEntry } from "@/types";
import { useClub } from "@/contexts/ClubContext";

interface LedgerContextType {
    entries: LedgerEntry[];
    loading: boolean;
}

const LedgerContext = createContext<LedgerContextType>({
    entries: [],
    loading: true,
});

export function LedgerProvider({ children }: { children: ReactNode }) {
    const { clubId, clubCollection } = useClub();
    const [entries, setEntries] = useState<LedgerEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const q = query(clubCollection("ledger_entries"));
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
                console.error(`LedgerContext (${clubId}): error fetching ledger_entries`, err);
                setLoading(false);
            }
        );
        return () => unsubscribe();
    }, [clubId, clubCollection]);

    return (
        <LedgerContext.Provider value={{ entries, loading }}>
            {children}
        </LedgerContext.Provider>
    );
}

export function useLedgerContext() {
    return useContext(LedgerContext);
}
