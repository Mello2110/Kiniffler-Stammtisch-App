import { useMemo } from 'react';
import { LedgerEntry } from '@/types';
import { useLedgerContext } from '@/contexts/LedgerContext';

export function useLedger(userId?: string) {
    const { entries: allEntries, loading } = useLedgerContext();

    const { entries, balance } = useMemo(() => {
        if (!userId) {
            return { entries: [] as LedgerEntry[], balance: 0 };
        }
        const filtered = allEntries
            .filter(e => e.userId === userId)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const sum = filtered.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
        return { entries: filtered, balance: sum };
    }, [allEntries, userId]);

    return { entries, balance, loading, error: null };
}

/**
 * Returns ALL ledger entries from the shared club-scoped LedgerContext.
 * Uses a single Firestore subscription shared across the whole app — no duplicate listeners.
 */
export function useAllLedgers() {
    const { entries, loading } = useLedgerContext();
    return { entries, loading, error: null };
}
