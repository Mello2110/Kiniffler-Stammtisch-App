"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findMemberIdByEmail = exports.categorizeTransaction = void 0;
const RULES = [
    { category: 'contribution', keywords: ['beitrag', 'mitgliedsbeitrag', 'contribution'] },
    { category: 'penalty', keywords: ['strafe', 'penalty', 'kniffelstrafe'] },
    { category: 'expense', keywords: ['rechnung', 'invoice', 'server', 'hosting', 'cloudinary'] },
    { category: 'refund', keywords: ['erstattung', 'refund', 'rückzahlung'] },
];
function categorizeTransaction(amount, note, payerEmail) {
    const lowerNote = note.toLowerCase();
    // 1. Basic Keyword Matching
    for (const rule of RULES) {
        if (rule.keywords.some(k => lowerNote.includes(k))) {
            return rule.category;
        }
    }
    // 2. Specific Contribution Amounts (fallback)
    if ((amount === 5 || amount === 10 || amount === 20) && !(payerEmail === null || payerEmail === void 0 ? void 0 : payerEmail.includes('paypal.com'))) {
        // If it's a typical contribution amount and not a system transaction, guess contribution
        return 'contribution';
    }
    return 'uncategorized';
}
exports.categorizeTransaction = categorizeTransaction;
/**
 * Attempts to find a member ID by email.
 */
async function findMemberIdByEmail(db, email) {
    if (!email)
        return null;
    const lowerEmail = email.toLowerCase();
    // 1. Try matching dedicated paypalEmail field
    const paypalSnap = await db.collection('members')
        .where('paypalEmail', '==', lowerEmail)
        .limit(1)
        .get();
    if (!paypalSnap.empty)
        return paypalSnap.docs[0].id;
    // 2. Fallback to regular email
    const snap = await db.collection('members')
        .where('email', '==', lowerEmail)
        .limit(1)
        .get();
    if (snap.empty)
        return null;
    return snap.docs[0].id;
}
exports.findMemberIdByEmail = findMemberIdByEmail;
//# sourceMappingURL=categorization.js.map