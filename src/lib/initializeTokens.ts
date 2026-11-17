import { db } from './firebase';
import { getDocs, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { DEFAULT_CLUB_ID, getClubCollection, getClubDoc } from '@/lib/clubPaths';

export async function initializeMemberTokens(clubId: string = DEFAULT_CLUB_ID) {
    console.log('Starting token initialization...');
    const membersSnap = await getDocs(getClubCollection(clubId, 'members'));
    const batch = writeBatch(db);
    const currentYear = new Date().getFullYear();

    membersSnap.forEach((memberDoc) => {
        const memberId = memberDoc.id;
        const memberData = memberDoc.data();

        // Only initialize if not already done
        if (memberData.tokenBalance === undefined) {
            batch.update(getClubDoc(clubId, 'members', memberId), {
                tokenBalance: 2,
                tokenShinyBalance: 0
            });

            const transRef = doc(getClubCollection(clubId, 'tokenTransactions'));
            const txPayload = {
                id: transRef.id,
                memberId,
                amount: 2,
                type: 'regular',
                category: 'initial',
                reason: 'Startguthaben',
                timestamp: serverTimestamp(),
                year: currentYear
            };
            batch.set(transRef, txPayload);
        }
    });

    await batch.commit();

    console.log('Token initialization complete!');
}
