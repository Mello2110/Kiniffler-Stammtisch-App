"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Plus, ChevronDown, ChevronUp, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Member, LedgerEntry, LedgerTransactionCategory } from "@/types";
import { useAllLedgers } from "@/hooks/useLedger";
import { format, parseISO } from "date-fns";

export interface UnpaidLedgerComponent {
    id: string; // The ledger entry id
    description: string;
    date: string;
    remainingAmount: number; // Positive absolute amount owed
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

        // Calculate unpaid components for each user using FIFO
        Object.keys(entriesByUser).forEach(userId => {
            const userEntries = entriesByUser[userId];
            // Sort oldest first for FIFO matching
            userEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            let positivePool = 0;
            // First pass: sum all positive cash inflow
            userEntries.forEach(entry => {
                if (entry.amount > 0) positivePool += entry.amount;
            });

            const unpaid: UnpaidLedgerComponent[] = [];
            // Second pass: apply positive pool to negative entries from oldest to newest
            userEntries.forEach(entry => {
                if (entry.amount < 0) {
                    const debtAbsolute = Math.abs(entry.amount);
                    if (positivePool >= debtAbsolute) {
                        // Fully paid
                        positivePool -= debtAbsolute;
                    } else {
                        // Partially or not paid at all
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
            // Reverse so newest unpaid are at top
            unpaid.reverse();
            unpaidComponentsByMember[userId] = unpaid;
        });

        return members
            .map(member => {
                return {
                    ...member,
                    balance: balancesByMember[member.id] || 0,
                    unpaidComponents: unpaidComponentsByMember[member.id] || []
                };
            })
            // Tolerate floating point math issues e.g. -0.000001
            .filter(member => member.balance < -0.01) 
            .sort((a, b) => a.balance - b.balance); // Most negative first
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
        <div className="bg-background border rounded-xl shadow-sm overflow-hidden flex flex-col h-full max-h-[800px]">
            {/* Header */}
            <div className="p-4 border-b bg-muted/30 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2 text-red-500">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-medium">Ausstehende Zahlungen</span>
                </div>
                <div className="flex items-center gap-4 text-right">
                    <div>
                        <div className="text-sm text-muted-foreground">Gesamt</div>
                        <div className="font-bold text-red-500">
                            {totalOutstanding > 0 ? `€${totalOutstanding.toFixed(2)}` : "€0.00"}
                        </div>
                    </div>
                    {canManage && onAddPenalty && (
                        <button
                            onClick={onAddPenalty}
                            className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
                            title="Strafe hinzufügen"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Content Area - Scrollable */}
            <div className="flex-1 overflow-y-auto min-h-0">
                {outstandingMembers.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                        <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500/50" />
                        <p>Alle Mitglieder sind auf dem Laufenden!</p>
                    </div>
                ) : (
                    <div className="divide-y">
                        {outstandingMembers.map(member => {
                            const isExpanded = expandedMembers.has(member.id);
                            return (
                                <div key={member.id} className="flex flex-col bg-card">
                                    <div 
                                        className="p-4 flex items-center justify-between hover:bg-muted/30 cursor-pointer transition-colors"
                                        onClick={() => toggleMember(member.id)}
                                    >
                                        <div className="flex items-center gap-3">
                                            {isExpanded ? (
                                                <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                            ) : (
                                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                            )}
                                            <div className="font-medium">{member.name}</div>
                                        </div>
                                        <div className="text-red-500 font-medium">
                                            €{Math.abs(member.balance).toFixed(2)}
                                        </div>
                                    </div>
                                    
                                    {/* Expanded Details */}
                                    {isExpanded && (
                                        <div className="bg-muted/10 border-t border-b p-4 space-y-3 shadow-inner">
                                            <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                                Offene Posten
                                            </div>
                                            
                                            {member.unpaidComponents.length > 0 ? (
                                                <div className="space-y-2">
                                                    {member.unpaidComponents.map(component => (
                                                        <div 
                                                            key={component.id} 
                                                            className="flex items-center justify-between bg-background p-3 rounded-md border shadow-sm"
                                                        >
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-medium">{component.description}</span>
                                                                <span className="text-xs text-muted-foreground capitalize">
                                                                    {component.type === 'penalty' ? 'Strafe' : 
                                                                     component.type === 'contribution' ? 'Beitrag' : 
                                                                     component.type === 'donation' ? 'Spende' : component.type} 
                                                                    {" • "} 
                                                                    {component.date ? format(parseISO(component.date), "dd.MM.yyyy") : ''}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-sm font-medium text-red-500">
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
                                                                        <Pencil className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-xs text-muted-foreground italic bg-background p-3 rounded-md border">
                                                    Keine Details verfügbar. Die Schulden resultieren möglicherweise aus einem manuell gebuchten negativen Kontostand.
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

// Dummy icon for empty state
function CheckCircle(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    );
}
