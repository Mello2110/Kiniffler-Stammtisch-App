"use client";

import { useMemo } from "react";
import { doc, collection, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useFirestoreDocument } from "@/hooks/useFirestoreDocument";
import { useFirestoreQuery } from "@/hooks/useFirestoreQuery";
import { Wallet, TrendingDown, Users, CreditCard, Receipt, PiggyBank, Scale } from "lucide-react";
import { useAllLedgers } from "@/hooks/useLedger";
import type { Member, Penalty, Donation, Expense } from "@/types";

export function CashBalance({ members = [], totalOutstanding = 0 }: { members?: Member[]; totalOutstanding?: number }) {
    // 1. Fetch All Ledgers
    const { entries: allLedgers } = useAllLedgers();

    // 2. Fetch Additional Stats (Penalties, Donations, Expenses)
    const qPenalties = useMemo(() => query(collection(db, "penalties")), []);
    const { data: penalties } = useFirestoreQuery<Penalty>(qPenalties);

    const qDonations = useMemo(() => query(collection(db, "donations")), []);
    const { data: donations } = useFirestoreQuery<Donation>(qDonations);

    const qExpenses = useMemo(() => query(collection(db, "expenses")), []);
    const { data: expenses } = useFirestoreQuery<Expense>(qExpenses);

    // 3. Fetch Start Balance Config
    const configRef = useMemo(() => doc(db, "config", "cash"), []);
    const { data: configData } = useFirestoreDocument<{ startingBalance: number }>(configRef);

    // Calculations
    const startingBalance = configData?.startingBalance || 0;
    
    // The startingBalance (stored in config/cash) represents the cumulative PayPal account
    // balance up to the point where ledger tracking started. It already incorporates all
    // historical expenses, outflows, and inflows.
    //
    // Since then, only paypal_deposit and paypal_withdrawal entries represent actual movements
    // of real money in/out of the PayPal account. Penalties, contributions, and expense
    // reimbursement entries are INTERNAL bookkeeping only and must NOT affect this total.
    const realCashFlowSum = allLedgers.reduce((sum, entry) => {
        if (entry.type === 'paypal_deposit' || entry.type === 'paypal_withdrawal') {
            return sum + entry.amount;
        }
        return sum;
    }, 0);
    
    // Real physical PayPal cash balance = historical balance + all PayPal transactions since tracking started
    const realCashBalance = startingBalance + realCashFlowSum;

    // Per-member net balances
    const balancesByMember: { [uid: string]: number } = {};
    allLedgers.forEach(entry => {
        balancesByMember[entry.userId] = (balancesByMember[entry.userId] || 0) + entry.amount;
    });

    const memberIds = new Set(members.map(m => m.id));
    
    let totalPositiveMemberBalance = 0; // Member credits (prepaid money in PayPal belonging to members)
    let totalNegativeBalance = 0;        // Member debts (unpaid contributions/penalties)

    Object.entries(balancesByMember).forEach(([uid, bal]) => {
        if (!memberIds.has(uid)) return; // Exclude 'system' and unknown IDs
        if (bal > 0) totalPositiveMemberBalance += bal;
        if (bal < 0) totalNegativeBalance += Math.abs(bal);
    });

    // Net Treasury / Club equity = real cash balance minus member credits
    const netTreasuryBalance = realCashBalance - totalPositiveMemberBalance;

    const donationsTotal = donations?.reduce((acc, d) => acc + (d.amount || 0), 0) || 0;
    const expensesTotal = expenses?.reduce((acc, e) => acc + (e.amount || 0), 0) || 0;
    const penaltiesTotal = penalties?.reduce((acc, p) => acc + (p.amount || 0), 0) || 0;

    return (
        <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 shadow-sm">
            <div className="flex items-center gap-4">
                <div className="rounded-full bg-primary/20 p-4 text-primary">
                    <Wallet className="h-8 w-8" />
                </div>
                <div>
                    <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Current Cash Balance</h2>
                    <div className="text-4xl font-extrabold flex items-center gap-1">
                        €{netTreasuryBalance.toFixed(2)}
                    </div>
                </div>
            </div>

            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 border-t border-primary/10 pt-4">
                <div>
                    <div className="text-xs text-muted-foreground mb-1">PayPal Kontostand</div>
                    <div className="font-semibold text-green-600 dark:text-green-400 flex items-center gap-1">
                        <CreditCard className="h-3 w-3" />
                        €{realCashBalance.toFixed(2)}
                    </div>
                </div>
                <div>
                    <div className="text-xs text-muted-foreground mb-1">Davon Mitgliederguthaben</div>
                    <div className="font-semibold text-blue-500 flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        €{totalPositiveMemberBalance.toFixed(2)}
                    </div>
                </div>
                <div>
                    <div className="text-xs text-muted-foreground mb-1">Ausstehende Forderungen</div>
                    <div className="font-semibold text-orange-500 flex items-center gap-1">
                        <TrendingDown className="h-3 w-3" />
                        €{(totalOutstanding || totalNegativeBalance).toFixed(2)}
                    </div>
                </div>
                <div>
                    <div className="text-xs text-muted-foreground mb-1">Ausgaben gesamt</div>
                    <div className="font-semibold text-red-500 flex items-center gap-1">
                        <Receipt className="h-3 w-3" />
                        €{expensesTotal.toFixed(2)}
                    </div>
                </div>
                <div>
                    <div className="text-xs text-muted-foreground mb-1">Spenden gesamt</div>
                    <div className="font-semibold text-purple-500 flex items-center gap-1">
                        <PiggyBank className="h-3 w-3" />
                        €{donationsTotal.toFixed(2)}
                    </div>
                </div>
                <div>
                    <div className="text-xs text-muted-foreground mb-1">Strafen gesamt</div>
                    <div className="font-semibold text-yellow-600 dark:text-yellow-500 flex items-center gap-1">
                        <Scale className="h-3 w-3" />
                        €{penaltiesTotal.toFixed(2)}
                    </div>
                </div>
            </div>
        </div>
    );
}

