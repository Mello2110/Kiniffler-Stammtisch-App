"use client";

import { useState } from "react";
import { X, DollarSign, Trash2 } from "lucide-react";
import { doc, updateDoc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { LedgerEntry } from "@/types";
import { reconcileMemberBalance } from "@/lib/reconciliation";

interface EditLedgerEntryModalProps {
    entry: LedgerEntry;
    onClose: () => void;
}

export function EditLedgerEntryModal({ entry, onClose }: EditLedgerEntryModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Form State
    const [amount, setAmount] = useState(Math.abs(entry.amount).toString());
    const [description, setDescription] = useState(entry.description);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !description) return;

        setIsSubmitting(true);
        try {
            const parsedAmount = parseFloat(amount);
            // Ensure the amount maintains its original sign (negative for debts)
            const finalAmount = entry.amount < 0 ? -Math.abs(parsedAmount) : Math.abs(parsedAmount);

            const ref = doc(db, "ledger_entries", entry.id);
            await updateDoc(ref, {
                amount: finalAmount,
                description
            });

            // If it's a penalty and has a linked document, update the original penalty amount and reason as well
            if (entry.type === 'penalty' && entry.linkedDocId) {
                const penaltyRef = doc(db, "penalties", entry.linkedDocId);
                const penaltySnap = await getDoc(penaltyRef);
                if (penaltySnap.exists()) {
                    await updateDoc(penaltyRef, {
                        amount: Math.abs(parsedAmount),
                        reason: description
                    });
                }
            }

            // For contributions or donations, we just leave the base document alone 
            // since the ledger is the source of truth for the balance.

            // Reconcile after update
            reconcileMemberBalance(entry.userId).catch(console.error);
            onClose();
        } catch (error) {
            console.error("Error updating ledger entry:", error);
            alert("Fehler beim Aktualisieren des Eintrags.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm(`Möchtest du den Eintrag "${entry.description}" wirklich löschen?`)) {
            return;
        }

        setIsDeleting(true);
        try {
            // Delete the ledger entry
            const ref = doc(db, "ledger_entries", entry.id);
            await deleteDoc(ref);

            // Also delete linked documents if they exist
            if (entry.linkedDocId) {
                if (entry.type === 'penalty') {
                    await deleteDoc(doc(db, "penalties", entry.linkedDocId));
                } else if (entry.type === 'contribution') {
                    // It's a composite ID like userId_year_month
                    await deleteDoc(doc(db, "contributions", entry.linkedDocId));
                } else if (entry.type === 'donation') {
                    await deleteDoc(doc(db, "donations", entry.linkedDocId));
                }
            }

            // Reconcile after deletion
            reconcileMemberBalance(entry.userId).catch(console.error);
            onClose();
        } catch (error) {
            console.error("Error deleting ledger entry:", error);
            alert("Fehler beim Löschen des Eintrags.");
        } finally {
            setIsDeleting(false);
        }
    };

    const typeLabel = entry.type === 'penalty' ? 'Strafe' : 
                      entry.type === 'contribution' ? 'Beitrag' : 
                      entry.type === 'donation' ? 'Spende' : entry.type;

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
                    <h2 className="text-xl font-bold">Eintrag bearbeiten</h2>
                    <p className="text-sm text-muted-foreground">Offener Posten: {typeLabel}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Betrag (€)</label>
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
                        <label className="text-sm font-medium">Beschreibung</label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="z.B. Beitrag Mai"
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            required
                        />
                    </div>

                    <div className="flex gap-2 pt-4">
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={isSubmitting || isDeleting}
                            className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-red-500 hover:bg-red-500/20 disabled:opacity-50"
                            title="Eintrag löschen"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-md border border-input bg-background py-2 text-sm font-medium hover:bg-muted"
                        >
                            Abbrechen
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || isDeleting}
                            className="flex-1 rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                        >
                            {isSubmitting ? "Speichern..." : "Speichern"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
