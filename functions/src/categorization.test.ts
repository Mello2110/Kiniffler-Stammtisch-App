import { categorizeTransaction } from './categorization';

describe('categorizeTransaction', () => {
    test('categorizes contribution by keyword', () => {
        expect(categorizeTransaction(15, 'Mitgliedsbeitrag März')).toBe('contribution');
        expect(categorizeTransaction(5, 'Beitrag')).toBe('contribution');
    });

    test('categorizes penalty by keyword', () => {
        expect(categorizeTransaction(2, 'Verspätungsstrafe')).toBe('penalty');
        expect(categorizeTransaction(1, 'Kniffelstrafe')).toBe('penalty');
    });

    test('categorizes expense by keyword', () => {
        expect(categorizeTransaction(-50, 'Hosting Rechnung')).toBe('expense');
        expect(categorizeTransaction(-10, 'Cloudinary Invoice')).toBe('expense');
    });

    test('categorizes contribution by specific amounts as fallback', () => {
        expect(categorizeTransaction(5, 'Test', 'payer@example.com')).toBe('contribution');
        expect(categorizeTransaction(10, 'Test', 'payer@example.com')).toBe('contribution');
    });

    test('returns uncategorized for unknown transactions', () => {
        expect(categorizeTransaction(123, 'Was ist das?')).toBe('uncategorized');
    });
});
