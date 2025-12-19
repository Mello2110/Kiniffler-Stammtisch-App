"use client";

import { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { ArrowUpDown, Check, X, Search, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Penalty, Member } from "@/types";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DeleteConfirmationModal } from "@/components/common/DeleteConfirmationModal";

interface PenaltyTableProps {
    penalties: Penalty[];
    members: Member[];
    onEdit?: (penalty: Penalty) => void;
    canManage: boolean;
}

type SortField = "date" | "amount" | "isPaid";
type SortOrder = "asc" | "desc";

export function PenaltyTable({ penalties, members, onEdit, canManage }: PenaltyTableProps) {
    const [sortField, setSortField] = useState<SortField>("date");
    const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
    const [filter, setFilter] = useState("");
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortOrder("desc");
        }
    };

    const togglePaidStatus = async (penaltyId: string, currentStatus: boolean) => {
        if (!canManage) return;
        try {
            const ref = doc(db, "penalties", penaltyId);
            await updateDoc(ref, { isPaid: !currentStatus });
        } catch (error) {
            console.error("Error updating penalty:", error);
        }
    };

    const handleDelete = async () => {
        if (!deletingId) return;
        try {
            await deleteDoc(doc(db, "penalties", deletingId));
            setDeletingId(null);
        } catch (error) {
            console.error("Error deleting penalty:", error);
        }
    };

    const filteredAndSortedData = useMemo(() => {
        let data = [...penalties];

        // Filter
        if (filter) {
            const lowerFilter = filter.toLowerCase();
            data = data.filter(p => {
                const member = members.find(m => m.id === p.userId);
                const memberName = member?.name.toLowerCase() || "";
                return memberName.includes(lowerFilter) || p.reason.toLowerCase().includes(lowerFilter);
            });
        }

        data.sort((a, b) => {
            let valA = a[sortField];
            let valB = b[sortField];

            if (sortField === "amount") {
                valA = Number(valA);
                valB = Number(valB);
            }

            if (valA < valB) return sortOrder === "asc" ? -1 : 1;
            if (valA > valB) return sortOrder === "asc" ? 1 : -1;
            return 0;
        });

        return data;
    }, [penalties, members, sortField, sortOrder, filter]);

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search penalties..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
            </div>

            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-muted/50 transition-colors hover:bg-muted/50">
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Member</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Reason</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => handleSort("amount")}>
                                    <div className="flex items-center gap-1">
                                        Amount
                                        <ArrowUpDown className="h-3 w-3" />
                                    </div>
                                </th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => handleSort("date")}>
                                    <div className="flex items-center gap-1">
                                        Date
                                        <ArrowUpDown className="h-3 w-3" />
                                    </div>
                                </th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => handleSort("isPaid")}>
                                    <div className="flex items-center gap-1">
                                        Status
                                        <ArrowUpDown className="h-3 w-3" />
                                    </div>
                                </th>
                                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAndSortedData.length > 0 ? (
                                filteredAndSortedData.map((penalty) => {
                                    const member = members.find(m => m.id === penalty.userId);
                                    return (
                                        <tr key={penalty.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                            <td className="p-4 align-middle font-medium">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted border text-xs font-bold">
                                                        {member?.name.substring(0, 2).toUpperCase() || "??"}
                                                    </div>
                                                    {member?.name || "Unknown"}
                                                </div>
                                            </td>
                                            <td className="p-4 align-middle">{penalty.reason}</td>
                                            <td className="p-4 align-middle font-bold">€{penalty.amount.toFixed(2)}</td>
                                            <td className="p-4 align-middle text-muted-foreground">
                                                {format(parseISO(penalty.date), "MMM d")}
                                            </td>
                                            <td className="p-4 align-middle">
                                                <button
                                                    onClick={() => togglePaidStatus(penalty.id, penalty.isPaid)}
                                                    className={cn(
                                                        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
                                                        penalty.isPaid
                                                            ? "bg-green-500/15 text-green-700 dark:text-green-400 hover:bg-green-500/25"
                                                            : "bg-red-500/15 text-red-700 dark:text-red-400 hover:bg-red-500/25",
                                                        !canManage && "opacity-80 cursor-default hover:bg-transparent"
                                                    )}
                                                >
                                                    {penalty.isPaid ? (
                                                        <>
                                                            <Check className="h-3 w-3" /> Paid
                                                        </>
                                                    ) : (
                                                        <>
                                                            <X className="h-3 w-3" /> Unpaid
                                                        </>
                                                    )}
                                                </button>
                                            </td>
                                            <td className="p-4 align-middle text-right">
                                                {canManage && (
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => onEdit?.(penalty)}
                                                            className="p-2 text-muted-foreground hover:text-primary transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setDeletingId(penalty.id)}
                                                            className="p-2 text-muted-foreground hover:text-primary transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={6} className="h-24 text-center align-middle text-muted-foreground">
                                        No penalties found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <DeleteConfirmationModal
                isOpen={!!deletingId}
                onClose={() => setDeletingId(null)}
                onConfirm={handleDelete}
                title="Strafe löschen"
                description="Bist du sicher, dass du diese Strafe löschen möchtest? Das Guthaben wird dadurch nicht automatisch berechnet, sondern die Strafe wird nur aus der Liste entfernt."
            />
        </div>
    );
}
