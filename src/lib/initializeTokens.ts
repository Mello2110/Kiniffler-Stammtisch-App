import { db } from './firebase';
import { collection, getDocs, writeBatch, doc, serverTimestamp } from 'firebase/firestore';

export async function initializeMemberTokens() {
    console.log('Starting token initialization...');
    const membersSnap = await getDocs(collection(db, 'members'));
    const batch = writeBatch(db);
    const currentYear = new Date().getFullYear();

    membersSnap.forEach((memberDoc) => {
        const memberId = memberDoc.id;
        const memberData = memberDoc.data();

        // Only initialize if not already done
        if (memberData.tokenBalance === undefined) {
            // Update member denormalized balance
            batch.update(doc(db, 'members', memberId), {
                tokenBalance: 2,
                tokenShinyBalance: 0
            });

            // Create initial transaction record
            const transRef = doc(collection(db, 'tokenTransactions'));
            batch.set(transRef, {
                id: transRef.id,
                memberId,
                amount: 2,
                type: 'regular',
                category: 'initial',
                reason: 'Startguthaben',
                timestamp: serverTimestamp(),
                year: currentYear
            });
        }
    });

    await batch.commit();

    // Trigger monthly bonus check
    try {
        const { TokenService } = await import('./TokenService');
        await TokenService.processMonthlyEarlyVoterBonus();
    } catch (e) {
        console.error("Monthly bonus check failed", e);
    }

    console.log('Token initialization complete!');
}
