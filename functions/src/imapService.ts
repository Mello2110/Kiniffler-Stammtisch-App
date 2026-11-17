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
            // --- UID CURSOR TRACKING (O(Δ) statt O(N) Vollabfrage) ---
            const syncConfigRef = db.collection('config').doc('imap_sync');
            const syncConfigSnap = await syncConfigRef.get();
            const mailboxUidValidity = client.mailbox ? Number(client.mailbox.uidValidity) : 0;
            const mailboxUidNext = client.mailbox ? Number(client.mailbox.uidNext) : 0;

            let lastProcessedUid = 0;
            if (syncConfigSnap.exists) {
                const syncData = syncConfigSnap.data() || {};
                // Falls sich uidValidity des Postfachs geändert hat, Cursor zurücksetzen (Idempotenz über paypalTxId schützt vor Duplikaten)
                if (!syncData.uidValidity || Number(syncData.uidValidity) === mailboxUidValidity) {
                    lastProcessedUid = Number(syncData.lastProcessedUid || 0);
                } else {
                    console.warn(`Mailbox uidValidity changed (${syncData.uidValidity} -> ${mailboxUidValidity}). Resetting UID cursor to 0.`);
                }
            }

            if (mailboxUidNext > 0 && lastProcessedUid >= mailboxUidNext - 1) {
                console.log(`No new emails since UID ${lastProcessedUid} (uidNext=${mailboxUidNext}). Skipping fetch.`);
                return;
            }

            const uidRange = `${lastProcessedUid + 1}:*`;
            console.log(`Searching for new PayPal emails in UID range ${uidRange} (lastProcessedUid=${lastProcessedUid})...`);

            // Suche nur Nachrichten mit UID > lastProcessedUid und Absender 'paypal'
            const candidateUids = await client.search(
                { uid: uidRange, from: 'paypal' },
                { uid: true }
            );

            const newUids = (candidateUids || []).filter((uid: number) => uid > lastProcessedUid).sort((a: number, b: number) => a - b);
            if (newUids.length === 0) {
                console.log(`No new PayPal emails found above UID ${lastProcessedUid}.`);
                if (mailboxUidNext > 1 && mailboxUidNext - 1 > lastProcessedUid) {
                    await syncConfigRef.set({
                        lastProcessedUid: mailboxUidNext - 1,
                        uidValidity: mailboxUidValidity,
                        lastSyncAt: admin.firestore.FieldValue.serverTimestamp(),
                    }, { merge: true });
                }
                return;
            }

            console.log(`Found ${newUids.length} new PayPal candidate email(s): UIDs [${newUids.join(', ')}]`);

            let emailCount = 0;
            let processedCount = 0;
            let highestSeenUid = lastProcessedUid;

            // IMPORTANT: Messages must be processed INSIDE the for-await loop.
            // The message.source is a stream that becomes invalid after the loop ends.
            for await (const message of client.fetch(newUids, { uid: true, source: true, internalDate: true }, { uid: true })) {
                emailCount++;
                const currentUid = Number(message.uid || 0);
                if (currentUid > highestSeenUid) {
                    highestSeenUid = currentUid;
                }

                if (!message.source) {
                    console.warn(`Message UID ${currentUid}: no source, skipping`);
                    continue;
                }

                let parsedEmail: any;
                try {
                    parsedEmail = await simpleParser(message.source as Buffer);
                } catch (parseErr: any) {
                    console.error(`Message UID ${currentUid}: failed to parse:`, parseErr.message);
                    continue;
                }

                // Skip PayPal marketing/newsletter emails immediately
                const fromAddress = (parsedEmail.from?.value?.[0]?.address || '').toLowerCase();
                if (fromAddress.includes('news.paypal') || fromAddress.includes('marketing')) {
                    console.log(`Skipping marketing email [UID ${currentUid}] from ${fromAddress}`);
                    continue;
                }

                const subject = parsedEmail.subject || '';
                const emailDateIso = parsedEmail.date
                    ? new Date(parsedEmail.date).toISOString()
                    : (message.internalDate ? new Date(message.internalDate).toISOString() : new Date().toISOString());

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
                console.log(`[UID ${currentUid}] Email (${emailDateIso}) body preview (500 chars): "${text.substring(0, 500)}"`);

                // Only process payment notifications
                const lowerSubject = subject.toLowerCase();
                if (!lowerSubject.includes('zahlung') && !lowerSubject.includes('payment') && !lowerSubject.includes('gesendet') && !lowerSubject.includes('erhalten')) {
                    console.log(`Skipping non-payment [UID ${currentUid}]: "${subject}"`);
                    continue;
                }

                console.log(`Processing payment email [UID ${currentUid}]: "${subject}" (${emailDateIso})`);

                const data = parsePayPalEmail(text, subject);
                if (!data) {
                    console.warn(`Could not parse payment data from [UID ${currentUid}]: "${subject}"`);
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

                // Some PayPal emails omit the custom note from the plain text fallback.
                // We should also search the raw HTML just in case.
                const htmlContent = (parsedEmail.html === true ? '' : (parsedEmail.html || '')).toString();
                
                const isKasse = /kasse/i.test(text) || /kasse/i.test(subject) || /kasse/i.test(htmlContent);

                if (isKasse) {
                    console.log(`'Kasse' keyword found in email. Booking as system deposit instead of personal member balance.`);
                    const finalAmount = data.isDeposit ? data.amount : -data.amount;
                    const type = data.isDeposit ? 'paypal_deposit' : 'paypal_withdrawal';
                    const description = `Manuelle Kassen-Einzahlung via PayPal (${nameOrEmail})`;
                    
                    // Use 'system' as memberId so it's not tied to any real user
                    const success = await createLedgerEntry(db, 'system', finalAmount, type, description, data.transactionId, undefined, emailDateIso);
                    
                    if (success) {
                        processedCount++;
                        console.log(`✓ Ledger entry (System/Kasse): ${finalAmount}€ (txId: ${data.transactionId})`);
                    } else {
                        console.log(`Skip (already processed): txId ${data.transactionId}`);
                    }
                    continue; // Skip the personal member lookup
                }

                // 'Auszahlung' keyword: a group payout to a member that should NOT touch their personal balance.
                // The cash register (Kasse) pays out, so the amount is deducted from the system ledger
                // but the member's individual app balance remains unchanged.
                const isAuszahlung = /auszahlung/i.test(text) || /auszahlung/i.test(subject) || /auszahlung/i.test(htmlContent);

                if (isAuszahlung) {
                    console.log(`'Auszahlung' keyword found. Booking as system withdrawal — member balance untouched.`);
                    // Auszahlungen are always withdrawals from the Kasse (outgoing)
                    const finalAmount = data.isDeposit ? data.amount : -data.amount;
                    const type = 'paypal_withdrawal';
                    const description = `Stammtisch Auszahlung via PayPal (${nameOrEmail})`;

                    const success = await createLedgerEntry(db, 'system', finalAmount, type, description, data.transactionId, undefined, emailDateIso);

                    if (success) {
                        processedCount++;
                        console.log(`✓ Ledger entry (System/Auszahlung): ${finalAmount}€ → ${nameOrEmail} (txId: ${data.transactionId})`);
                    } else {
                        console.log(`Skip (already processed): txId ${data.transactionId}`);
                    }
                    continue; // Skip the personal member lookup
                }

                // --- PHASE 5: SMART TOKEN MATCHING (KP-[CLUB]-[USERSHORT]-[HASH4]) ---
                let memberId: string | null = null;
                let targetClubId = 'club_original';
                const tokenMatch = (text + ' ' + subject + ' ' + htmlContent).match(/\bKP-([A-Z0-9]{2,12})-([A-Z0-9]{4,8})-([A-F0-9]{4})\b/i);

                if (tokenMatch) {
                    const clubPrefix = tokenMatch[1].toUpperCase();
                    const userShort = tokenMatch[2].toUpperCase();
                    console.log(`Smart Payment Token detected: ${tokenMatch[0]} (clubPrefix=${clubPrefix}, userShort=${userShort})`);

                    // Resolve club by slug prefix
                    const clubsSnap = await db.collection('clubs').get();
                    for (const cDoc of clubsSnap.docs) {
                        const slugClean = String(cDoc.data().slug || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
                        if (slugClean === clubPrefix || cDoc.id.toUpperCase().includes(clubPrefix)) {
                            targetClubId = cDoc.id;
                            break;
                        }
                    }

                    // Resolve member inside targetClubId by UID prefix
                    const clubMembersSnap = await db.collection('clubs').doc(targetClubId).collection('members').get();
                    for (const mDoc of clubMembersSnap.docs) {
                        const uidClean = mDoc.id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
                        if (uidClean === userShort) {
                            memberId = mDoc.id;
                            break;
                        }
                    }
                }

                // Match member: PayPal display name first (primary), then email/name fallback
                if (!memberId) memberId = await findMemberIdByPayPalName(db, nameOrEmail);
                if (!memberId) memberId = await findMemberIdByEmail(db, nameOrEmail);
                if (!memberId) memberId = await findMemberIdByName(db, nameOrEmail);

                if (!memberId) {
                    // No member matched — book as a system entry so the cash balance stays accurate.
                    // This covers external payments (e.g. food orders via PayPal) where the recipient
                    // is not a club member. Nothing is lost; the transaction is fully visible in the
                    // transaction history with 'Kasse / System' as the participant.
                    console.warn(`No member found for: "${nameOrEmail}" — booking as system entry instead.`);
                    const finalAmount = data.isDeposit ? data.amount : -data.amount;
                    const type = data.isDeposit ? 'paypal_deposit' : 'paypal_withdrawal';
                    const label = data.isDeposit ? 'Sonstige Einzahlung' : 'Sonstige Auszahlung';
                    const description = `${label} via PayPal (unbekannt: ${nameOrEmail})`;

                    const success = await createLedgerEntry(db, 'system', finalAmount, type, description, data.transactionId, undefined, emailDateIso);

                    if (success) {
                        processedCount++;
                        console.log(`✓ Ledger entry (System/Unbekannt): ${finalAmount}€ for "${nameOrEmail}" (txId: ${data.transactionId})`);
                    } else {
                        console.log(`Skip (already processed): txId ${data.transactionId}`);
                    }
                    continue;
                }

                console.log(`Member matched: ${memberId} for "${nameOrEmail}"`);

                const finalAmount = data.isDeposit ? data.amount : -data.amount;
                const type = data.isDeposit ? 'paypal_deposit' : 'paypal_withdrawal';
                const description = `PayPal ${data.isDeposit ? 'Einzahlung von' : 'Auszahlung an'} ${data.nameOrEmail}`;

                const success = await createLedgerEntry(db, memberId, finalAmount, type, description, data.transactionId, undefined, emailDateIso, targetClubId);

                if (success) {
                    processedCount++;
                    console.log(`✓ Ledger entry: ${finalAmount}€ → member ${memberId} (txId: ${data.transactionId}, date: ${emailDateIso})`);
                } else {
                    console.log(`Skip (already processed): txId ${data.transactionId}`);
                }
            }

            // Persistiere neuen UID-Cursor nach erfolgreichem Durchlauf
            if (highestSeenUid > lastProcessedUid) {
                await syncConfigRef.set({
                    lastProcessedUid: highestSeenUid,
                    uidValidity: mailboxUidValidity,
                    lastSyncAt: admin.firestore.FieldValue.serverTimestamp(),
                }, { merge: true });
                console.log(`Updated IMAP UID cursor: lastProcessedUid=${highestSeenUid} (uidValidity=${mailboxUidValidity})`);
            }

            console.log(`IMAP scan complete: ${emailCount} new PayPal email(s) scanned, ${processedCount} new ledger entries created.`);

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

