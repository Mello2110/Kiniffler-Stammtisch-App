"use client";

import { useState } from "react";
import { X, DollarSign, Calendar } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Expense, Member } from "@/types";
import { reconcileMemberBalance } from "@/lib/reconciliation";

// ============================================
// PROPS
// ============================================
interface EditExpenseModalProps {
    expense: Expense;
    members: Member[];
    onClose: () => void;
}

export function EditExpenseModal({ expense, members, onClose }: EditExpenseModalProps) {
    // ============================================
    // STATE
    // ============================================
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- Form State ---
    const [desc, setDesc] = useState(expense.description);
    const [amount, setAmount] = useState(expense.amount.toString());
    const [date, setDate] = useState(expense.date);
    const [selectedMemberId, setSelectedMemberId] = useState(expense.memberId || "");

    // ============================================
    // HANDLERS
    // ============================================
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!desc || !amount || !date || !selectedMemberId) return;

        const member = members.find(m => m.id === selectedMemberId);
        if (!member) return;

        setIsSubmitting(true);
        try {
            const oldMemberId = expense.memberId;
            const ref = doc(db, "expenses", expense.id);

            await updateDoc(ref, {
                description: desc,
                amount: parseFloat(amount),
                date,
                memberId: selectedMemberId,
                memberName: member.name,
            });

            // Reconcile OLD member if the member changed (their penalties may revert)
            if (oldMemberId && oldMemberId !== selectedMemberId) {
                await reconcileMemberBalance(oldMemberId);
            }
            // Reconcile NEW member
            await reconcileMemberBalance(selectedMemberId);

            onClose();
        } catch (error) {
            console.error("Error updating expense:", error);
            alert("Failed to update expense.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // ============================================
    // RENDER
    // ============================================
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
            <div className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg animate-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-muted"
                >
                    <X className="h-4 w-4" />
                </button>

                <div className="mb-6">
                    <h2 className="text-xl font-bold">Edit Expense</h2>
                    <p className="text-sm text-muted-foreground">Update expense details.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Member Select */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Member *</label>
                        <select
                            value={selectedMemberId}
                            onChange={(e) => setSelectedMemberId(e.target.value)}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            required
                        >
                            <option value="" disabled>Select a member...</option>
                            {members.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Description</label>
                        <input
                            type="text"
                            value={desc}
                            onChange={(e) => setDesc(e.target.value)}
                            placeholder="e.g. Snacks, Drinks"
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            required
                        />
                    </div>

                    {/* Amount + Date */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Amount (€)</label>
                            <div className="relative">
                                <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground shadow-sm" />
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-md border border-input bg-background py-2 text-sm font-medium hover:bg-muted"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                        >
                            {isSubmitting ? "Updating..." : "Update Expense"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
