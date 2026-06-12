"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, query, onSnapshot, orderBy, limit } from "firebase/firestore";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { useFirestoreQuery } from "@/hooks/useFirestoreQuery";
import { CashBalance } from "@/components/cash/CashBalance";
import { ContributionTable } from "@/components/cash/ContributionTable";
import { ExpensesTable } from "@/components/cash/ExpensesTable";
import { DonationTable } from "@/components/cash/DonationTable";
import { OutstandingPayments } from "@/components/cash/OutstandingPayments";
import { TransactionHistory } from "@/components/cash/TransactionHistory";
import { AddPenaltyModal } from "@/components/stats/AddPenaltyModal";
import { EditPenaltyModal } from "@/components/stats/EditPenaltyModal";
import { EditExpenseModal } from "@/components/cash/EditExpenseModal";
import { EditLedgerEntryModal } from "@/components/cash/EditLedgerEntryModal";
import type { Member, Penalty, Expense, LedgerEntry } from "@/types";
import { Plus, Wallet, PiggyBank, History } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { EditableHeader } from "@/components/common/EditableHeader";
import { useAllLedgers } from "@/hooks/useLedger";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

export default function CashPage() {
    const { user } = useAuth();
    const [isPenaltyModalOpen, setIsPenaltyModalOpen] = useState(false);
    const [editingPenalty, setEditingPenalty] = useState<Penalty | null>(null);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [editingLedgerEntry, setEditingLedgerEntry] = useState<LedgerEntry | null>(null);
    const [isLoadingMembers, setIsLoadingMembers] = useState(true);
    const currentYear = new Date().getFullYear();

    // Fetch real members
    const qMembers = useMemo(() => query(collection(db, "members"), orderBy("name", "asc")), []);
    const { data: members, loading: membersLoading } = useFirestoreQuery<Member>(qMembers);

    // Fetch penalties (All for grouped view)
    const qPenalties = useMemo(() => query(collection(db, "penalties"), orderBy("createdAt", "desc")), []);
    const { data: penalties } = useFirestoreQuery<Penalty>(qPenalties);

    // Fetch all ledgers for transaction history
    const { entries: allLedgers } = useAllLedgers();

    useEffect(() => {
        if (!membersLoading) {
            setIsLoadingMembers(false);
        }
    }, [membersLoading]);

    const canManageFinance = useMemo(() => {
        if (!user || membersLoading) return false;
        return true; // GLOBAL ACCESS UNLOCKED FOR EVENT
    }, [user, members, membersLoading]);

    // Calculate total outstanding using the same "positive pool" algorithm as OutstandingPayments
    // This ensures the header value is always in sync with the list below.
    const totalOutstanding = useMemo(() => {
        const memberIds = new Set((members || []).map(m => m.id));
        const entriesByUser: { [uid: string]: number[] } = {};

        allLedgers.forEach(entry => {
            if (!memberIds.has(entry.userId)) return; // only real members
            if (!entriesByUser[entry.userId]) entriesByUser[entry.userId] = [];
            entriesByUser[entry.userId].push(entry.amount);
        });

        let total = 0;
        Object.values(entriesByUser).forEach(amounts => {
            const net = amounts.reduce((sum, a) => sum + a, 0);
            if (net < -0.01) total += Math.abs(net);
        });
        return total;
    }, [allLedgers, members]);

    return (
        <div className="space-y-8 pb-10 overflow-x-hidden">
            {/* Header */}
            {/* Header Section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 via-background to-background border p-8 md:p-12">
                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-4 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-wider uppercase">
                            <Wallet className="h-3 w-3" />
                            Treasury
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight outfit">
                            Cash <span className="text-primary italic">Flow</span>
                        </h1>
                        <p className="text-muted-foreground text-lg leading-relaxed">
                            Transparenz ist alles. Guthaben, Strafen und Ausgaben im Detail.
                            Jeder Cent zählt (besonders für das nächste Bier).
                        </p>
                    </div>

                    <div className="flex items-center gap-4 text-muted-foreground">
                        <Link
                            href="/cash/ledger"
                            className="flex items-center gap-2 bg-primary/10 text-primary hover:bg-primary/20 px-4 py-2 rounded-xl text-sm font-bold transition-colors"
                        >
                            <History className="h-4 w-4" />
                            PayPal Sync
                        </Link>
                        <div className="h-10 w-px bg-border mx-2" />
                        <div className="flex flex-col items-end">
                            <span className="text-2xl font-black text-foreground outfit">€</span>
                            <span className="text-xs uppercase font-bold tracking-widest">Euro</span>
                        </div>
                        <div className="h-10 w-px bg-border" />
                        <PiggyBank className="h-8 w-8 opacity-20" />
                    </div>
                </div>

                <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
            </div>

            {/* Top: Balance */}
            <ErrorBoundary fallbackTitle="Kassenstand konnte nicht geladen werden.">
                <CashBalance members={members || []} totalOutstanding={totalOutstanding} />
            </ErrorBoundary>

            <div className="grid gap-8 lg:grid-cols-1">
                {/* Section 1: Monthly Contributions */}
                <section className="space-y-4">
                    <EditableHeader
                        pageId="cash"
                        headerId="monthly-contributions-title"
                        defaultText="Monthly Contributions (€15)"
                        as="h2"
                        className="text-xl font-semibold"
                    />
                    {isLoadingMembers ? (
                        <div className="p-4 text-center text-muted-foreground">Lade Mitglieder...</div>
                    ) : (
                        <ErrorBoundary fallbackTitle="Beitragstabelle konnte nicht geladen werden.">
                            <ContributionTable
                                members={members}
                                currentYear={currentYear}
                                currentUserId={user?.uid || ""}
                                canManage={canManageFinance}
                            />
                        </ErrorBoundary>
                    )}
                </section>

                {/* Section: Spendenwürfeln */}
                <section className="space-y-4">
                    <EditableHeader
                        pageId="cash"
                        headerId="spendenwuerfeln-title"
                        defaultText="Spendenwürfeln"
                        as="h2"
                        className="text-xl font-semibold"
                    />
                    {isLoadingMembers ? (
                        <div className="p-4 text-center text-muted-foreground">Lade...</div>
                    ) : (
                        <ErrorBoundary fallbackTitle="Spendentabelle konnte nicht geladen werden.">
                            <DonationTable
                                members={members}
                                currentYear={currentYear}
                                currentUserId={user?.uid || ""}
                                canManage={canManageFinance}
                            />
                        </ErrorBoundary>
                    )}
                </section>

                <div className="grid gap-8 md:grid-cols-2 items-start">
                    {/* Section 2: Outstanding Payments */}
                    <section>
                        <ErrorBoundary fallbackTitle="Ausstehende Zahlungen konnten nicht geladen werden.">
                            <OutstandingPayments 
                                members={members || []}
                                canManage={canManageFinance}
                                onAddPenalty={() => setIsPenaltyModalOpen(true)}
                                onEditLedgerEntry={(entry) => setEditingLedgerEntry(entry)}
                            />
                        </ErrorBoundary>
                    </section>

                    {/* Section 3: Expenses */}
                    <section className="space-y-4">
                        <ErrorBoundary fallbackTitle="Ausgabentabelle konnte nicht geladen werden.">
                            <ExpensesTable
                                onEdit={(e) => setEditingExpense(e)}
                                canManage={canManageFinance}
                                members={members}
                            />
                        </ErrorBoundary>
                    </section>
                </div>

                {/* Section 4: Transaction History */}
                <section className="space-y-4">
                    <ErrorBoundary fallbackTitle="Transaktionsverlauf konnte nicht geladen werden.">
                        <TransactionHistory 
                            entries={allLedgers} 
                            members={members || []} 
                        />
                    </ErrorBoundary>
                </section>
            </div>

            {isPenaltyModalOpen && canManageFinance && (
                <AddPenaltyModal
                    onClose={() => setIsPenaltyModalOpen(false)}
                    members={members}
                />
            )}

            {editingPenalty && canManageFinance && (
                <EditPenaltyModal
                    penalty={editingPenalty}
                    members={members}
                    onClose={() => setEditingPenalty(null)}
                />
            )}

            {editingLedgerEntry && canManageFinance && (
                <EditLedgerEntryModal
                    entry={editingLedgerEntry}
                    onClose={() => setEditingLedgerEntry(null)}
                />
            )}

            {editingExpense && canManageFinance && (
                <EditExpenseModal
                    expense={editingExpense}
                    members={members}
                    onClose={() => setEditingExpense(null)}
                />
            )}
        </div>
    );
}
