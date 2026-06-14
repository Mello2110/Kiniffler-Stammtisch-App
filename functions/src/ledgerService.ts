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
    linkedDocId?: string
): Promise<boolean> {
    try {
        await db.runTransaction(async (transaction) => {
            // Idempotency check if paypalTxId is provided
            if (paypalTxId) {
                const existingSnap = await transaction.get(
                    db.collection('ledger_entries').where('paypalTxId', '==', paypalTxId).limit(1)
                );
                if (!existingSnap.empty) {
                    console.log(`Ledger entry for PayPal Tx ${paypalTxId} already exists. Skipping.`);
                    return false; // Skip
                }
            }

            const docRef = db.collection('ledger_entries').doc();
            const newEntry: Partial<LedgerEntry> = {
                id: docRef.id,
                userId,
                amount,
                type,
                description,
                date: new Date().toISOString(),
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            };

            if (paypalTxId) newEntry.paypalTxId = paypalTxId;
            if (linkedDocId) newEntry.linkedDocId = linkedDocId;

            transaction.set(docRef, newEntry);
            return true;
        });

        return true;
    } catch (error) {
        console.error('Error creating ledger entry:', error);
        return false;
    }
}
