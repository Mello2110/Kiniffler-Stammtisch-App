"use client";

import { useState, useEffect } from "react";
import { Check, X, Loader2 } from "lucide-react";
import { collection, query, where, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import type { Member, Contribution } from "@/types";

interface ContributionTableProps {
    members: Member[];
    currentYear: number;
    currentUserId: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function ContributionTable({ members, currentYear, currentUserId }: ContributionTableProps) {
    const [contributions, setContributions] = useState<Contribution[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [togglingId, setTogglingId] = useState<string | null>(null);

    useEffect(() => {
        const fetchContributions = async () => {
            // In a real app we might query by year, but for now grab all or implement compound queries
            // Simplified: fetch all and filter client side or basic query
            const q = query(collection(db, "contributions"), where("year", "==", currentYear));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contribution));
            setContributions(data);
            setIsLoading(false);
        };
        fetchContributions();
    }, [currentYear]);

    const toggleContribution = async (memberId: string, monthIndex: number) => {
        const existing = contributions.find(c => c.userId === memberId && c.month === monthIndex && c.year === currentYear);
        const compositeId = `${memberId}_${currentYear}_${monthIndex}`;

        setTogglingId(compositeId);
        try {
            if (existing && existing.isPaid) {
                // Determine logic: Do we delete or set to false? Let's delete for cleanliness or set false.
                // Requirement said "mark paid/unpaid".
                // Let's toggle isPaid. If document doesn't exist, create it as paid.
                const ref = doc(db, "contributions", existing.id);
                // Actually, simply deleting means unpaid in this sparse model, but explicit boolean is safer.
                // Let's use strict delete = unpaid, create = paid pattern for simplicity? 
                // Or better: update isPaid toggle.

                // Let's stick to: Entry exists means "Paid". No entry means "Unpaid". 
                // Wait, requirements say "mark paid/unpaid".
                // Actually easier: If it exists, delete it (toggle off). If not, create it (toggle on).

                await deleteDoc(ref);
                setContributions(prev => prev.filter(c => c.id !== existing.id));
            } else {
                const ref = doc(db, "contributions", compositeId);
                const newContrib: Contribution = {
                    id: compositeId,
                    userId: memberId,
                    month: monthIndex,
                    year: currentYear,
                    isPaid: true
                };
                await setDoc(ref, newContrib);
                setContributions(prev => [...prev, newContrib]);
            }
        } catch (error) {
            console.error("Error toggling contribution:", error);
        } finally {
            setTogglingId(null);
        }
    };

    if (isLoading) return <div className="p-4 text-center"><Loader2 className="animate-spin inline-block mr-2" />Loading...</div>;

    return (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b bg-muted/50">
                        <th className="h-10 px-4 text-left font-medium sticky left-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-r bg-card z-20">Member</th>
                        {MONTHS.map(m => (
                            <th key={m} className="h-10 px-2 text-center font-medium w-16 border-b border-r last:border-r-0">{m}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {members.map(member => (
                        <tr key={member.id} className="last:border-0 hover:bg-muted/50 transition-colors">
                            <td className="p-4 font-medium sticky left-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-r border-b bg-card z-10">
                                {member.name}
                            </td>
                            {MONTHS.map((_, monthIndex) => {
                                const isPaid = contributions.some(c => c.userId === member.id && c.month === monthIndex && c.year === currentYear);
                                const isToggling = togglingId === `${member.id}_${currentYear}_${monthIndex}`;

                                return (
                                    <td key={monthIndex} className="p-0 text-center border-r border-b first:border-l"> {/* Added borders */}
                                        <button
                                            onClick={() => toggleContribution(member.id, monthIndex)}
                                            disabled={isToggling || member.id !== currentUserId}
                                            title={member.id !== currentUserId ? "Nur eigene Beiträge verwalten" : undefined}
                                            className={cn(
                                                "w-full h-full min-h-[40px] flex items-center justify-center transition-all",
                                                isPaid
                                                    ? "text-primary bg-primary/5"
                                                    : "hover:bg-muted/50",
                                                (isToggling || member.id !== currentUserId) && "opacity-50 cursor-not-allowed"
                                            )}
                                        >
                                            {isToggling ? (
                                                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                            ) : isPaid ? (
                                                <Check className="h-4 w-4" />
                                            ) : null}
                                        </button>
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
