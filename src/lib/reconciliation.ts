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
    serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Reconcile a member's balance by auto-paying penalties from expenses.
 *
 * Algorithm:
 * 1. Fetch all expenses for this member → totalExpenses
 * 2. Fetch all penalties for this member, sort in memory by date ASC
 * 3. Reset ALL paidViaReconciliation flags
 * 4. Re-apply FIFO auto-payment from available credit
 * 5. Atomic write via Firestore batch
 *
 * This function is IDEMPOTENT — safe to call multiple times.
 *
 * NOTE: We sort in memory instead of using orderBy() to avoid
 * requiring a Firestore composite index on (userId, date).
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

        // --- Step 2: Fetch ALL penalties for this member ---
        // No orderBy to avoid composite index requirement
        const penaltiesQuery = query(
            collection(db, "penalties"),
            where("userId", "==", memberId)
        );
        const penaltiesSnap = await getDocs(penaltiesQuery);

        // Sort in memory by date ascending (oldest first for FIFO)
        const sortedPenalties = [...penaltiesSnap.docs].sort((a, b) => {
            const dateA = a.data().date || "";
            const dateB = b.data().date || "";
            return dateA.localeCompare(dateB);
        });

        // --- Step 3 + 4: Single pass with in-memory state tracking ---
        // Build effective state: determine which penalties are manually paid
        // vs. auto-reconciled vs. unpaid, then apply FIFO.

        let availableCredit = totalExpenses;

        sortedPenalties.forEach((penaltyDoc) => {
            const data = penaltyDoc.data();

            // If this penalty was previously auto-reconciled, reset it first
            if (data.paidViaReconciliation === true) {
                // Will be handled below — we treat it as "unpaid" for FIFO
            }

            // Skip manually paid penalties (isPaid=true but NOT via reconciliation)
            const isManuallyPaid = data.isPaid === true && data.paidViaReconciliation !== true;
            if (isManuallyPaid) {
                return; // Don't touch manually paid penalties
            }

            // This penalty is either unpaid or was previously auto-reconciled
            // Try to auto-pay it from available credit
            if (availableCredit >= data.amount) {
                // Mark as paid via reconciliation
                batch.update(penaltyDoc.ref, {
                    isPaid: true,
                    paidViaReconciliation: true,
                    reconciledAt: serverTimestamp(),
                });
                availableCredit -= data.amount;
            } else {
                // Not enough credit — ensure it's marked as unpaid
                // (important for previously auto-reconciled penalties that
                //  can no longer be covered after an expense was deleted)
                if (data.paidViaReconciliation === true || data.isPaid === true) {
                    batch.update(penaltyDoc.ref, {
                        isPaid: false,
                        paidViaReconciliation: false,
                        reconciledAt: null,
                    });
                }
            }
        });

        // --- Step 5: Commit all changes atomically ---
        await batch.commit();
        console.log(`Reconciliation complete for member ${memberId}: credit=${totalExpenses}, remaining=${availableCredit}`);
    } catch (error) {
        console.error("Reconciliation error for member:", memberId, error);
        throw error;
    }
}
