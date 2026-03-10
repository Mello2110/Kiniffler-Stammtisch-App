"use client";

import { useState, useMemo } from "react";
import { collection, query, orderBy, doc, updateDoc } from "firebase/firestore";
import { db, syncPayPalTransactions } from "@/lib/firebase";
import { useFirestoreQuery } from "@/hooks/useFirestoreQuery";
import {
    ArrowUpRight,
    ArrowDownLeft,
    RefreshCw,
    CheckCircle2,
    HelpCircle,
    Link as LinkIcon,
    Search
} from "lucide-react";
import type { PayPalTransaction, Member } from "@/types";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface PayPalLedgerProps {
    members: Member[];
}

export function PayPalLedger({ members }: PayPalLedgerProps) {
    const [isSyncing, setIsSyncing] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const qTx = useMemo(() => query(
        collection(db, "paypal_transactions"),
        orderBy("date", "desc")
    ), []);
    const { data: transactions, loading } = useFirestoreQuery<PayPalTransaction>(qTx);

    const filteredTransactions = useMemo(() => {
        return transactions.filter(tx =>
            tx.payerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tx.payerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tx.note?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [transactions, searchTerm]);

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            await syncPayPalTransactions();
            // Firestore listener will auto-update
        } catch (err) {
            console.error("Sync failed:", err);
            alert("Sync failed. Check console for details.");
        } finally {
            setIsSyncing(false);
        }
    };

    const getMemberName = (id?: string) => {
        if (!id) return null;
        return members.find(m => m.id === id)?.name || "Unknown Member";
    };

    const handleManualAssign = async (txId: string, memberId: string) => {
        if (!memberId) return;
        try {
            const txRef = doc(db, "paypal_transactions", txId);
            await updateDoc(txRef, {
                assignedMemberId: memberId
            });
        } catch (err) {
            console.error("Assignment failed:", err);
            alert("Fehler bei der Zuordnung.");
        }
    };

    const handleCategoryChange = async (txId: string, category: string) => {
        try {
            const txRef = doc(db, "paypal_transactions", txId);
            await updateDoc(txRef, { category });
        } catch (err) {
            console.error("Category update failed:", err);
        }
    };

    if (loading && transactions.length === 0) {
        return <div className="p-8 text-center animate-pulse text-muted-foreground">Loading transactions...</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search transactions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                </div>

                <button
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                    <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? "Syncing..." : "Sync with PayPal"}
                </button>
            </div>

            <div className="rounded-3xl border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-muted/50 text-muted-foreground font-bold uppercase text-[10px] tracking-widest">
                            <tr>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Payer / Note</th>
                                <th className="px-6 py-4 text-right">Amount</th>
                                <th className="px-6 py-4">Assignment</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredTransactions.map((tx) => (
                                <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {tx.status === 'COMPLETED' ? (
                                                <div className="h-2 w-2 rounded-full bg-green-500" title="Completed" />
                                            ) : (
                                                <div className="h-2 w-2 rounded-full bg-yellow-500" title={tx.status} />
                                            )}
                                            {tx.isReconciled ? (
                                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                            ) : (
                                                <HelpCircle className="h-4 w-4 text-muted-foreground/40" />
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                                        {format(new Date(tx.date), 'dd.MM.yyyy HH:mm', { locale: de })}
                                    </td>
                                    <td className="px-6 py-4 max-w-xs">
                                        <div className="font-bold truncate">{tx.payerName || tx.payerEmail || "Unknown"}</div>
                                        <div className="text-xs text-muted-foreground truncate">{tx.note}</div>
                                    </td>
                                    <td className={`px-6 py-4 text-right font-black ${tx.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        <div className="flex items-center justify-end gap-1">
                                            {tx.amount > 0 ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                                            {tx.amount.toFixed(2)} {tx.currency}
                                        </div>
                                        {tx.fee !== 0 && (
                                            <div className="text-[10px] text-muted-foreground font-medium">Fee: {tx.fee?.toFixed(2)}</div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-2">
                                            <select
                                                value={tx.category}
                                                onChange={(e) => handleCategoryChange(tx.id, e.target.value)}
                                                className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-full w-fit outline-none cursor-pointer border-none appearance-none ${tx.category === 'contribution' ? 'bg-blue-500/10 text-blue-500' :
                                                    tx.category === 'penalty' ? 'bg-red-500/10 text-red-500' :
                                                        tx.category === 'expense' ? 'bg-purple-500/10 text-purple-500' :
                                                            'bg-zinc-500/10 text-zinc-500'
                                                    }`}
                                            >
                                                <option value="contribution">Contribution</option>
                                                <option value="penalty">Penalty</option>
                                                <option value="expense">Expense</option>
                                                <option value="donation">Donation</option>
                                                <option value="refund">Refund</option>
                                                <option value="uncategorized">Uncategorized</option>
                                            </select>

                                            {tx.assignedMemberId ? (
                                                <div className="flex items-center gap-1 text-xs font-medium text-foreground bg-muted/50 px-2 py-1 rounded-lg w-fit">
                                                    <LinkIcon className="h-3 w-3" />
                                                    {getMemberName(tx.assignedMemberId)}
                                                </div>
                                            ) : (
                                                <select
                                                    onChange={(e) => handleManualAssign(tx.id, e.target.value)}
                                                    className="text-xs bg-primary/5 hover:bg-primary/10 border-primary/20 rounded-lg px-2 py-1 outline-none transition-colors max-w-[150px]"
                                                >
                                                    <option value="">Zuordnen...</option>
                                                    {members.map(m => (
                                                        <option key={m.id} value={m.id}>{m.name}</option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredTransactions.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
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
