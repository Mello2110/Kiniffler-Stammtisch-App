"use client";

import { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { Trash2, Plus, Search, Pencil } from "lucide-react";
import { collection, query, orderBy, addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { useFirestoreQuery } from "@/hooks/useFirestoreQuery";
import { db } from "@/lib/firebase";
import type { Expense, Member } from "@/types";
import { DeleteConfirmationModal } from "@/components/common/DeleteConfirmationModal";
import { reconcileMemberBalance } from "@/lib/reconciliation";

// ============================================
// PROPS
// ============================================
interface ExpensesTableProps {
    onEdit?: (expense: Expense) => void;
    canManage: boolean;
    members: Member[];
}

export function ExpensesTable({ onEdit, canManage, members }: ExpensesTableProps) {
    // ============================================
    // STATE
    // ============================================
    const [isAdding, setIsAdding] = useState(false);

    // --- Add Form State ---
    const [desc, setDesc] = useState("");
    const [amount, setAmount] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedMemberId, setSelectedMemberId] = useState("");

    // --- Search and Filter State ---
    const [filter, setFilter] = useState("");
    const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);

    // ============================================
    // HOOKS
    // ============================================
    const q = useMemo(() => query(collection(db, "expenses"), orderBy("date", "desc")), []);
    const { data: expenses } = useFirestoreQuery<Expense>(q);

    // ============================================
    // HANDLERS
    // ============================================
    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!desc || !amount || !selectedMemberId) return;

        const member = members.find(m => m.id === selectedMemberId);
        if (!member) return;

        try {
            await addDoc(collection(db, "expenses"), {
                description: desc,
                amount: parseFloat(amount),
                date,
                memberId: selectedMemberId,
                memberName: member.name,
                createdAt: serverTimestamp()
            });

            // Trigger reconciliation in background (non-blocking)
            reconcileMemberBalance(selectedMemberId).catch(console.error);

            setDesc("");
            setAmount("");
            setSelectedMemberId("");
            setIsAdding(false);
        } catch (error) {
            console.error("Error adding expense:", error);
        }
    };

    const handleDelete = async () => {
        if (!deletingExpense) return;
        const memberId = deletingExpense.memberId;
        try {
            await deleteDoc(doc(db, "expenses", deletingExpense.id));

            // Trigger reconciliation in background (non-blocking)
            if (memberId) {
                reconcileMemberBalance(memberId).catch(console.error);
            }

            setDeletingExpense(null);
        } catch (error) {
            console.error("Error deleting expense:", error);
        }
    };

    // ============================================
    // FILTERING
    // ============================================
    const filteredExpenses = expenses.filter(expense => {
        if (!filter) return true;
        const lowerFilter = filter.toLowerCase();
        const memberLabel = expense.memberName || "Nicht zugeordnet";
        return (
            expense.description.toLowerCase().includes(lowerFilter) ||
            memberLabel.toLowerCase().includes(lowerFilter) ||
            format(parseISO(expense.date), "yyyy-MM-dd").includes(lowerFilter) ||
            expense.amount.toString().includes(lowerFilter)
        );
    });

    // ============================================
    // RENDER
    // ============================================
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center h-[34px]">
                <h2 className="text-xl font-semibold">Expenses</h2>
                {canManage && (
                    <button
                        onClick={() => setIsAdding(!isAdding)}
                        className="text-xs bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1"
                    >
                        {isAdding ? "Cancel" : <><Plus className="h-3 w-3" /> Add Expense</>}
                    </button>
                )}
            </div>

            {/* Search Bar */}
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search expenses..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
            </div>

            {/* Add Form */}
            {isAdding && (
                <form onSubmit={handleAdd} className="space-y-3 p-4 bg-muted/30 rounded-lg border">
                    {/* Row 1: Member select */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium">Member *</label>
                        <select
                            value={selectedMemberId}
                            onChange={e => setSelectedMemberId(e.target.value)}
                            className="w-full text-sm p-2 rounded-md border bg-background"
                            required
                        >
                            <option value="" disabled>Select a member...</option>
                            {members.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    </div>
                    {/* Row 2: Description, Amount, Date, Save */}
                    <div className="flex gap-2 items-end">
                        <div className="flex-1 space-y-1">
                            <label className="text-xs font-medium">Description</label>
                            <input
                                value={desc}
                                onChange={e => setDesc(e.target.value)}
                                className="w-full text-sm p-2 rounded-md border bg-background"
                                placeholder="Beer, Snacks..."
                                required
                                autoFocus
                            />
                        </div>
                        <div className="w-24 space-y-1">
                            <label className="text-xs font-medium">Amount (€)</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                className="w-full text-sm p-2 rounded-md border bg-background"
                                placeholder="0.00"
                                required
                            />
                        </div>
                        <div className="w-32 space-y-1">
                            <label className="text-xs font-medium">Date</label>
                            <input
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                className="w-full text-sm p-2 rounded-md border bg-background"
                                required
                            />
                        </div>
                        <button type="submit" className="h-[38px] px-4 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90">
                            Save
                        </button>
                    </div>
                </form>
            )}

            {/* Table */}
            <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-muted/50 border-b">
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Date</th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Member</th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Description</th>
                            <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Amount</th>
                            <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredExpenses.length > 0 ? (
                            filteredExpenses.map(expense => (
                                <tr key={expense.id} className="border-b last:border-0 hover:bg-muted/50">
                                    <td className="p-4 align-middle text-muted-foreground">{format(parseISO(expense.date), "MMM d")}</td>
                                    <td className="p-4 align-middle">
                                        {expense.memberName ? (
                                            <span className="font-medium">{expense.memberName}</span>
                                        ) : (
                                            <span className="text-muted-foreground italic text-xs">Nicht zugeordnet</span>
                                        )}
                                    </td>
                                    <td className="p-4 align-middle font-medium">{expense.description}</td>
                                    <td className="p-4 align-middle text-right font-bold">€{expense.amount.toFixed(2)}</td>
                                    <td className="p-4 align-middle text-right">
                                        {canManage && (
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => onEdit?.(expense)}
                                                    className="p-2 text-muted-foreground hover:text-primary transition-colors"
                                                    title="Edit"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => setDeletingExpense(expense)}
                                                    className="p-2 text-muted-foreground hover:text-primary transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="h-24 text-center align-middle text-muted-foreground">No expenses found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <DeleteConfirmationModal
                isOpen={!!deletingExpense}
                onClose={() => setDeletingExpense(null)}
                onConfirm={handleDelete}
                title="Ausgabe löschen"
                description="Bist du sicher, dass du diese Ausgabe löschen möchtest? Das Guthaben wird dadurch neu berechnet."
            />
        </div>
    );
}
