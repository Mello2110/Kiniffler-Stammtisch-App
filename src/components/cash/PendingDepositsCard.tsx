"use client";

import React, { useMemo, useState } from "react";
import { query, orderBy, where, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { useFirestoreQuery } from "@/hooks/useFirestoreQuery";
import { useClub } from "@/contexts/ClubContext";
import { useAuth } from "@/contexts/AuthContext";
import { triggerHaptic } from "@/lib/haptics";
import type { Member, PendingDeposit } from "@/types";
import { Check, X, Clock, Loader2 } from "lucide-react";

interface PendingDepositsCardProps {
    members: Member[];
    canManage: boolean;
}

export function PendingDepositsCard({ members, canManage }: PendingDepositsCardProps) {
    const { user } = useAuth();
    const { clubId, clubCollection, clubDoc } = useClub();
    const [processingId, setProcessingId] = useState<string | null>(null);

    const qPending = useMemo(
        () =>
            clubId
                ? query(
                      clubCollection("pending_deposits"),
                      where("status", "==", "pending"),
                      orderBy("createdAt", "desc")
                  )
                : null,
        [clubId, clubCollection]
    );
    const { data: pendingDeposits } = useFirestoreQuery<PendingDeposit>(qPending);

    // Wenn es keine offenen Meldungen gibt, bleibt /cash komplett aufgeräumt (für club_original 100% unverändert)
    if (!pendingDeposits || pendingDeposits.length === 0) {
        return null;
    }

    const handleApprove = async (dep: PendingDeposit) => {
        if (!canManage) return;
        setProcessingId(dep.id);
        triggerHaptic("success");
        try {
            const memberName =
                members.find((m) => m.id === dep.userId)?.name || dep.memberName || "Mitglied";
            const nowIso = new Date().toISOString();

            await addDoc(clubCollection("ledger_entries"), {
                userId: dep.userId,
                amount: dep.amount,
                type: "paypal_deposit",
                description: `Einzahlung bestätigt (${dep.referenceToken || memberName})`,
                date: nowIso,
                createdAt: serverTimestamp(),
                linkedDocId: dep.id,
            });

            await updateDoc(clubDoc("pending_deposits", dep.id), {
                status: "approved",
                resolvedAt: serverTimestamp(),
                resolvedBy: user?.uid || "admin",
            });
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (dep: PendingDeposit) => {
        if (!canManage) return;
        setProcessingId(dep.id);
        triggerHaptic("tap");
        try {
            await updateDoc(clubDoc("pending_deposits", dep.id), {
                status: "rejected",
                resolvedAt: serverTimestamp(),
                resolvedBy: user?.uid || "admin",
            });
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="rounded-3xl border border-accent/35 bg-card/75 p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-base font-bold text-[#F5F0EB]">
                    <Clock className="h-4 w-4 text-accent" />
                    Gemeldete Einzahlungen ({pendingDeposits.length})
                </div>
                <span className="text-[11px] text-muted-foreground">
                    1-Klick-Freigabe für den Kassenwart
                </span>
            </div>

            <div className="space-y-2.5">
                {pendingDeposits.map((dep) => {
                    const isBusy = processingId === dep.id;
                    return (
                        <div
                            key={dep.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-black/25 border border-white/10"
                        >
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm text-[#F5F0EB] truncate">
                                        {dep.memberName}
                                    </span>
                                    <span className="text-sm font-black text-emerald-400">
                                        +{dep.amount.toFixed(2)} €
                                    </span>
                                </div>
                                <div className="text-[11px] text-muted-foreground font-mono truncate">
                                    {dep.referenceToken}
                                </div>
                            </div>

                            {canManage && (
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        type="button"
                                        disabled={isBusy}
                                        onClick={() => handleApprove(dep)}
                                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                    >
                                        {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                        Bestätigen
                                    </button>
                                    <button
                                        type="button"
                                        disabled={isBusy}
                                        onClick={() => handleReject(dep)}
                                        className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-muted-foreground hover:text-red-400 cursor-pointer disabled:opacity-50"
                                        title="Ablehnen"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
