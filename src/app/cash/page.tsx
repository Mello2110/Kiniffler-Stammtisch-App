"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, query, onSnapshot, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useFirestoreQuery } from "@/hooks/useFirestoreQuery";
import type { Member, Penalty } from "@/types";
import { CashBalance } from "@/components/cash/CashBalance";
import { ContributionTable } from "@/components/cash/ContributionTable";
import { ExpensesTable } from "@/components/cash/ExpensesTable";
import { DonationTable } from "@/components/cash/DonationTable";
import { PenaltyTable } from "@/components/stats/PenaltyTable";
import { AddPenaltyModal } from "@/components/stats/AddPenaltyModal";
import { EditPenaltyModal } from "@/components/stats/EditPenaltyModal";
import { EditExpenseModal } from "@/components/cash/EditExpenseModal";
import { Plus, Wallet, PiggyBank } from "lucide-react";
import type { Expense } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

export default function CashPage() {
    const { user } = useAuth();
    const [isPenaltyModalOpen, setIsPenaltyModalOpen] = useState(false);
    const [editingPenalty, setEditingPenalty] = useState<Penalty | null>(null);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [isLoadingMembers, setIsLoadingMembers] = useState(true);
    const currentYear = new Date().getFullYear();

    // Fetch real members
    const qMembers = useMemo(() => query(collection(db, "members"), orderBy("name", "asc")), []);
    const { data: members, loading: membersLoading } = useFirestoreQuery<Member>(qMembers);

    // Fetch penalties (Recent 50)
    const qPenalties = useMemo(() => query(collection(db, "penalties"), orderBy("createdAt", "desc"), limit(50)), []);
    const { data: penalties } = useFirestoreQuery<Penalty>(qPenalties);

    useEffect(() => {
        if (!membersLoading) {
            setIsLoadingMembers(false);
        }
    }, [membersLoading]);

    const canManageFinance = useMemo(() => {
        if (!user || membersLoading) return false;
        const currentMember = members.find(m => m.id === user.uid);
        if (!currentMember) return false;

        return currentMember.isAdmin || currentMember.role?.toLowerCase() === "kassenwart";
    }, [user, members, membersLoading]);

    return (
        <div className="space-y-8 pb-10">
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
            <CashBalance />

            <div className="grid gap-8 lg:grid-cols-1">
                {/* Section 1: Monthly Contributions */}
                <section className="space-y-4">
                    <h2 className="text-xl font-semibold">Monthly Contributions (€15)</h2>
                    {isLoadingMembers ? (
                        <div className="p-4 text-center text-muted-foreground">Lade Mitglieder...</div>
                    ) : (
                        <ContributionTable
                            members={members}
                            currentYear={currentYear}
                            currentUserId={user?.uid || ""}
                            canManage={canManageFinance}
                        />
                    )}
                </section>

                {/* Section: Spendenwürfeln */}
                <section className="space-y-4">
                    <h2 className="text-xl font-semibold">Spendenwürfeln</h2>
                    {isLoadingMembers ? (
                        <div className="p-4 text-center text-muted-foreground">Lade...</div>
                    ) : (
                        <DonationTable
                            members={members}
                            currentYear={currentYear}
                            currentUserId={user?.uid || ""}
                            canManage={canManageFinance}
                        />
                    )}
                </section>

                <div className="grid gap-8 md:grid-cols-2 items-start">
                    {/* Section 2: Penalties (Existing) */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between h-[34px]">
                            <h2 className="text-xl font-semibold">Penalties</h2>
                            {canManageFinance && (
                                <button
                                    onClick={() => setIsPenaltyModalOpen(true)}
                                    className="text-xs bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1"
                                >
                                    <Plus className="h-3 w-3" /> Add Penalty
                                </button>
                            )}
                        </div>
                        <PenaltyTable
                            penalties={penalties}
                            members={members}
                            onEdit={(p) => setEditingPenalty(p)}
                            canManage={canManageFinance}
                        />
                    </section>

                    {/* Section 3: Expenses (New) */}
                    <section className="space-y-4">
                        {/* Header handled inside ExpensesTable for state access */}
                        <ExpensesTable
                            onEdit={(e) => setEditingExpense(e)}
                            canManage={canManageFinance}
                        />
                    </section>
                </div>
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

            {editingExpense && canManageFinance && (
                <EditExpenseModal
                    expense={editingExpense}
                    onClose={() => setEditingExpense(null)}
                />
            )}
        </div>
    );
}
