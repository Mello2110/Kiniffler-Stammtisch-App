// ============================================
// RECONCILIATION LOGIC — Expense-Penalty Balance
// ============================================
// Automatically marks penalties as paid (oldest first)
// when a member's total expenses cover them.

import {
    collection,
    query,
    where,
    getDocs,
    writeBatch,
    orderBy,
    serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Reconcile a member's balance by auto-paying penalties from expenses.
 *
 * Algorithm:
 * 1. Fetch all expenses for this member → totalExpenses
 * 2. Reset ALL paidViaReconciliation flags for this member
 * 3. Fetch all penalties for this member sorted by date ASC
 * 4. Iterate through unpaid penalties (FIFO), marking as paid if credit covers them
 * 5. Atomic write via Firestore batch
 *
 * This function is IDEMPOTENT — safe to call multiple times.
 */
export async function reconcileMemberBalance(memberId: string): Promise<void> {
    if (!memberId) return;

    try {
        const batch = writeBatch(db);

        // --- Step 1: Fetch all expenses for this member ---
        const expensesQuery = query(
            collection(db, "expenses"),
            where("memberId", "==", memberId)
        );
        const expensesSnap = await getDocs(expensesQuery);
        const totalExpenses = expensesSnap.docs.reduce(
            (sum, doc) => sum + (doc.data().amount || 0),
            0
        );

        // --- Step 2: Fetch ALL penalties for this member (sorted by date ASC) ---
        const penaltiesQuery = query(
            collection(db, "penalties"),
            where("userId", "==", memberId),
            orderBy("date", "asc")
        );
        const penaltiesSnap = await getDocs(penaltiesQuery);

        // --- Step 3: Reset all paidViaReconciliation flags ---
        penaltiesSnap.docs.forEach((penaltyDoc) => {
            const data = penaltyDoc.data();
            if (data.paidViaReconciliation === true) {
                batch.update(penaltyDoc.ref, {
                    isPaid: false,
                    paidViaReconciliation: false,
                    reconciledAt: null,
                });
            }
        });

        // --- Step 4: Calculate available credit and apply FIFO ---
        // Available credit = totalExpenses - sum of manually paid penalties (not via reconciliation)
        // Since we just reset all reconciliation flags, manually paid ones still have isPaid=true
        // We only auto-pay penalties that are currently unpaid (after reset)

        // After reset, get the effective state:
        // - Penalties that were manually paid: isPaid=true, paidViaReconciliation=false
        // - Penalties that were auto-paid (now reset): isPaid=false, paidViaReconciliation=false
        // - Penalties that were never paid: isPaid=false, paidViaReconciliation=false

        let availableCredit = totalExpenses;

        // We iterate through ALL penalties. For manually paid ones, skip.
        // For unpaid ones, try to auto-pay.
        penaltiesSnap.docs.forEach((penaltyDoc) => {
            const data = penaltyDoc.data();

            // Skip manually paid penalties (isPaid was true AND paidViaReconciliation was false before our reset)
            // Since we only reset paidViaReconciliation=true ones, manually paid ones still have isPaid=true
            if (data.isPaid && !data.paidViaReconciliation) {
                // This penalty is manually marked as paid, skip it
                return;
            }

            // This penalty is unpaid (or was auto-paid and we just reset it)
            if (availableCredit >= data.amount) {
                // Auto-pay this penalty
                batch.update(penaltyDoc.ref, {
                    isPaid: true,
                    paidViaReconciliation: true,
                    reconciledAt: serverTimestamp(),
                });
                availableCredit -= data.amount;
            }
        });

        // --- Step 5: Commit all changes atomically ---
        await batch.commit();
    } catch (error) {
        console.error("Reconciliation error for member:", memberId, error);
        throw error;
    }
}
