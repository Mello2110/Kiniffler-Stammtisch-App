"use client";

import { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { ChevronRight, ChevronDown, Check, X, Pencil, Trash2, Eye, EyeOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Penalty, Member } from "@/types";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DeleteConfirmationModal } from "@/components/common/DeleteConfirmationModal";
import { reconcileMemberBalance } from "@/lib/reconciliation";

// ============================================
// TYPES
// ============================================
interface PenaltyGroupedViewProps {
    penalties: Penalty[];
    members: Member[];
    onEdit?: (penalty: Penalty) => void;
    canManage: boolean;
}

interface MemberPenaltyGroup {
    memberId: string;
    memberName: string;
    penalties: Penalty[];
    totalUnpaid: number;
}

// ============================================
// COMPONENT
// ============================================
export function PenaltyGroupedView({ penalties, members, onEdit, canManage }: PenaltyGroupedViewProps) {
    // ============================================
    // STATE
    // ============================================
    const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());
    const [showAllMembers, setShowAllMembers] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);

    // ============================================
    // GROUPED DATA
    // ============================================
    const memberGroups: MemberPenaltyGroup[] = useMemo(() => {
        const groupMap = new Map<string, Penalty[]>();

        penalties.forEach(p => {
            const existing = groupMap.get(p.userId) || [];
            existing.push(p);
            groupMap.set(p.userId, existing);
        });

        const groups: MemberPenaltyGroup[] = [];
        groupMap.forEach((memberPenalties, memberId) => {
            const member = members.find(m => m.id === memberId);
            // Sort penalties by date ascending (oldest first)
            const sorted = [...memberPenalties].sort((a, b) => a.date.localeCompare(b.date));
            const totalUnpaid = sorted
                .filter(p => !p.isPaid)
                .reduce((sum, p) => sum + p.amount, 0);

            groups.push({
                memberId,
                memberName: member?.name || "Unknown",
                penalties: sorted,
                totalUnpaid,
            });
        });

        // Sort groups: members with unpaid penalties first, then by name
        groups.sort((a, b) => {
            if (a.totalUnpaid > 0 && b.totalUnpaid === 0) return -1;
            if (a.totalUnpaid === 0 && b.totalUnpaid > 0) return 1;
            return a.memberName.localeCompare(b.memberName);
        });

        return groups;
    }, [penalties, members]);

    const visibleGroups = showAllMembers
        ? memberGroups
        : memberGroups.filter(g => g.totalUnpaid > 0);

    const hiddenCount = memberGroups.length - memberGroups.filter(g => g.totalUnpaid > 0).length;

    // ============================================
    // HANDLERS
    // ============================================
    const toggleExpand = (memberId: string) => {
        setExpandedMembers(prev => {
            const next = new Set(prev);
            if (next.has(memberId)) {
                next.delete(memberId);
            } else {
                next.add(memberId);
            }
            return next;
        });
    };

    const togglePaidStatus = async (penalty: Penalty) => {
        if (!canManage) return;
        try {
            const ref = doc(db, "penalties", penalty.id);
            if (penalty.isPaid) {
                // Unpaying: reset both manual and reconciliation flags
                await updateDoc(ref, {
                    isPaid: false,
                    paidViaReconciliation: false,
                    reconciledAt: null,
                });
            } else {
                // Manually marking as paid
                await updateDoc(ref, {
                    isPaid: true,
                    paidViaReconciliation: false, // manually paid
                });
            }
            // Trigger reconciliation
            await reconcileMemberBalance(penalty.userId);
        } catch (error) {
            console.error("Error updating penalty:", error);
        }
    };

    const handleDelete = async () => {
        if (!deletingId) return;
        try {
            await deleteDoc(doc(db, "penalties", deletingId));

            // Trigger reconciliation for the member
            if (deletingMemberId) {
                await reconcileMemberBalance(deletingMemberId);
            }

            setDeletingId(null);
            setDeletingMemberId(null);
        } catch (error) {
            console.error("Error deleting penalty:", error);
        }
    };

    // ============================================
    // RENDER
    // ============================================
    return (
        <div className="space-y-3">
            {/* Member Groups */}
            {visibleGroups.length > 0 ? (
                visibleGroups.map(group => {
                    const isExpanded = expandedMembers.has(group.memberId);
                    return (
                        <div
                            key={group.memberId}
                            className="rounded-xl border bg-card shadow-sm overflow-hidden"
                        >
                            {/* --- Member Header Row --- */}
                            <button
                                onClick={() => toggleExpand(group.memberId)}
                                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left min-h-[56px]"
                            >
                                <div className="flex items-center gap-3">
                                    {isExpanded ? (
                                        <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    )}
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted border text-xs font-bold flex-shrink-0">
                                        {group.memberName.substring(0, 2).toUpperCase()}
                                    </div>
                                    <span className="font-medium">{group.memberName}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={cn(
                                        "text-sm font-bold",
                                        group.totalUnpaid > 0
                                            ? "text-red-600 dark:text-red-400"
                                            : "text-muted-foreground"
                                    )}>
                                        Offen: €{group.totalUnpaid.toFixed(2)}
                                    </span>
                                </div>
                            </button>

                            {/* --- Expanded Penalties --- */}
                            {isExpanded && (
                                <div className="border-t">
                                    <div className="divide-y">
                                        {group.penalties.map(penalty => (
                                            <div
                                                key={penalty.id}
                                                className={cn(
                                                    "flex items-center justify-between px-4 py-3 text-sm gap-2",
                                                    penalty.isPaid && "opacity-60"
                                                )}
                                            >
                                                {/* Left: Date + Reason */}
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <span className="text-muted-foreground text-xs whitespace-nowrap">
                                                        {format(parseISO(penalty.date), "dd.MM.yyyy")}
                                                    </span>
                                                    <span className="truncate">{penalty.reason}</span>
                                                </div>

                                                {/* Center: Amount */}
                                                <span className="font-bold whitespace-nowrap">
                                                    €{penalty.amount.toFixed(2)}
                                                </span>

                                                {/* Right: Status + Actions */}
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    {/* Paid Status */}
                                                    <button
                                                        onClick={() => togglePaidStatus(penalty)}
                                                        className={cn(
                                                            "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors whitespace-nowrap",
                                                            penalty.isPaid
                                                                ? penalty.paidViaReconciliation
                                                                    ? "bg-blue-500/15 text-blue-700 dark:text-blue-400 hover:bg-blue-500/25"
                                                                    : "bg-green-500/15 text-green-700 dark:text-green-400 hover:bg-green-500/25"
                                                                : "bg-red-500/15 text-red-700 dark:text-red-400 hover:bg-red-500/25",
                                                            !canManage && "opacity-80 cursor-default"
                                                        )}
                                                    >
                                                        {penalty.isPaid ? (
                                                            penalty.paidViaReconciliation ? (
                                                                <>
                                                                    <RefreshCw className="h-3 w-3" /> Verrechnet
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Check className="h-3 w-3" /> Bezahlt
                                                                </>
                                                            )
                                                        ) : (
                                                            <>
                                                                <X className="h-3 w-3" /> Offen
                                                            </>
                                                        )}
                                                    </button>

                                                    {/* Edit + Delete */}
                                                    {canManage && (
                                                        <div className="flex gap-1">
                                                            <button
                                                                onClick={() => onEdit?.(penalty)}
                                                                className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
                                                                title="Edit"
                                                            >
                                                                <Pencil className="h-3.5 w-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setDeletingId(penalty.id);
                                                                    setDeletingMemberId(penalty.userId);
                                                                }}
                                                                className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                                                                title="Delete"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })
            ) : (
                <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
                    No penalties found.
                </div>
            )}

            {/* Show All Toggle */}
            {hiddenCount > 0 && (
                <button
                    onClick={() => setShowAllMembers(!showAllMembers)}
                    className="w-full flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                    {showAllMembers ? (
                        <>
                            <EyeOff className="h-3 w-3" />
                            Hide settled members ({hiddenCount})
                        </>
                    ) : (
                        <>
                            <Eye className="h-3 w-3" />
                            Show all members (+{hiddenCount} settled)
                        </>
                    )}
                </button>
            )}

            <DeleteConfirmationModal
                isOpen={!!deletingId}
                onClose={() => { setDeletingId(null); setDeletingMemberId(null); }}
                onConfirm={handleDelete}
                title="Strafe löschen"
                description="Bist du sicher, dass du diese Strafe löschen möchtest? Das Guthaben wird dadurch neu berechnet."
            />
        </div>
    );
}
