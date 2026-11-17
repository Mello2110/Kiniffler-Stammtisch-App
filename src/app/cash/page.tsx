"use client";

import { useState, useEffect, useMemo } from "react";
import { query, orderBy } from "firebase/firestore";
import { useFirestoreQuery } from "@/hooks/useFirestoreQuery";
import { CashBalance } from "@/components/cash/CashBalance";
import { SmartPayDepositCard } from "@/components/cash/SmartPayDepositCard";
import { PendingDepositsCard } from "@/components/cash/PendingDepositsCard";
import { ContributionTable } from "@/components/cash/ContributionTable";
import { ExpensesTable } from "@/components/cash/ExpensesTable";
import { DonationTable } from "@/components/cash/DonationTable";
import { OutstandingPayments } from "@/components/cash/OutstandingPayments";
import { TransactionHistory } from "@/components/cash/TransactionHistory";
import { PayPalLedger } from "@/components/cash/PayPalLedger";
import { AddPenaltyModal } from "@/components/stats/AddPenaltyModal";
import { EditPenaltyModal } from "@/components/stats/EditPenaltyModal";
import { EditExpenseModal } from "@/components/cash/EditExpenseModal";
import { EditLedgerEntryModal } from "@/components/cash/EditLedgerEntryModal";
import type { Member, Penalty, Expense, LedgerEntry } from "@/types";
import { Wallet, PiggyBank, History } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useClub } from "@/contexts/ClubContext";
import { EditableHeader } from "@/components/common/EditableHeader";
import { useAllLedgers } from "@/hooks/useLedger";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { cn } from "@/lib/utils";

type CashTab = "outstanding" | "contributions" | "ledger";

export default function CashPage() {
    const { user } = useAuth();
    const { clubId, clubCollection } = useClub();
    const [isPenaltyModalOpen, setIsPenaltyModalOpen] = useState(false);
    const [editingPenalty, setEditingPenalty] = useState<Penalty | null>(null);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [editingLedgerEntry, setEditingLedgerEntry] = useState<LedgerEntry | null>(null);
    const [activeTab, setActiveTab] = useState<CashTab>("outstanding");
    const [isLoadingMembers, setIsLoadingMembers] = useState(true);
    const currentYear = new Date().getFullYear();

    // Fetch real members (club-scoped)
    const qMembers = useMemo(() => query(clubCollection("members"), orderBy("name", "asc")), [clubId, clubCollection]);
    const { data: members, loading: membersLoading } = useFirestoreQuery<Member>(qMembers);

    // Fetch penalties (All for grouped view, club-scoped)
    const qPenalties = useMemo(() => query(clubCollection("penalties"), orderBy("createdAt", "desc")), [clubId, clubCollection]);
    useFirestoreQuery<Penalty>(qPenalties);

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
    }, [user, membersLoading]);

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
        <div className="space-y-8 pb-10 max-w-full overflow-x-hidden">
            {/* Header Section */}
            <div className="relative overflow-hidden rounded-3xl kanpai-hero-banner border border-white/10 p-6 sm:p-8 md:p-10">
                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-3 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-bold tracking-wider uppercase border border-primary/25">
                            <Wallet className="h-3 w-3" />
                            Vereinskasse
                        </div>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight outfit">
                            Cash <span className="text-primary italic">Flow</span>
                        </h1>
                        <p className="text-sm sm:text-base text-muted-foreground">
                            Jeder Cent zählt (besonders für das nächste Bier).
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
                        <button
                            type="button"
                            onClick={() => setActiveTab("ledger")}
                            className="flex items-center gap-2 bg-primary/15 text-primary hover:bg-primary/25 border border-primary/25 px-4 py-2 rounded-xl text-sm font-bold transition-colors cursor-pointer"
                        >
                            <History className="h-4 w-4" />
                            PayPal Sync
                        </button>
                        <div className="hidden sm:block h-10 w-px bg-border mx-1" />
                        <div className="hidden sm:flex flex-col items-end">
                            <span className="text-2xl font-black text-foreground outfit">€</span>
                            <span className="text-xs uppercase font-bold tracking-widest">Euro</span>
                        </div>
                        <PiggyBank className="hidden sm:block h-8 w-8 text-accent/50" />
                    </div>
                </div>
            </div>

            {/* Top: Balance */}
            <ErrorBoundary fallbackTitle="Kassenstand konnte nicht geladen werden.">
                <CashBalance members={members || []} totalOutstanding={totalOutstanding} />
            </ErrorBoundary>

            {/* Phase 5: Self-Service Smart Deposit (QR-Code & PayPal.me Token Link) */}
            <ErrorBoundary fallbackTitle="Smart Deposit konnte nicht geladen werden.">
                <SmartPayDepositCard />
            </ErrorBoundary>

            {/* 1-Klick-Freigabe gemeldeter Einzahlungen (für Vereine im manual_confirm-Modus) */}
            <ErrorBoundary fallbackTitle="Zahlungsmeldungen konnten nicht geladen werden.">
                <PendingDepositsCard members={members || []} canManage={canManageFinance} />
            </ErrorBoundary>

            {/* Tabbed Finance Hub */}
            <div className="max-w-full overflow-x-hidden space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 p-1.5 rounded-2xl bg-card/70 border border-white/10 backdrop-blur-md">
                    <button
                        type="button"
                        onClick={() => setActiveTab("outstanding")}
                        className={cn(
                            "px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                            activeTab === "outstanding"
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                        )}
                    >
                        Offene Posten &amp; Strafen
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab("contributions")}
                        className={cn(
                            "px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                            activeTab === "contributions"
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                        )}
                    >
                        Beiträge, Spenden &amp; Ausgaben
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab("ledger")}
                        className={cn(
                            "px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                            activeTab === "ledger"
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                        )}
                    >
                        PayPal-Ledger &amp; Sync
                    </button>
                </div>

                {activeTab === "outstanding" && (
                    <div className="space-y-8 max-w-full overflow-x-hidden">
                        <section className="max-w-full overflow-x-auto">
                            <ErrorBoundary fallbackTitle="Ausstehende Zahlungen konnten nicht geladen werden.">
                                <OutstandingPayments
                                    members={members || []}
                                    canManage={canManageFinance}
                                    onAddPenalty={() => setIsPenaltyModalOpen(true)}
                                    onEditLedgerEntry={(entry) => setEditingLedgerEntry(entry)}
                                />
                            </ErrorBoundary>
                        </section>

                        <section className="space-y-4 max-w-full overflow-x-auto">
                            <ErrorBoundary fallbackTitle="Transaktionsverlauf konnte nicht geladen werden.">
                                <TransactionHistory
                                    entries={allLedgers}
                                    members={members || []}
                                />
                            </ErrorBoundary>
                        </section>
                    </div>
                )}

                {activeTab === "contributions" && (
                    <div className="space-y-8 max-w-full overflow-x-hidden">
                        {/* Section 1: Monthly Contributions */}
                        <section className="space-y-4 max-w-full overflow-x-auto">
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
                        <section className="space-y-4 max-w-full overflow-x-auto">
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

                        {/* Section 3: Expenses */}
                        <section className="space-y-4 max-w-full overflow-x-auto">
                            <ErrorBoundary fallbackTitle="Ausgabentabelle konnte nicht geladen werden.">
                                <ExpensesTable
                                    onEdit={(e) => setEditingExpense(e)}
                                    canManage={canManageFinance}
                                    members={members}
                                />
                            </ErrorBoundary>
                        </section>
                    </div>
                )}

                {activeTab === "ledger" && (
                    <div className="max-w-full overflow-x-auto">
                        <ErrorBoundary fallbackTitle="PayPal-Ledger konnte nicht geladen werden.">
                            <PayPalLedger members={members || []} />
                        </ErrorBoundary>
                    </div>
                )}
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
