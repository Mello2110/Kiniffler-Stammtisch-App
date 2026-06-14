"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Plus, ChevronDown, ChevronUp, Pencil, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Member, LedgerEntry, LedgerTransactionCategory } from "@/types";
import { useAllLedgers } from "@/hooks/useLedger";
import { format, parseISO } from "date-fns";

export interface UnpaidLedgerComponent {
    id: string;
    description: string;
    date: string;
    remainingAmount: number;
    type: LedgerTransactionCategory;
    linkedDocId?: string;
    originalEntry: LedgerEntry;
}

interface OutstandingPaymentsProps {
    members: Member[];
    canManage?: boolean;
    onAddPenalty?: () => void;
    onEditLedgerEntry?: (entry: LedgerEntry) => void;
}

export function OutstandingPayments({
    members,
    canManage,
    onAddPenalty,
    onEditLedgerEntry
}: OutstandingPaymentsProps) {
    const { entries: allLedgers } = useAllLedgers();
    const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());

    const outstandingMembers = useMemo(() => {
        const balancesByMember: { [uid: string]: number } = {};
        const unpaidComponentsByMember: { [uid: string]: UnpaidLedgerComponent[] } = {};

        const entriesByUser: { [uid: string]: LedgerEntry[] } = {};
        allLedgers.forEach(entry => {
            if (!entriesByUser[entry.userId]) entriesByUser[entry.userId] = [];
            entriesByUser[entry.userId].push(entry);
            balancesByMember[entry.userId] = (balancesByMember[entry.userId] || 0) + entry.amount;
        });

        Object.keys(entriesByUser).forEach(userId => {
            const userEntries = entriesByUser[userId];
            userEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            let positivePool = 0;
            userEntries.forEach(entry => {
                if (entry.amount > 0) positivePool += entry.amount;
            });

            const unpaid: UnpaidLedgerComponent[] = [];
            userEntries.forEach(entry => {
                if (entry.amount < 0) {
                    const debtAbsolute = Math.abs(entry.amount);
                    if (positivePool >= debtAbsolute) {
                        positivePool -= debtAbsolute;
                    } else {
                        const remainingDebt = debtAbsolute - positivePool;
                        positivePool = 0;
                        unpaid.push({
                            id: entry.id,
                            description: entry.description,
                            date: entry.date,
                            remainingAmount: remainingDebt,
                            type: entry.type,
                            linkedDocId: entry.linkedDocId,
                            originalEntry: entry
                        });
                    }
                }
            });
            unpaid.reverse();
            unpaidComponentsByMember[userId] = unpaid;
        });

        return members
            .map(member => ({
                ...member,
                balance: balancesByMember[member.id] || 0,
                unpaidComponents: unpaidComponentsByMember[member.id] || []
            }))
            .filter(member => member.balance < -0.01)
            .sort((a, b) => a.balance - b.balance);
    }, [allLedgers, members]);

    const totalOutstanding = outstandingMembers.reduce((sum, m) => sum + Math.abs(m.balance), 0);

    const toggleMember = (memberId: string) => {
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

    return (
        <div className="space-y-4">
            {/* Header — matches ExpensesTable pattern */}
            <div className="flex justify-between items-center h-[34px]">
                <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <h2 className="text-xl font-semibold">Ausstehende Zahlungen</h2>
                </div>
                <div className="flex items-center gap-3">
                    {totalOutstanding > 0 && (
                        <span className="text-sm font-bold text-red-500">
                            €{totalOutstanding.toFixed(2)}
                        </span>
                    )}
                    {canManage && onAddPenalty && (
                        <button
                            onClick={onAddPenalty}
                            className="text-xs bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1"
                        >
                            <Plus className="h-3 w-3" />
                            Strafe hinzufügen
                        </button>
                    )}
                </div>
            </div>

            {/* Content box — matches ExpensesTable card style */}
            <div className="rounded-lg border bg-card shadow-sm overflow-hidden overflow-x-auto">
                {outstandingMembers.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                        <CheckCircle2 className="w-8 h-8 text-green-500/50" />
                        <p className="text-sm">Alle Mitglieder sind auf dem Laufenden!</p>
                    </div>
                ) : (
                    <div className="divide-y min-w-[300px]">
                        {outstandingMembers.map(member => {
                            const isExpanded = expandedMembers.has(member.id);
                            return (
                                <div key={member.id} className="flex flex-col">
                                    <div
                                        className="px-4 py-3 flex items-center justify-between hover:bg-muted/50 cursor-pointer transition-colors"
                                        onClick={() => toggleMember(member.id)}
                                    >
                                        <div className="flex items-center gap-2">
                                            <ChevronDown className={cn(
                                                "w-4 h-4 text-muted-foreground transition-transform duration-200",
                                                isExpanded && "rotate-180"
                                            )} />
                                            <span className="font-medium text-sm">{member.name}</span>
                                        </div>
                                        <span className="text-red-500 font-bold text-sm">
                                            €{Math.abs(member.balance).toFixed(2)}
                                        </span>
                                    </div>

                                    {/* Expanded Details */}
                                    {isExpanded && (
                                        <div className="bg-muted/10 border-t px-4 py-3 space-y-2">
                                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                                Offene Posten
                                            </div>
                                            {member.unpaidComponents.length > 0 ? (
                                                <div className="space-y-2">
                                                    {member.unpaidComponents.map(component => (
                                                        <div
                                                            key={component.id}
                                                            className="flex items-center justify-between bg-background p-3 rounded-md border text-sm"
                                                        >
                                                            <div className="flex flex-col min-w-0 mr-3">
                                                                <span className="font-medium truncate">{component.description}</span>
                                                                <span className="text-xs text-muted-foreground capitalize">
                                                                    {component.type === 'penalty' ? 'Strafe' :
                                                                     component.type === 'contribution' ? 'Beitrag' :
                                                                     component.type === 'donation' ? 'Spende' : component.type}
                                                                    {" • "}
                                                                    {component.date ? format(parseISO(component.date), "dd.MM.yyyy") : ''}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <span className="font-bold text-red-500">
                                                                    €{component.remainingAmount.toFixed(2)}
                                                                </span>
                                                                {canManage && onEditLedgerEntry && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            onEditLedgerEntry(component.originalEntry);
                                                                        }}
                                                                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                                                                        title="Eintrag bearbeiten/löschen"
                                                                    >
                                                                        <Pencil className="w-3.5 h-3.5" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-xs text-muted-foreground italic bg-background p-3 rounded-md border">
                                                    Keine Details verfügbar.
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
