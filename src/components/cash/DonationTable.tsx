"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { collection, query, where, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import type { Member, Donation } from "@/types";

interface DonationTableProps {
    members: Member[];
    currentYear: number;
    currentUserId: string;
    canManage: boolean;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function DonationTable({ members, currentYear, currentUserId, canManage }: DonationTableProps) {
    const [donations, setDonations] = useState<Donation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [editingCell, setEditingCell] = useState<string | null>(null); // "userId_month"
    const [editValue, setEditValue] = useState("");

    useEffect(() => {
        const fetchDonations = async () => {
            const q = query(collection(db, "donations"), where("year", "==", currentYear));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Donation));
            setDonations(data);
            setIsLoading(false);
        };
        fetchDonations();
    }, [currentYear]);

    const handleCellClick = (memberId: string, monthIndex: number, currentValue: number) => {
        if (!canManage) return;
        setEditingCell(`${memberId}_${monthIndex}`);
        setEditValue(currentValue === 0 ? "" : currentValue.toString());
    };

    const handleDonationChange = async (memberId: string, monthIndex: number, newValue: string) => {
        if (!canManage) return;

        const compositeId = `${memberId}_${currentYear}_${monthIndex}`;
        const amount = parseInt(newValue);

        setUpdatingId(compositeId);

        try {
            const ref = doc(db, "donations", compositeId);

            if (isNaN(amount) || amount <= 0) {
                // If empty or 0, delete the record
                await deleteDoc(ref);
                setDonations(prev => prev.filter(d => d.id !== compositeId));
            } else {
                // Update/Create
                const newDonation: Donation = {
                    id: compositeId,
                    userId: memberId,
                    month: monthIndex,
                    year: currentYear,
                    amount: amount
                };
                await setDoc(ref, newDonation);
                // Update local state
                setDonations(prev => {
                    const others = prev.filter(d => d.id !== compositeId);
                    return [...others, newDonation];
                });
            }
        } catch (error) {
            console.error("Error updating donation:", error);
        } finally {
            setUpdatingId(null);
            setEditingCell(null);
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
                        <th className="h-10 px-4 text-right font-medium border-b sticky right-0 bg-background/95 backdrop-blur z-20">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {members.map(member => {
                        const memberDonations = donations.filter(d => d.userId === member.id && d.year === currentYear);
                        const rowTotal = memberDonations.reduce((sum, d) => sum + d.amount, 0);

                        return (
                            <tr key={member.id} className="last:border-0 hover:bg-muted/50 transition-colors">
                                <td className="p-4 font-medium sticky left-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-r border-b bg-card z-10 w-48">
                                    {member.name}
                                </td>
                                {MONTHS.map((_, monthIndex) => {
                                    const donation = memberDonations.find(d => d.month === monthIndex);
                                    const currentAmount = donation?.amount || 0;
                                    const isEditing = editingCell === `${member.id}_${monthIndex}`;
                                    const isUpdating = updatingId === `${member.id}_${currentYear}_${monthIndex}`;

                                    return (
                                        <td key={monthIndex} className="p-1 text-center border-r border-b">
                                            {isEditing ? (
                                                <input
                                                    type="number"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    onBlur={() => handleDonationChange(member.id, monthIndex, editValue)}
                                                    onKeyDown={(e) => e.key === "Enter" && handleDonationChange(member.id, monthIndex, editValue)}
                                                    className="w-10 text-center bg-background border rounded px-1 py-0.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                                                    autoFocus
                                                />
                                            ) : (
                                                <div
                                                    onClick={() => handleCellClick(member.id, monthIndex, currentAmount)}
                                                    className={cn(
                                                        "cursor-pointer hover:bg-white/10 rounded py-1 transition-colors min-h-[24px] flex items-center justify-center",
                                                        currentAmount > 0 ? "font-bold text-primary" : "text-muted-foreground/30",
                                                        !canManage && "cursor-default"
                                                    )}
                                                >
                                                    {isUpdating ? (
                                                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                                    ) : (
                                                        currentAmount > 0 ? currentAmount : "-"
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    );
                                })}
                                <td className="p-4 text-right font-bold border-b sticky right-0 bg-background/95 backdrop-blur z-10 w-24">
                                    {rowTotal > 0 ? `€${rowTotal}` : "-"}
                                </td>
                            </tr>
                        );
                    })}
                    {/* Grand Total Row */}
                    <tr className="bg-muted/50 border-t-2 border-border font-bold">
                        <td className="p-4 sticky left-0 bg-muted/95 backdrop-blur z-10 border-r">Total</td>
                        {MONTHS.map((_, monthIndex) => {
                            const monthTotal = donations
                                .filter(d => d.month === monthIndex && d.year === currentYear)
                                .reduce((sum, d) => sum + d.amount, 0);
                            return (
                                <td key={monthIndex} className="p-2 text-center border-r text-xs">
                                    {monthTotal > 0 ? `€${monthTotal}` : "-"}
                                </td>
                            );
                        })}
                        <td className="p-4 text-right sticky right-0 bg-muted/95 z-10">
                            €{donations.filter(d => d.year === currentYear).reduce((sum, d) => sum + d.amount, 0)}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}
