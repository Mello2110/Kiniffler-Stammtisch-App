import * as admin from 'firebase-admin';
import { LedgerEntry, LedgerTransactionCategory } from './types';

/**
 * Creates a new ledger entry for a user, effectively changing their virtual balance.
 * Uses a Firestore transaction to ensure atomicity.
 * 
 * @param db Firestore database instance
 * @param userId ID of the member
 * @param amount Amount to add/subtract (positive for deposit, negative for withdrawal/cost)
 * @param type Category of the transaction
 * @param description Description for the user
 * @param paypalTxId Optional PayPal transaction ID to prevent duplicates
 * @param linkedDocId Optional ID of a related document (Penalty, Contribution)
 * @returns boolean indicating success
 */
export async function createLedgerEntry(
    db: admin.firestore.Firestore,
    userId: string,
    amount: number,
    type: LedgerTransactionCategory,
    description: string,
    paypalTxId?: string,
    linkedDocId?: string,
    transactionDateIso?: string,
    clubId: string = 'club_original'
): Promise<boolean> {
    try {
        const created = await db.runTransaction(async (transaction) => {
            const clubLedgersCol = db.collection('clubs').doc(clubId).collection('ledger_entries');
            const rootLedgersCol = db.collection('ledger_entries');

            // Idempotency check if paypalTxId is provided
            if (paypalTxId) {
                const existingClubSnap = await transaction.get(
                    clubLedgersCol.where('paypalTxId', '==', paypalTxId).limit(1)
                );
                if (!existingClubSnap.empty) {
                    console.log(`Ledger entry for PayPal Tx ${paypalTxId} already exists in club ${clubId}. Skipping.`);
                    return false;
                }
                if (clubId === 'club_original') {
                    const existingRootSnap = await transaction.get(
                        rootLedgersCol.where('paypalTxId', '==', paypalTxId).limit(1)
                    );
                    if (!existingRootSnap.empty) {
                        console.log(`Ledger entry for PayPal Tx ${paypalTxId} already exists in root. Skipping.`);
                        return false;
                    }
                }
            }

            const docRef = clubLedgersCol.doc();
            const effectiveDateIso = transactionDateIso || new Date().toISOString();
            const newEntry: Partial<LedgerEntry> = {
                id: docRef.id,
                userId,
                amount,
                type,
                description,
                date: effectiveDateIso,
                createdAt: admin.firestore.Timestamp.fromDate(new Date(effectiveDateIso)),
            };

            if (paypalTxId) newEntry.paypalTxId = paypalTxId;
            if (linkedDocId) newEntry.linkedDocId = linkedDocId;

            transaction.set(docRef, newEntry);
            // Non-destructive dual write to root ledger_entries for club_original
            if (clubId === 'club_original') {
                transaction.set(rootLedgersCol.doc(docRef.id), newEntry);
            }
            return true;
        });

        return created;
    } catch (error) {
        console.error('Error creating ledger entry:', error);
        return false;
    }
}
