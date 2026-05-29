import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LedgerEntry } from '@/types';
import { useLedgerContext } from '@/contexts/LedgerContext';

export function useLedger(userId?: string) {
    const [entries, setEntries] = useState<LedgerEntry[]>([]);
    const [balance, setBalance] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!userId) {
            setEntries([]);
            setBalance(0);
            setLoading(false);
            return;
        }

        setLoading(true);
        const q = query(
            collection(db, 'ledger_entries'),
            where('userId', '==', userId)
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const fetchedEntries: LedgerEntry[] = [];
                let currentBalance = 0;

                snapshot.forEach((doc) => {
                    const data = doc.data() as Omit<LedgerEntry, 'id'>;
                    const entry = { id: doc.id, ...data };
                    fetchedEntries.push(entry);
                    currentBalance += entry.amount;
                });

                // Sort by date descending
                fetchedEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                setEntries(fetchedEntries);
                setBalance(currentBalance);
                setLoading(false);
                setError(null);
            },
            (err) => {
                console.error("Error fetching ledger entries:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [userId]);

    return { entries, balance, loading, error };
}

/**
 * Returns ALL ledger entries from the shared LedgerContext.
 * Uses a single Firestore subscription shared across the whole app — no duplicate listeners.
 */
export function useAllLedgers() {
    const { entries, loading } = useLedgerContext();
    return { entries, loading, error: null };
}

