import { db } from './firebase';
import { 
    collection, 
    addDoc, 
    updateDoc, 
    doc, 
    getDoc, 
    getDocs, 
    query, 
    where, 
    increment, 
    serverTimestamp, 
    writeBatch, 
    runTransaction, 
    limit,
    Timestamp
} from 'firebase/firestore';
import { TokenType, TokenTransaction } from '@/types';

const SHINY_CHANCE = 8192;

export const TokenService = {
    /**
     * Rolls for a shiny token.
     */
    rollForShiny(): boolean {
        return Math.floor(Math.random() * SHINY_CHANCE) === 0;
    },

    /**
     * Core function to award tokens to a member.
     */
    async awardToken(
        memberId: string, 
        reason: string, 
        category: TokenTransaction['category'],
        forceType?: TokenType
    ) {
        return await runTransaction(db, async (transaction) => {
            const memberRef = doc(db, 'members', memberId);
            const memberSnap = await transaction.get(memberRef);
            
            if (!memberSnap.exists()) return null;

            const type: TokenType = forceType || (this.rollForShiny() ? 'shiny' : 'regular');
            const amount = 1;
            const currentYear = new Date().getFullYear();

            // Create transaction doc
            const transRef = doc(collection(db, 'tokenTransactions'));
            transaction.set(transRef, {
                id: transRef.id,
                memberId,
                amount,
                type,
                category,
                reason,
                timestamp: serverTimestamp(),
                year: currentYear
            });

            // Update member balance
            const updateField = type === 'shiny' ? 'tokenShinyBalance' : 'tokenBalance';
            transaction.update(memberRef, {
                [updateField]: increment(amount)
            });

            return { type, isFirstShiny: type === 'shiny' && (memberSnap.data().tokenShinyBalance || 0) === 0 };
        });
    },

    /**
     * Revoke a token (for host changes)
     */
    async revokeToken(memberId: string, reason: string, category: TokenTransaction['category']) {
        return await runTransaction(db, async (transaction) => {
            const memberRef = doc(db, 'members', memberId);
            const memberSnap = await transaction.get(memberRef);
            if (!memberSnap.exists()) return;

            const data = memberSnap.data();
            // We only revoke regular tokens for host changes usually
            if ((data.tokenBalance || 0) <= 0) return;

            const transRef = doc(collection(db, 'tokenTransactions'));
            transaction.set(transRef, {
                id: transRef.id,
                memberId,
                amount: -1,
                type: 'regular',
                category,
                reason: `Storno: ${reason}`,
                timestamp: serverTimestamp(),
                year: new Date().getFullYear()
            });

            transaction.update(memberRef, {
                tokenBalance: increment(-1)
            });
        });
    },

    /**
     * Transfer tokens between members
     */
    async transferTokens(fromId: string, toId: string, amount: number, reason: string) {
        if (amount <= 0) return;

        return await runTransaction(db, async (transaction) => {
            const fromRef = doc(db, 'members', fromId);
            const toRef = doc(db, 'members', toId);
            
            const fromSnap = await transaction.get(fromRef);
            if (!fromSnap.exists() || (fromSnap.data().tokenBalance || 0) < amount) {
                throw new Error('Nicht genügend Tokens vorhanden.');
            }

            const currentYear = new Date().getFullYear();

            // From transaction
            const transFromRef = doc(collection(db, 'tokenTransactions'));
            transaction.set(transFromRef, {
                id: transFromRef.id,
                memberId: fromId,
                amount: -amount,
                type: 'regular',
                category: 'transfer',
                reason: `Gesendet an ${toId} (Deal: ${reason})`,
                timestamp: serverTimestamp(),
                year: currentYear
            });

            // To transaction
            const transToRef = doc(collection(db, 'tokenTransactions'));
            transaction.set(transToRef, {
                id: transToRef.id,
                memberId: toId,
                amount: amount,
                type: 'regular',
                category: 'transfer',
                reason: `Erhalten von ${fromId} (Deal: ${reason})`,
                timestamp: serverTimestamp(),
                year: currentYear
            });

            // Update balances
            transaction.update(fromRef, { tokenBalance: increment(-amount) });
            transaction.update(toRef, { tokenBalance: increment(amount) });
        });
    },

    /**
     * Checks if a user has already received a token for a specific month/category
     */
    async hasReceivedToken(memberId: string, category: string, uniqueKey: string): Promise<boolean> {
        const q = query(
            collection(db, 'tokenTransactions'),
            where('memberId', '==', memberId),
            where('category', '==', category),
            where('reason', '==', uniqueKey),
            limit(1)
        );
        const snap = await getDocs(q);
        return !snap.empty;
    },

    /**
     * Automated Check for Early Voting
     * Called by a central logic (Dashboard or Navbar check)
     */
    async processMonthlyEarlyVoterBonus() {
        // We check for the CURRENT month's bonus (voted in previous month)
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const bonusKey = `Early Voter Bonus ${currentMonth + 1}/${currentYear}`;

        const membersSnap = await getDocs(collection(db, 'members'));
        
        for (const memberDoc of membersSnap.docs) {
            const memberId = memberDoc.id;
            
            // 1. Check if already rewarded
            const alreadyDone = await this.hasReceivedToken(memberId, 'planning', bonusKey);
            if (alreadyDone) continue;

            // 2. Check if voted for >= 2 dates in this month before the 1st
            // Actually, any vote that exists and was created before the 1st of the month counts.
            // But the user said "voted for at least 2 dates in this month before month start".
            
            const monthStart = new Date(currentYear, currentMonth, 1, 0, 0, 1);
            const votesQ = query(
                collection(db, 'stammtisch_votes'),
                where('userId', '==', memberId),
                where('month', '==', currentMonth),
                where('year', '==', currentYear),
                where('createdAt', '<', Timestamp.fromDate(monthStart))
            );
            
            const votesSnap = await getDocs(votesQ);
            if (votesSnap.size >= 2) {
                await this.awardToken(memberId, bonusKey, 'planning');
                console.log(`Awarded early voter bonus to ${memberId}`);
            }
        }
    }
};
