import { db } from './firebase';
import { 
    doc, 
    getDocs, 
    query, 
    where, 
    increment, 
    serverTimestamp, 
    runTransaction, 
    limit,
    Timestamp
} from 'firebase/firestore';
import { TokenType, TokenTransaction } from '@/types';
import { DEFAULT_CLUB_ID, getClubCollection, getClubDoc } from '@/lib/clubPaths';

const SHINY_CHANCE = 8192;

export const TokenService = {
    rollForShiny(): boolean {
        return Math.floor(Math.random() * SHINY_CHANCE) === 0;
    },

    async awardToken(
        memberId: string, 
        reason: string, 
        category: TokenTransaction['category'],
        forceType?: TokenType,
        clubId: string = DEFAULT_CLUB_ID
    ) {
        return await runTransaction(db, async (transaction) => {
            const memberRef = getClubDoc(clubId, 'members', memberId);
            const memberSnap = await transaction.get(memberRef);
            
            if (!memberSnap.exists()) return null;

            const type: TokenType = forceType || (this.rollForShiny() ? 'shiny' : 'regular');
            const amount = 1;
            const currentYear = new Date().getFullYear();

            const transRef = doc(getClubCollection(clubId, 'tokenTransactions'));
            const txPayload = {
                id: transRef.id,
                memberId,
                amount,
                type,
                category,
                reason,
                timestamp: serverTimestamp(),
                year: currentYear
            };
            transaction.set(transRef, txPayload);

            const updateField = type === 'shiny' ? 'tokenShinyBalance' : 'tokenBalance';
            transaction.update(memberRef, {
                [updateField]: increment(amount)
            });

            if (clubId === 'club_original') {
                transaction.set(doc(db, 'tokenTransactions', transRef.id), txPayload);
                transaction.update(doc(db, 'members', memberId), {
                    [updateField]: increment(amount)
                });
            }

            return { type, isFirstShiny: type === 'shiny' && (memberSnap.data().tokenShinyBalance || 0) === 0 };
        });
    },

    async revokeToken(memberId: string, reason: string, category: TokenTransaction['category'], clubId: string = DEFAULT_CLUB_ID) {
        return await runTransaction(db, async (transaction) => {
            const memberRef = getClubDoc(clubId, 'members', memberId);
            const memberSnap = await transaction.get(memberRef);
            if (!memberSnap.exists()) return;

            const data = memberSnap.data();
            if ((data.tokenBalance || 0) <= 0) return;

            const transRef = doc(getClubCollection(clubId, 'tokenTransactions'));
            const txPayload = {
                id: transRef.id,
                memberId,
                amount: -1,
                type: 'regular',
                category,
                reason: `Storno: ${reason}`,
                timestamp: serverTimestamp(),
                year: new Date().getFullYear()
            };
            transaction.set(transRef, txPayload);

            transaction.update(memberRef, {
                tokenBalance: increment(-1)
            });

            if (clubId === 'club_original') {
                transaction.set(doc(db, 'tokenTransactions', transRef.id), txPayload);
                transaction.update(doc(db, 'members', memberId), {
                    tokenBalance: increment(-1)
                });
            }
        });
    },

    async transferTokens(fromId: string, toId: string, amount: number, reason: string, clubId: string = DEFAULT_CLUB_ID) {
        if (amount <= 0) return;

        return await runTransaction(db, async (transaction) => {
            const fromRef = getClubDoc(clubId, 'members', fromId);
            const toRef = getClubDoc(clubId, 'members', toId);
            
            const fromSnap = await transaction.get(fromRef);
            if (!fromSnap.exists() || (fromSnap.data().tokenBalance || 0) < amount) {
                throw new Error('Nicht genügend Tokens vorhanden.');
            }

            const currentYear = new Date().getFullYear();

            const transFromRef = doc(getClubCollection(clubId, 'tokenTransactions'));
            const fromPayload = {
                id: transFromRef.id,
                memberId: fromId,
                amount: -amount,
                type: 'regular',
                category: 'transfer',
                reason: `Gesendet an ${toId} (Deal: ${reason})`,
                timestamp: serverTimestamp(),
                year: currentYear
            };
            transaction.set(transFromRef, fromPayload);

            const transToRef = doc(getClubCollection(clubId, 'tokenTransactions'));
            const toPayload = {
                id: transToRef.id,
                memberId: toId,
                amount: amount,
                type: 'regular',
                category: 'transfer',
                reason: `Erhalten von ${fromId} (Deal: ${reason})`,
                timestamp: serverTimestamp(),
                year: currentYear
            };
            transaction.set(transToRef, toPayload);

            transaction.update(fromRef, { tokenBalance: increment(-amount) });
            transaction.update(toRef, { tokenBalance: increment(amount) });

            if (clubId === 'club_original') {
                transaction.set(doc(db, 'tokenTransactions', transFromRef.id), fromPayload);
                transaction.set(doc(db, 'tokenTransactions', transToRef.id), toPayload);
                transaction.update(doc(db, 'members', fromId), { tokenBalance: increment(-amount) });
                transaction.update(doc(db, 'members', toId), { tokenBalance: increment(amount) });
            }
        });
    },

    async hasReceivedToken(memberId: string, category: string, uniqueKey: string, clubId: string = DEFAULT_CLUB_ID): Promise<boolean> {
        const q = query(
            getClubCollection(clubId, 'tokenTransactions'),
            where('memberId', '==', memberId),
            where('category', '==', category),
            where('reason', '==', uniqueKey),
            limit(1)
        );
        const snap = await getDocs(q);
        return !snap.empty;
    },

    async processMonthlyEarlyVoterBonus(clubId: string = DEFAULT_CLUB_ID) {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const bonusKey = `Early Voter Bonus ${currentMonth + 1}/${currentYear}`;

        const membersSnap = await getDocs(getClubCollection(clubId, 'members'));
        
        for (const memberDoc of membersSnap.docs) {
            const memberId = memberDoc.id;
            
            const alreadyDone = await this.hasReceivedToken(memberId, 'planning', bonusKey, clubId);
            if (alreadyDone) continue;

            const monthStart = new Date(currentYear, currentMonth, 1, 0, 0, 1);
            const votesQ = query(
                getClubCollection(clubId, 'stammtisch_votes'),
                where('userId', '==', memberId),
                where('month', '==', currentMonth),
                where('year', '==', currentYear),
                where('createdAt', '<', Timestamp.fromDate(monthStart))
            );
            
            const votesSnap = await getDocs(votesQ);
            if (votesSnap.size >= 2) {
                await this.awardToken(memberId, bonusKey, 'planning', undefined, clubId);
                console.log(`Awarded early voter bonus to ${memberId}`);
            }
        }
    }
};
