"use client";

import { useState } from "react";
import { X, Loader2, DollarSign } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Member, Penalty } from "@/types";
import { reconcileMemberBalance } from "@/lib/reconciliation";

interface EditPenaltyModalProps {
    penalty: Penalty;
    members: Member[];
    onClose: () => void;
}

export function EditPenaltyModal({ penalty, members, onClose }: EditPenaltyModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [selectedMember, setSelectedMember] = useState(penalty.userId);
    const [amount, setAmount] = useState(penalty.amount.toString());
    const [reason, setReason] = useState(penalty.reason);
    const [isPaid, setIsPaid] = useState(penalty.isPaid);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMember || !amount || !reason) return;

        setIsSubmitting(true);
        try {
            const oldMemberId = penalty.userId;
            const ref = doc(db, "penalties", penalty.id);

            // If manually changing paid status, reset reconciliation flag
            const updateData: Record<string, unknown> = {
                userId: selectedMember,
                amount: parseFloat(amount),
                reason,
                isPaid,
            };

            // If manually setting to paid, ensure it's not marked as reconciled
            if (isPaid && !penalty.isPaid) {
                updateData.paidViaReconciliation = false;
            }
            // If manually setting to unpaid, clear reconciliation
            if (!isPaid && penalty.isPaid) {
                updateData.paidViaReconciliation = false;
                updateData.reconciledAt = null;
            }

            await updateDoc(ref, updateData);

            // Reconcile in background (non-blocking)
            if (oldMemberId !== selectedMember) {
                reconcileMemberBalance(oldMemberId).catch(console.error);
            }
            reconcileMemberBalance(selectedMember).catch(console.error);

            onClose();
        } catch (error) {
            console.error("Error updating penalty:", error);
            alert("Failed to update penalty.");
        } finally {
            setIsSubmitting(false);
        }
    };

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
                    <h2 className="text-xl font-bold">Edit Penalty</h2>
                    <p className="text-sm text-muted-foreground">Update penalty details.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Member</label>
                        <select
                            value={selectedMember}
                            onChange={(e) => setSelectedMember(e.target.value)}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            required
                        >
                            {members.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Amount (€)</label>
                            <div className="relative">
                                <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <input
                                    type="number"
                                    step="0.50"
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
                            <label className="text-sm font-medium">Status</label>
                            <select
                                value={isPaid ? "paid" : "unpaid"}
                                onChange={(e) => setIsPaid(e.target.value === "paid")}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <option value="unpaid">Unpaid</option>
                                <option value="paid">Paid</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Reason</label>
                        <input
                            type="text"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="e.g. Late Arrival"
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            required
                        />
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
                            {isSubmitting ? "Updating..." : "Update Penalty"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
