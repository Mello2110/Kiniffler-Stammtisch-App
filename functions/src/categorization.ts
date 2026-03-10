import { PayPalTransactionCategory } from '../../src/types';

interface Rule {
    category: PayPalTransactionCategory;
    keywords: string[];
}

const RULES: Rule[] = [
    { category: 'contribution', keywords: ['beitrag', 'mitgliedsbeitrag', 'contribution'] },
    { category: 'penalty', keywords: ['strafe', 'penalty', 'kniffelstrafe'] },
    { category: 'expense', keywords: ['rechnung', 'invoice', 'server', 'hosting', 'cloudinary'] },
    { category: 'refund', keywords: ['erstattung', 'refund', 'rückzahlung'] },
];

export function categorizeTransaction(
    amount: number,
    note: string,
    payerEmail?: string
): PayPalTransactionCategory {
    const lowerNote = note.toLowerCase();

    // 1. Basic Keyword Matching
    for (const rule of RULES) {
        if (rule.keywords.some(k => lowerNote.includes(k))) {
            return rule.category;
        }
    }

    // 2. Specific Contribution Amounts (fallback)
    if ((amount === 5 || amount === 10 || amount === 20) && !payerEmail?.includes('paypal.com')) {
        // If it's a typical contribution amount and not a system transaction, guess contribution
        return 'contribution';
    }

    return 'uncategorized';
}

/**
 * Attempts to find a member ID by email.
 */
export async function findMemberIdByEmail(db: any, email: string): Promise<string | null> {
    if (!email) return null;
    const lowerEmail = email.toLowerCase();

    // 1. Try matching dedicated paypalEmail field
    const paypalSnap = await db.collection('members')
        .where('paypalEmail', '==', lowerEmail)
        .limit(1)
        .get();

    if (!paypalSnap.empty) return paypalSnap.docs[0].id;

    // 2. Fallback to regular email
    const snap = await db.collection('members')
        .where('email', '==', lowerEmail)
        .limit(1)
        .get();

    if (snap.empty) return null;
    return snap.docs[0].id;
}
