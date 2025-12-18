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
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function DonationTable({ members, currentYear, currentUserId }: DonationTableProps) {
    const [donations, setDonations] = useState<Donation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

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

    const handleDonationChange = async (memberId: string, monthIndex: number, newValue: string) => {
        // Only allow if it's the current user or strict mode?
        // Requirement: "Admin editable, user-specific based on currentUser.uid"
        // We stick to: Only editable if memberId === currentUserId (unless future admin role)
        if (memberId !== currentUserId) return;

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
                                    const isUpdating = updatingId === `${member.id}_${currentYear}_${monthIndex}`;
                                    const canEdit = member.id === currentUserId;

                                    return (
                                        <td key={monthIndex} className="p-0 text-center border-r border-b relative min-w-[3rem]">
                                            <input
                                                type="number"
                                                min="0"
                                                step="1"
                                                disabled={!canEdit || isUpdating}
                                                className={cn(
                                                    "w-full h-10 text-center bg-transparent focus:bg-primary/5 outline-none transition-colors scroll-none appearance-none",
                                                    // Hide spin buttons
                                                    "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                                                    donation?.amount ? "font-bold text-primary" : "text-muted-foreground",
                                                    !canEdit && "opacity-50 cursor-default bg-muted/10"
                                                )}
                                                placeholder={canEdit ? "-" : ""}
                                                value={donation?.amount || ""}
                                                onChange={(e) => handleDonationChange(member.id, monthIndex, e.target.value)}
                                            />
                                            {isUpdating && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                                                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
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
