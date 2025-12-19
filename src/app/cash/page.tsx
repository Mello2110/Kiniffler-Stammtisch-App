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
import { Plus } from "lucide-react";
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

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Cash Management</h1>
                <p className="text-muted-foreground">Overview of funds, contributions, and expenses.</p>
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
                        <ContributionTable members={members} currentYear={currentYear} currentUserId={user?.uid || ""} />
                    )}
                </section>

                {/* Section: Spendenwürfeln */}
                <section className="space-y-4">
                    <h2 className="text-xl font-semibold">Spendenwürfeln</h2>
                    {isLoadingMembers ? (
                        <div className="p-4 text-center text-muted-foreground">Lade...</div>
                    ) : (
                        <DonationTable members={members} currentYear={currentYear} currentUserId={user?.uid || ""} />
                    )}
                </section>

                <div className="grid gap-8 md:grid-cols-2 items-start">
                    {/* Section 2: Penalties (Existing) */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between h-[34px]">
                            <h2 className="text-xl font-semibold">Penalties</h2>
                            <button
                                onClick={() => setIsPenaltyModalOpen(true)}
                                className="text-xs bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1"
                            >
                                <Plus className="h-3 w-3" /> Add Penalty
                            </button>
                        </div>
                        <PenaltyTable
                            penalties={penalties}
                            members={members}
                            onEdit={(p) => setEditingPenalty(p)}
                        />
                    </section>

                    {/* Section 3: Expenses (New) */}
                    <section className="space-y-4">
                        {/* Header handled inside ExpensesTable for state access */}
                        <ExpensesTable onEdit={(e) => setEditingExpense(e)} />
                    </section>
                </div>
            </div>

            {isPenaltyModalOpen && (
                <AddPenaltyModal
                    onClose={() => setIsPenaltyModalOpen(false)}
                    members={members}
                />
            )}

            {editingPenalty && (
                <EditPenaltyModal
                    penalty={editingPenalty}
                    members={members}
                    onClose={() => setEditingPenalty(null)}
                />
            )}

            {editingExpense && (
                <EditExpenseModal
                    expense={editingExpense}
                    onClose={() => setEditingExpense(null)}
                />
            )}
        </div>
    );
}
