"use client";

import { useMemo, useState } from "react";
import { Info, CheckCircle2, ArrowDownRight, ArrowUpRight, Clock, ChevronDown } from "lucide-react";
import { collection, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useFirestoreQuery } from "@/hooks/useFirestoreQuery";
import { LedgerEntry, Member, LedgerTransactionCategory, Expense } from "@/types";
import { cn } from "@/lib/utils";

interface TransactionHistoryProps {
    entries: LedgerEntry[];
    members: Member[];
}

const TYPE_TRANSLATIONS: Record<LedgerTransactionCategory, string> = {
    paypal_deposit: "PayPal Einzahlung",
    paypal_withdrawal: "PayPal Auszahlung",
    contribution: "Monatsbeitrag",
    penalty: "Strafe",
    expense: "Ausgabe",
    donation: "Spende",
    refund: "Rückerstattung",
    uncategorized: "Sonstiges"
};

/**
 * Unified display entry — represents either a LedgerEntry or an Expense,
 * normalised into a common shape for display.
 */
interface DisplayEntry {
    id: string;
    date: any;       // ISO string or Firestore Timestamp
    amount: number;  // positive = Kassen-Einnahme, negative = Kassen-Abgang
    label: string;   // category / type label
    description: string;
    participantName: string;
    participantIsSystem: boolean;
    source: "ledger" | "expense";
}

/** Safely converts any Firestore date field to a sortable timestamp */
function toTimestamp(dateField: any): number {
    if (!dateField) return 0;
    if (typeof dateField === "object" && typeof dateField.toDate === "function") {
        return dateField.toDate().getTime();
    }
    const t = new Date(dateField).getTime();
    return isNaN(t) ? 0 : t;
}

/** Safely formats any Firestore date field to a readable German date */
function formatDate(dateField: any): string {
    if (!dateField) return "–";
    try {
        let d: Date;
        if (typeof dateField === "object" && typeof dateField.toDate === "function") {
            d = dateField.toDate();
        } else {
            d = new Date(dateField);
        }
        if (isNaN(d.getTime())) return "–";
        return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" });
    } catch {
        return "–";
    }
}

export function TransactionHistory({ entries, members }: TransactionHistoryProps) {
    const [isOpen, setIsOpen] = useState(false);

    // Fetch expenses directly — these are Kassen-Abgänge and must appear in the history
    const qExpenses = useMemo(() => query(collection(db, "expenses"), orderBy("date", "desc")), []);
    const { data: expenses } = useFirestoreQuery<Expense>(qExpenses);

    const getMemberName = (userId: string): string => {
        if (!userId || userId === "system") return "Kasse / System-Einzahlung";
        const member = members.find(m => m.id === userId);
        return member ? member.name : "Unbekannt";
    };

    /**
     * Merge ledger entries + expenses into a single sorted list.
     *
     * Expenses are Kassen-Abgänge: the Stammtisch spent money (negative from Kasse's perspective).
     * They show as negative, with "Kasse → [MemberName]" as the participant.
     * LedgerEntries are member-level bookings (contributions, PayPal deposits, penalties, etc.).
     */
    const sortedEntries = useMemo((): DisplayEntry[] => {
        const ledgerDisplayEntries: DisplayEntry[] = entries.map(entry => ({
            id: `ledger_${entry.id}`,
            date: entry.date,
            amount: entry.amount ?? 0,
            label: TYPE_TRANSLATIONS[entry.type] ?? entry.type,
            description: entry.description ?? "",
            participantName: getMemberName(entry.userId),
            participantIsSystem: entry.userId === "system",
            source: "ledger" as const,
        }));

        const expenseDisplayEntries: DisplayEntry[] = (expenses ?? []).map(exp => ({
            id: `expense_${exp.id}`,
            date: exp.date,
            amount: -(exp.amount ?? 0), // Negative: money left the Kasse
            label: "Ausgabe",
            description: exp.description ?? "",
            // "Kasse → MemberName" — shows who advanced the money on behalf of the Stammtisch
            participantName: exp.memberName ? `Kasse → ${exp.memberName}` : "Kasse (unzugeordnet)",
            participantIsSystem: true,
            source: "expense" as const,
        }));

        return [...ledgerDisplayEntries, ...expenseDisplayEntries]
            .sort((a, b) => toTimestamp(b.date) - toTimestamp(a.date));
    }, [entries, expenses, members]);

    return (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden flex flex-col mt-8">
            {/* Header — always visible, acts as toggle */}
            <button
                onClick={() => setIsOpen(prev => !prev)}
                className="p-4 md:p-6 border-b bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full text-left hover:bg-muted/30 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-primary" />
                    <div>
                        <h3 className="text-lg font-semibold">Transaktionsverlauf</h3>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {sortedEntries.length} Buchungen gesamt
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-start gap-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 p-3 rounded-lg max-w-sm">
                        <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        <p className="text-xs leading-relaxed">
                            PayPal-Zahlungen werden alle <strong>5 Minuten</strong> synchronisiert.
                            Sobald eine Zahlung hier erscheint, ist sie verbucht.
                        </p>
                    </div>
                    <ChevronDown
                        className={cn(
                            "h-5 w-5 text-muted-foreground transition-transform duration-200 flex-shrink-0",
                            isOpen && "rotate-180"
                        )}
                    />
                </div>
            </button>

            {/* Collapsible body */}
            {isOpen && (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead>
                            <tr className="border-b bg-muted/50 text-muted-foreground">
                                <th className="h-10 px-4 font-medium whitespace-nowrap">Datum</th>
                                <th className="h-10 px-4 font-medium">Beteiligte/r</th>
                                <th className="h-10 px-4 font-medium">Kategorie / Zweck</th>
                                <th className="h-10 px-4 font-medium text-center">Status</th>
                                <th className="h-10 px-4 font-medium text-right">Betrag</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedEntries.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                        Keine Transaktionen gefunden.
                                    </td>
                                </tr>
                            ) : (
                                sortedEntries.slice(0, 150).map((entry) => {
                                    const isPositive = entry.amount > 0;
                                    const isExpense = entry.source === "expense";

                                    return (
                                        <tr
                                            key={entry.id}
                                            className={cn(
                                                "border-b last:border-0 hover:bg-muted/30 transition-colors",
                                                isExpense && "bg-orange-500/3"
                                            )}
                                        >
                                            <td className="p-4 whitespace-nowrap text-muted-foreground">
                                                {formatDate(entry.date)}
                                            </td>
                                            <td className="p-4">
                                                <span className={cn(
                                                    "font-medium",
                                                    entry.participantIsSystem
                                                        ? "text-primary/80 italic"
                                                        : "text-foreground"
                                                )}>
                                                    {entry.participantName}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-foreground flex items-center gap-1.5">
                                                        {entry.label}
                                                        {isExpense && (
                                                            <span className="text-[10px] font-semibold bg-orange-500/15 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded-full">
                                                                Kassenabgang
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span
                                                        className="text-xs text-muted-foreground truncate max-w-[200px] md:max-w-[300px]"
                                                        title={entry.description}
                                                    >
                                                        {entry.description}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center justify-center gap-1.5 text-green-600 dark:text-green-500 bg-green-500/10 px-2 py-1 rounded-full w-fit mx-auto">
                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                    <span className="text-xs font-medium">Verbucht</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-right whitespace-nowrap">
                                                <div className={cn(
                                                    "font-bold flex items-center justify-end gap-1",
                                                    isPositive
                                                        ? "text-green-600 dark:text-green-400"
                                                        : "text-red-600 dark:text-red-400"
                                                )}>
                                                    {isPositive
                                                        ? <ArrowUpRight className="h-3.5 w-3.5" />
                                                        : <ArrowDownRight className="h-3.5 w-3.5" />
                                                    }
                                                    {isPositive ? "+" : ""}
                                                    €{Math.abs(entry.amount).toFixed(2)}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {isOpen && sortedEntries.length > 150 && (
                <div className="p-4 border-t bg-muted/10 text-center text-xs text-muted-foreground">
                    Anzeige ist auf die letzten 150 Transaktionen begrenzt.
                </div>
            )}
        </div>
    );
}
