"use client";

import { useState, useMemo } from "react";
import { collection, query, orderBy, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useFirestoreQuery } from "@/hooks/useFirestoreQuery";
import {
    ArrowUpRight,
    ArrowDownLeft,
    Search,
    Wallet
} from "lucide-react";
import type { LedgerEntry, Member } from "@/types";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface LedgerProps {
    members: Member[];
}

export function PayPalLedger({ members }: LedgerProps) {
    const [searchTerm, setSearchTerm] = useState("");

    const qTx = useMemo(() => query(
        collection(db, "ledger_entries"),
        orderBy("date", "desc")
    ), []);
    const { data: transactions, loading } = useFirestoreQuery<LedgerEntry>(qTx);

    const filteredTransactions = useMemo(() => {
        return transactions.filter(tx =>
            tx.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tx.type?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [transactions, searchTerm]);

    const getMemberName = (id?: string) => {
        if (!id) return null;
        return members.find(m => m.id === id)?.name || "Unknown Member";
    };

    if (loading && transactions.length === 0) {
        return <div className="p-8 text-center animate-pulse text-muted-foreground">Loading ledger entries...</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search ledger..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                </div>
            </div>

            <div className="rounded-3xl border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-muted/50 text-muted-foreground font-bold uppercase text-[10px] tracking-widest">
                            <tr>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Description / Type</th>
                                <th className="px-6 py-4 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredTransactions.map((tx) => (
                                <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                                    <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                                        {format(new Date(tx.date), 'dd.MM.yyyy HH:mm', { locale: de })}
                                    </td>
                                    <td className="px-6 py-4 font-bold">
                                        {getMemberName(tx.userId)}
                                    </td>
                                    <td className="px-6 py-4 max-w-xs">
                                        <div className="font-bold truncate">{tx.description}</div>
                                        <div className="text-xs text-muted-foreground truncate">{tx.type} {tx.paypalTxId ? `(PayPal ID: ${tx.paypalTxId})` : ''}</div>
                                    </td>
                                    <td className={`px-6 py-4 text-right font-black ${tx.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        <div className="flex items-center justify-end gap-1">
                                            {tx.amount > 0 ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                                            {tx.amount.toFixed(2)} €
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredTransactions.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                                        No transactions found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

