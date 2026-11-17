"use client";

import { useState } from "react";
import { X, Loader2, DollarSign } from "lucide-react";
import { collection, addDoc, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useClub } from "@/contexts/ClubContext";
import { DEFAULT_CLUB_RULESET } from "@/lib/defaultRuleset";
import type { Member } from "@/types";

interface AddPenaltyModalProps {
    onClose: () => void;
    members: Member[];
}

export function AddPenaltyModal({ onClose, members }: AddPenaltyModalProps) {
    const { clubId, club, clubCollection } = useClub();
    const catalog = club?.ruleset?.customPenaltyCatalog ?? DEFAULT_CLUB_RULESET.customPenaltyCatalog;
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [selectedMember, setSelectedMember] = useState("");
    const [amount, setAmount] = useState("");
    const [reason, setReason] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMember || !amount || !reason) return;

        setIsSubmitting(true);
        try {
            const parsedAmount = parseFloat(amount);
            const penaltyPayload = {
                userId: selectedMember,
                amount: parsedAmount,
                reason,
                isPaid: false,
                paidViaReconciliation: false,
                date: new Date().toISOString(),
                createdAt: serverTimestamp()
            };

            // 1. Create penalty record in club-scoped collection
            const penaltyRef = await addDoc(clubCollection("penalties"), penaltyPayload);

            const ledgerPayload = {
                userId: selectedMember,
                amount: -parsedAmount,
                type: "penalty",
                description: `Strafe: ${reason}`,
                date: new Date().toISOString(),
                createdAt: serverTimestamp(),
                linkedDocId: penaltyRef.id,
            };

            // 2. Create negative ledger entry in club-scoped collection
            await addDoc(clubCollection("ledger_entries"), ledgerPayload);

            if (clubId === "club_original") {
                await setDoc(doc(db, "penalties", penaltyRef.id), penaltyPayload).catch(() => {});
                await addDoc(collection(db, "ledger_entries"), ledgerPayload).catch(() => {});
            }

            onClose();
        } catch (error) {
            console.error("Error adding penalty:", error);
            alert("Failed to add penalty.");
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
                    <h2 className="text-xl font-bold">Strafe hinzufügen</h2>
                    <p className="text-sm text-muted-foreground">Eine Strafe für ein Mitglied erfassen.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {catalog.length > 0 && (
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Schnellauswahl (Strafenkatalog)
                            </label>
                            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                                {catalog.map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => {
                                            setReason(item.label);
                                            setAmount(item.amountEur.toFixed(2));
                                        }}
                                        className="px-2.5 py-1 rounded-full text-xs font-medium border border-white/10 bg-white/5 hover:bg-primary/20 hover:border-primary/40 transition-colors cursor-pointer flex items-center gap-1"
                                    >
                                        <span>{item.label}</span>
                                        <span className="text-accent font-bold">{item.amountEur.toFixed(2)}€</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Mitglied</label>
                        <select
                            value={selectedMember}
                            onChange={(e) => setSelectedMember(e.target.value)}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            required
                        >
                            <option value="" disabled>Mitglied auswählen...</option>
                            {members.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
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
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Grund</label>
                        <input
                            type="text"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="z.B. Zu spät gekommen"
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
                            Abbrechen
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 rounded-md bg-destructive py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
                        >
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Strafe hinzufügen"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
