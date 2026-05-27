import { LedgerTransactionCategory } from './types';

interface Rule {
    category: LedgerTransactionCategory;
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
): LedgerTransactionCategory {
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
 * Attempts to find a member ID by their PayPal display name.
 * This is the PRIMARY matching strategy — members store their PayPal name in the 'paypalName' field.
 */
export async function findMemberIdByPayPalName(db: any, name: string): Promise<string | null> {
    if (!name) return null;
    const lowerName = name.toLowerCase().trim();

    const membersSnap = await db.collection('members').get();
    for (const doc of membersSnap.docs) {
        const d = doc.data();
        // 1. Exact match on paypalName
        if (d.paypalName && d.paypalName.toLowerCase().trim() === lowerName) {
            return doc.id;
        }
    }
    // 2. Partial match (PayPal name contains member's paypalName or vice versa)
    for (const doc of membersSnap.docs) {
        const d = doc.data();
        if (d.paypalName) {
            const pn = d.paypalName.toLowerCase().trim();
            if (lowerName.includes(pn) || pn.includes(lowerName)) {
                return doc.id;
            }
        }
    }
    return null;
}

/**
 * Attempts to find a member ID by email (fallback for backward compatibility).
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

/**
 * Attempts to find a member ID by app name (last resort fallback).
 */
export async function findMemberIdByName(db: any, name: string): Promise<string | null> {
    if (!name) return null;
    const lowerName = name.toLowerCase();

    const membersSnap = await db.collection('members').get();
    for (const doc of membersSnap.docs) {
        const d = doc.data();
        if (d.name && d.name.toLowerCase() === lowerName) return doc.id;
        if (d.name && lowerName.includes(d.name.toLowerCase())) return doc.id;
    }
    return null;
}
