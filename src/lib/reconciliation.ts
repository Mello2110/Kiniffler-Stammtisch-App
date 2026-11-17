// ============================================
// RECONCILIATION LOGIC — Expense-Penalty Balance
// ============================================
// Automatically marks penalties as paid (oldest first)
// when a member's total expenses cover them.

import {
    query,
    where,
    getDocs,
    writeBatch,
    serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DEFAULT_CLUB_ID, getClubCollection } from "@/lib/clubPaths";

export async function reconcileMemberBalance(memberId: string, clubId: string = DEFAULT_CLUB_ID): Promise<void> {
    if (!memberId) return;

    try {
        const batch = writeBatch(db);

        // --- Step 1: Fetch all expenses for this member ---
        const expensesQuery = query(
            getClubCollection(clubId, "expenses"),
            where("memberId", "==", memberId)
        );
        const expensesSnap = await getDocs(expensesQuery);
        const totalExpenses = expensesSnap.docs.reduce(
            (sum, doc) => sum + (doc.data().amount || 0),
            0
        );

        // --- Step 2: Fetch ALL penalties for this member ---
        const penaltiesQuery = query(
            getClubCollection(clubId, "penalties"),
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
            // NOTE: paidViaReconciliation may be undefined on older documents
            // (e.g. Kniffel penalties created before this field was added).
            // undefined === true is false → those are NOT treated as manually paid. ✓
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
