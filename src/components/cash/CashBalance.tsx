"use client";

import { useMemo } from "react";
import { collection, query, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useFirestoreQuery } from "@/hooks/useFirestoreQuery";
import { useFirestoreDocument } from "@/hooks/useFirestoreDocument";
import { Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { useAllLedgers } from "@/hooks/useLedger";
import type { Member } from "@/types";

export function CashBalance({ members = [] }: { members?: Member[] }) {
    // 1. Fetch All Ledgers
    const { entries: allLedgers } = useAllLedgers();
    const qPenalties = useMemo(() => query(collection(db, "penalties")), []);
    const { data: penalties } = useFirestoreQuery<{ amount: number; isPaid: boolean }>(qPenalties);

    // 2. Fetch Contributions
    const qContributions = useMemo(() => query(collection(db, "contributions")), []);
    const { data: contributions } = useFirestoreQuery(qContributions);

    // 3. Fetch Expenses
    const qExpenses = useMemo(() => query(collection(db, "expenses")), []);
    const { data: expenses } = useFirestoreQuery<{ amount: number }>(qExpenses);

    // 3.1 Fetch Donations
    const qDonations = useMemo(() => query(collection(db, "donations")), []);
    const { data: donations } = useFirestoreQuery<{ amount: number }>(qDonations);

    // 4. Fetch Start Balance Config
    const configRef = useMemo(() => doc(db, "config", "cash"), []);
    const { data: configData } = useFirestoreDocument<{ startingBalance: number }>(configRef);

    // Calculations
    const startingBalance = configData?.startingBalance || 0;
    
    let penaltiesTotal = 0;
    let contributionsTotal = 0;
    
    allLedgers.forEach(entry => {
        if (entry.type === 'penalty') penaltiesTotal += Math.abs(entry.amount);
        if (entry.type === 'contribution') contributionsTotal += Math.abs(entry.amount);
    });

    const balancesByMember: { [uid: string]: number } = {};
    allLedgers.forEach(entry => {
        balancesByMember[entry.userId] = (balancesByMember[entry.userId] || 0) + entry.amount;
    });

    let totalNegativeBalance = 0;
    Object.values(balancesByMember).forEach(bal => {
        if (bal < 0) totalNegativeBalance += Math.abs(bal);
    });

    let displayOutstanding = 0;
    if (members && members.length > 0) {
        members.forEach(member => {
            const bal = balancesByMember[member.id] || 0;
            if (bal < -0.01) {
                displayOutstanding += Math.abs(bal);
            }
        });
    } else {
        // Fallback
        Object.keys(balancesByMember).forEach(uid => {
            if (uid !== "system") {
                const bal = balancesByMember[uid] || 0;
                if (bal < -0.01) displayOutstanding += Math.abs(bal);
            }
        });
    }

    const donationsTotal = donations?.reduce((acc, d) => acc + (d.amount || 0), 0) || 0;
    const expensesTotal = expenses?.reduce((acc, e) => acc + (e.amount || 0), 0) || 0;

    // We rely PURELY on the ledger system. 
    // Expenses automatically create a "system" debt in the ledger, which is picked up by totalNegativeBalance.
    // No explicit subtraction is needed.
    const currentBalance = startingBalance + contributionsTotal + donationsTotal + penaltiesTotal - totalNegativeBalance;

    return (
        <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 shadow-sm">
            <div className="flex items-center gap-4">
                <div className="rounded-full bg-primary/20 p-4 text-primary">
                    <Wallet className="h-8 w-8" />
                </div>
                <div>
                    <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Current Cash Balance</h2>
                    <div className="text-4xl font-extrabold flex items-center gap-1">
                        €{currentBalance.toFixed(2)}
                    </div>
                </div>
            </div>

            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-primary/10 pt-4">
                <div>
                    <div className="text-xs text-muted-foreground mb-1">Contributions</div>
                    <div className="font-semibold text-green-600 dark:text-green-400 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        €{contributionsTotal.toFixed(2)}
                    </div>
                </div>
                <div>
                    <div className="text-xs text-muted-foreground mb-1">Strafen</div>
                    <div className="font-semibold text-green-600 dark:text-green-400 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        €{penaltiesTotal.toFixed(2)}
                    </div>
                </div>
                <div>
                    <div className="text-xs text-muted-foreground mb-1">Ausstehende Zahlungen</div>
                    <div className="font-semibold text-orange-500 flex items-center gap-1">
                        <TrendingDown className="h-3 w-3" />
                        €{displayOutstanding.toFixed(2)}
                    </div>
                </div>
                <div>
                    <div className="text-xs text-muted-foreground mb-1">Donations</div>
                    <div className="font-semibold text-green-600 dark:text-green-400 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        €{donationsTotal.toFixed(2)}
                    </div>
                </div>
                <div>
                    <div className="text-xs text-muted-foreground mb-1">Expenses</div>
                    <div className="font-semibold text-red-600 dark:text-red-400 flex items-center gap-1">
                        <TrendingDown className="h-3 w-3" />
                        €{expensesTotal.toFixed(2)}
                    </div>
                </div>
            </div>
        </div>
    );
}
