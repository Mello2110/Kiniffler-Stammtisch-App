import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import * as admin from 'firebase-admin';
import { findMemberIdByEmail, findMemberIdByName, findMemberIdByPayPalName } from './categorization';
import { createLedgerEntry } from './ledgerService';

const IMAP_HOST = 'imap.mail.me.com';
const IMAP_PORT = 993;

interface ExtractedData {
    amount: number;
    transactionId: string;
    isDeposit: boolean;
    nameOrEmail: string;
    rawText: string;
}

/**
 * Extracts all email addresses found in a text
 */
function extractEmails(text: string): string[] {
    const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
    return [...new Set(text.match(emailRegex) || [])];
}

/**
 * Parses the plain text body of a PayPal email to extract relevant data.
 */
function parsePayPalEmail(text: string, subject: string): ExtractedData | null {
    const lowerSubject = subject.toLowerCase();
    const isDeposit = lowerSubject.includes('erhalten') || lowerSubject.includes('received') || lowerSubject.includes('payment received');
    const isWithdrawal = lowerSubject.includes('gesendet') || lowerSubject.includes('sent') || lowerSubject.includes('you sent');

    console.log(`Email subject: "${subject}" | isDeposit: ${isDeposit} | isWithdrawal: ${isWithdrawal}`);

    if (!isDeposit && !isWithdrawal) {
        console.log('Email is not a payment email — skipping');
        return null;
    }

    // Match Transaction ID (multiple formats)
    const txMatch =
        text.match(/Transaktionscode[:\s]+([A-Z0-9]{10,20})/i) ||
        text.match(/Transaction\s*ID[:\s]+([A-Z0-9]{10,20})/i) ||
        text.match(/Transaktionscode\s*([A-Z0-9]{10,20})/i);
    const transactionId = txMatch ? txMatch[1].trim() : null;

    // Match Amount: "€15,00" or "15,00 €" or "15.00 EUR" or "5,00 EUR"
    const amountMatch =
        text.match(/€\s*([0-9]+[.,][0-9]{2})/) ||
        text.match(/([0-9]+[.,][0-9]{2})\s*€/) ||
        text.match(/([0-9]+[.,][0-9]{2})\s*EUR/i);
    let amount = 0;
    if (amountMatch) {
        amount = parseFloat(amountMatch[1].replace(/\./g, '').replace(',', '.'));
    }

    // Extract sender name/email — try multiple patterns
    let nameOrEmail = '';
    if (isDeposit) {
        const nameMatch =
            text.match(/([^\n(]+?)\s+hat\s+dir\s+[0-9]+[.,][0-9]{2}\s*€\s*gesendet/i) ||
            text.match(/([A-Za-zäöüÄÖÜß\s]+)\s+hat\s+dir/i) || // Fallback: "Marcel Müller hat dir ..."
            text.match(/von\s+([^\n(]+?)\s+\([\w.@]+\)\s+erhalten/i) ||
            text.match(/von\s+([^\n]+?)\s+erhalten/i) ||
            text.match(/from\s+([^\n]+?)\s+received/i) ||
            text.match(/Zahlung\s+von\s+([^\n(]+?)(?:\s*\(|$)/im) ||
            text.match(/(?:Zahlung\s+erhalten\s+von|Payment\s+received\s+from)\s*([A-Za-zäöüÄÖÜß0-9\s]+)/i);
        if (nameMatch) nameOrEmail = nameMatch[1].trim();

        // If name not found or empty, try extracting email address from body
        if (!nameOrEmail || nameOrEmail.length < 2) {
            const allEmails = extractEmails(text);
            // Filter out PayPal's own emails
            const senderEmail = allEmails.find(e =>
                !e.includes('@paypal') && !e.includes('@intl.paypal') && !e.includes('noreply')
            );
            if (senderEmail) {
                nameOrEmail = senderEmail;
                console.log(`Fallback: extracted email from body: ${senderEmail}`);
            }
        }
    } else {
        const nameMatch =
            text.match(/an\s+([^\n(]+?)\s+\([\w.@]+\)\s+gesendet/i) ||
            text.match(/an\s+([^\n]+?)\s+gesendet/i) ||
            text.match(/to\s+([^\n]+?)\s+sent/i);
        if (nameMatch) nameOrEmail = nameMatch[1].trim();
    }

    console.log(`Parsed: amount=${amount}, txId=${transactionId}, nameOrEmail="${nameOrEmail}"`);
    console.log(`All emails in body: ${extractEmails(text).join(', ')}`);

    if (!amount) {
        console.error('Could not parse amount from PayPal email. Full text preview:', text.substring(0, 300));
        return null;
    }

    // If no transaction ID, generate a fallback
    const effectiveTxId = transactionId || `fallback_${amount}_${Date.now()}`;

    return {
        amount,
        transactionId: effectiveTxId,
        isDeposit,
        nameOrEmail,
        rawText: text
    };
}


export async function processPayPalEmails(db: admin.firestore.Firestore) {
    const user = process.env.IMAP_EMAIL;
    const pass = process.env.IMAP_PASSWORD;

    if (!user || !pass) {
        console.error('IMAP credentials not found in environment. IMAP_EMAIL and IMAP_PASSWORD must be set.');
        return;
    }

    console.log(`Connecting to IMAP: ${IMAP_HOST}:${IMAP_PORT} as ${user}`);

    const client = new ImapFlow({
        host: IMAP_HOST,
        port: IMAP_PORT,
        secure: true,
        auth: {
            user,
            pass
        },
        socketTimeout: 60000,
        connectionTimeout: 30000,
        logger: {
            debug: () => {},  // suppress debug noise
            info: () => {},
            warn: (obj: any) => console.warn('[IMAP WARN]', obj.msg || obj),
            error: (obj: any) => console.error('[IMAP ERROR]', obj.msg || obj),
        }
    });

    try {
        await client.connect();
        console.log('IMAP connected successfully');
    } catch (connErr: any) {
        console.error('IMAP connection failed:', connErr.message, connErr.code);
        return;
    }

    try {
        const lock = await client.getMailboxLock('INBOX');
        try {
            console.log('Searching for PayPal emails...');
            let emailCount = 0;
            let processedCount = 0;


            // IMPORTANT: Messages must be processed INSIDE the for-await loop.
            // The message.source is a stream that becomes invalid after the loop ends.
            for await (const message of client.fetch({ from: 'paypal' }, { source: true })) {
                emailCount++;

                if (!message.source) {
                    console.warn(`Message ${emailCount}: no source, skipping`);
                    continue;
                }

                let parsedEmail: any;
                try {
                    parsedEmail = await simpleParser(message.source as Buffer);
                } catch (parseErr: any) {
                    console.error(`Message ${emailCount}: failed to parse:`, parseErr.message);
                    continue;
                }

                const subject = parsedEmail.subject || '';

                // Get text content — PayPal emails are HTML-only, so strip HTML tags
                let rawText = parsedEmail.text || '';
                if (!rawText && parsedEmail.html) {
                    rawText = (parsedEmail.html as string)
                        .replace(/<[^>]+>/g, ' ')
                        .replace(/&nbsp;/g, ' ')
                        .replace(/&amp;/g, '&')
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .replace(/\s{2,}/g, ' ')
                        .trim();
                }
                const text = rawText;

                // Log preview for debugging
                console.log(`Email body preview (500 chars): "${text.substring(0, 500)}"`);

                // Only process payment notifications
                const lowerSubject = subject.toLowerCase();
                if (!lowerSubject.includes('zahlung') && !lowerSubject.includes('payment')) {
                    console.log(`Skipping non-payment: "${subject}"`);
                    continue;
                }

                console.log(`Processing payment email: "${subject}"`);

                const data = parsePayPalEmail(text, subject);
                if (!data) {
                    console.warn(`Could not parse payment data from: "${subject}"`);
                    continue;
                }

                // If nameOrEmail is still empty, try email headers (Reply-To, From of original sender)
                let nameOrEmail = data.nameOrEmail;
                if (!nameOrEmail) {
                    // Try to get sender info from parsed headers
                    const replyTo = parsedEmail.replyTo?.value?.[0]?.address || '';
                    const fromAddr = parsedEmail.from?.value?.[0]?.address || '';
                    const fromName = parsedEmail.from?.value?.[0]?.name || '';
                    console.log(`Header fallback — replyTo: "${replyTo}", from: "${fromAddr}" (${fromName})`);
                    // PayPal sends from noreply, so replyTo might have the real sender
                    if (replyTo && !replyTo.includes('paypal')) {
                        nameOrEmail = replyTo;
                    }
                }

                console.log(`Final nameOrEmail: "${nameOrEmail}"`);

                const isKasse = /kasse/i.test(text) || /kasse/i.test(subject);

                if (isKasse) {
                    console.log(`'Kasse' keyword found in email. Booking as system deposit instead of personal member balance.`);
                    const finalAmount = data.isDeposit ? data.amount : -data.amount;
                    const type = data.isDeposit ? 'paypal_deposit' : 'paypal_withdrawal';
                    const description = `Manuelle Kassen-Einzahlung via PayPal (${nameOrEmail})`;
                    
                    // Use 'system' as memberId so it's not tied to any real user
                    const success = await createLedgerEntry(db, 'system', finalAmount, type, description, data.transactionId);
                    
                    if (success) {
                        processedCount++;
                        console.log(`✓ Ledger entry (System/Kasse): ${finalAmount}€ (txId: ${data.transactionId})`);
                    } else {
                        console.log(`Skip (already processed): txId ${data.transactionId}`);
                    }
                    continue; // Skip the personal member lookup
                }

                // Match member: PayPal display name first (primary), then email/name fallback
                let memberId = await findMemberIdByPayPalName(db, nameOrEmail);
                if (!memberId) memberId = await findMemberIdByEmail(db, nameOrEmail);
                if (!memberId) memberId = await findMemberIdByName(db, nameOrEmail);

                if (!memberId) {
                    console.warn(`No member found for: "${nameOrEmail}" — ${data.amount}€ unassigned`);
                    continue;
                }

                console.log(`Member matched: ${memberId} for "${nameOrEmail}"`);

                const finalAmount = data.isDeposit ? data.amount : -data.amount;
                const type = data.isDeposit ? 'paypal_deposit' : 'paypal_withdrawal';
                const description = `PayPal ${data.isDeposit ? 'Einzahlung von' : 'Auszahlung an'} ${data.nameOrEmail}`;

                const success = await createLedgerEntry(db, memberId, finalAmount, type, description, data.transactionId);

                if (success) {
                    processedCount++;
                    console.log(`✓ Ledger entry: ${finalAmount}€ → member ${memberId} (txId: ${data.transactionId})`);
                } else {
                    console.log(`Skip (already processed): txId ${data.transactionId}`);
                }
            }

            console.log(`IMAP scan complete: ${emailCount} PayPal emails found, ${processedCount} new entries created.`);

        } finally {
            lock.release();
        }
    } catch (err: any) {
        console.error('Error processing IMAP emails:', err.message, err.stack);
    } finally {
        try {
            await client.logout();
            console.log('IMAP disconnected');
        } catch (logoutErr) {
            // ignore
        }
    }
}

