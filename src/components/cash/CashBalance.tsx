"use client";

import { useMemo, useState, useEffect } from "react";
import { collection, onSnapshot, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DollarSign, Wallet, TrendingUp, TrendingDown } from "lucide-react";

export function CashBalance() {
    const [penaltiesTotal, setPenaltiesTotal] = useState(0);
    const [penaltiesPendingTotal, setPenaltiesPendingTotal] = useState(0);
    const [contributionsTotal, setContributionsTotal] = useState(0);
    const [expensesTotal, setExpensesTotal] = useState(0);
    const [startingBalance, setStartingBalance] = useState(0);

    useEffect(() => {
        // 1. Fetch Penalties Total
        const unsubPenalties = onSnapshot(collection(db, "penalties"), (snap) => {
            let paid = 0;
            let pending = 0;
            snap.docs.forEach(doc => {
                const data = doc.data();
                if (data.isPaid) {
                    paid += (data.amount || 0);
                } else {
                    pending += (data.amount || 0);
                }
            });
            setPenaltiesTotal(paid);
            setPenaltiesPendingTotal(pending);
        });

        // 2. Fetch Contributions Total
        const unsubContributions = onSnapshot(collection(db, "contributions"), (snap) => {
            // Each contribution document represents one paid month (isPaid=true usually)
            // If we follow the delete-if-unpaid logic, count docs * 15
            const count = snap.size;
            setContributionsTotal(count * 15);
        });

        // 3. Fetch Expenses Total
        const unsubExpenses = onSnapshot(collection(db, "expenses"), (snap) => {
            const total = snap.docs.reduce((acc, doc) => acc + (doc.data().amount || 0), 0);
            setExpensesTotal(total);
        });

        // 4. Fetch Config (Starting Balance)
        // We'll use a specific doc 'config/cash'
        const fetchConfig = async () => {
            // Real-time listener for config too
            const unsubConfig = onSnapshot(doc(db, "config", "cash"), (docSnap) => {
                if (docSnap.exists()) {
                    setStartingBalance(docSnap.data().startingBalance || 0);
                }
            });
            return unsubConfig;
        };

        const configPromise = fetchConfig();

        return () => {
            unsubPenalties();
            unsubContributions();
            unsubExpenses();
            configPromise.then(unsub => unsub());
        };
    }, []);

    const currentBalance = startingBalance + contributionsTotal + penaltiesTotal - expensesTotal;

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
                    <div className="text-xs text-muted-foreground mb-1">Penalties (Paid)</div>
                    <div className="font-semibold text-green-600 dark:text-green-400 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        €{penaltiesTotal.toFixed(2)}
                    </div>
                </div>
                <div>
                    <div className="text-xs text-muted-foreground mb-1">Penalties (Pending)</div>
                    <div className="font-semibold text-orange-500 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        €{penaltiesPendingTotal.toFixed(2)}
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
