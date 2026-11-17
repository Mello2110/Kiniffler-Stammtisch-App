/**
 * PHASE 1: ISOLIERTER ICLOUD IMAP & PAYPAL DIAGNOSE-RUN (READ-ONLY)
 * =================================================================
 * Prüft:
 * a) IMAP-Verbindung & iCloud App-Passwort Gültigkeit
 * b) Alle Ordner im iCloud-Postfach (INBOX, Junk, Archive, Trash, Sent, etc.)
 * c) Alle Mails seit dem 01.08.2026 (insbesondere 16.10.2026 & 19.10.2026)
 * d) Warum die bestehende Parsing-/Matching-Logik in imapService.ts diese Mails
 *    nicht erfasst oder falsch verarbeitet hat, und gleicht sie gegen das Firestore-Ledger ab.
 *
 * WICHTIG: 100% Read-Only (weder IMAP-Flags noch Firestore-Dokumente werden verändert).
 */

const fs = require('fs');
const path = require('path');

// Lade ImapFlow & mailparser aus functions/node_modules
const { ImapFlow } = require(path.join(__dirname, '..', 'functions', 'node_modules', 'imapflow'));
const { simpleParser } = require(path.join(__dirname, '..', 'functions', 'node_modules', 'mailparser'));

// Lade Credentials aus functions/.env
const envPath = path.join(__dirname, '..', 'functions', '.env');
const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const envVars = {};
for (const line of envContent.split(/\r?\n/)) {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (m) envVars[m[1].trim()] = m[2].trim();
}

const IMAP_HOST = 'imap.mail.me.com';
const IMAP_PORT = 993;
const IMAP_EMAIL = process.env.IMAP_EMAIL || envVars.IMAP_EMAIL;
const IMAP_PASSWORD = process.env.IMAP_PASSWORD || envVars.IMAP_PASSWORD;

// Lade unser verifiziertes Phase-0-Backup für den Abgleich mit bestehenden Ledger-Einträgen & Mitgliedern
function loadLatestBackup() {
    const backupsRoot = path.join(__dirname, '..', 'backups');
    const dirs = fs.readdirSync(backupsRoot).filter(d => d.startsWith('phase0_snapshot_')).sort();
    const latestDir = path.join(backupsRoot, dirs[dirs.length - 1]);
    return JSON.parse(fs.readFileSync(path.join(latestDir, 'full_firestore_and_media_snapshot.json'), 'utf8'));
}

async function runImapDiagnostic() {
    console.log('================================================================');
    console.log('🕵️‍♂️ PHASE 1: ISOLIERTER ICLOUD IMAP & PAYPAL DIAGNOSE-RUN');
    console.log('================================================================\n');

    const snapshot = loadLatestBackup();
    const members = (snapshot.collections.members || []).map(m => ({ id: m.id, ...m.data }));
    const ledgers = (snapshot.collections.ledger_entries || []).map(l => ({ id: l.id, ...l.data }));
    const existingTxIds = new Set(ledgers.map(l => l.paypalTxId).filter(Boolean));

    console.log(`📋 Geladene Referenzdaten aus Backup: ${members.length} Mitglieder, ${ledgers.length} Ledger-Einträge (${existingTxIds.size} mit PayPal-TxID)`);
    console.log('👥 Mitglieder & hinterlegte PayPal-Namen / E-Mails:');
    for (const m of members) {
        console.log(`   - ${m.name.padEnd(22)} | paypalName: "${(m.paypalName || '-').padEnd(22)}" | email: "${m.email || '-'}"`);
    }

    console.log(`\n🔌 Verbinde mit ${IMAP_HOST}:${IMAP_PORT} als ${IMAP_EMAIL}...`);
    const client = new ImapFlow({
        host: IMAP_HOST,
        port: IMAP_PORT,
        secure: true,
        auth: {
            user: IMAP_EMAIL,
            pass: IMAP_PASSWORD
        },
        socketTimeout: 60000,
        connectionTimeout: 30000,
        logger: false
    });

    try {
        await client.connect();
        console.log('✅ Hypothese a) geprüft: IMAP-Login erfolgreich! Das iCloud App-Passwort ist GÜLTIG.\n');
    } catch (err) {
        console.error('❌ Hypothese a) TREFFER: IMAP-Login fehlgeschlagen!', err.message, err.responseText || '');
        process.exit(1);
    }

    try {
        // 1. Alle Ordner auflisten (Hypothese b)
        console.log('📂 Prüfe Hypothese b): Liste alle IMAP-Ordner im iCloud-Account auf...');
        const mailboxes = await client.list();
        for (const mb of mailboxes) {
            console.log(`   - Pfad: "${mb.path}" (Name: "${mb.name}", Flags: ${Array.from(mb.flags || []).join(', ')})`);
        }

        // 2. Durchsuche ALLE relevanten Ordner nach Mails seit 01.08.2026
        const sinceDate = new Date('2026-08-01T00:00:00Z');
        console.log(`\n🔎 Durchsuche ALLE Ordner nach E-Mails seit dem 01.08.2026 (insb. Oktober 2026)...`);

        for (const mb of mailboxes) {
            // Überspringe reine Container-Ordner ohne Noselect
            if (mb.flags && mb.flags.has('\\Noselect')) continue;

            let lock;
            try {
                lock = await client.getMailboxLock(mb.path, { readOnly: true });
                const status = await client.status(mb.path, { messages: true, unseen: true, uidNext: true });
                console.log(`\n--- Ordner: [${mb.path}] (Gesamt: ${status.messages} Mails, Unseen: ${status.unseen}, uidNext: ${status.uidNext}) ---`);

                if (status.messages === 0) continue;

                // Suche alle Nachrichten seit 01.08.2026
                const searchUids = await client.search({ since: sinceDate }, { uid: true });
                console.log(`   Gefundene Mails seit 01.08.2026 in [${mb.path}]: ${searchUids.length}`);

                if (searchUids.length === 0) continue;

                for await (const msg of client.fetch(searchUids, { uid: true, envelope: true, internalDate: true, source: true }, { uid: true })) {
                    const parsed = await simpleParser(msg.source);
                    const fromStr = parsed.from?.text || '';
                    const subject = parsed.subject || '';
                    const dateIso = parsed.date ? parsed.date.toISOString() : (msg.internalDate ? new Date(msg.internalDate).toISOString() : '?');

                    let rawText = parsed.text || '';
                    if (!rawText && parsed.html) {
                        rawText = String(parsed.html)
                            .replace(/<[^>]+>/g, ' ')
                            .replace(/&nbsp;/g, ' ')
                            .replace(/&amp;/g, '&')
                            .replace(/&lt;/g, '<')
                            .replace(/&gt;/g, '>')
                            .replace(/\s{2,}/g, ' ')
                            .trim();
                    }

                    // Prüfe, was die aktuelle imapService.ts Logik mit dieser Mail machen würde
                    const lowerSubject = subject.toLowerCase();
                    const passesSubjectFilter = lowerSubject.includes('zahlung') || lowerSubject.includes('payment');
                    const isDeposit = lowerSubject.includes('erhalten') || lowerSubject.includes('received') || lowerSubject.includes('payment received');
                    const isWithdrawal = lowerSubject.includes('gesendet') || lowerSubject.includes('sent') || lowerSubject.includes('you sent');

                    const txMatch =
                        rawText.match(/Transaktionscode[:\s]+([A-Z0-9]{10,20})/i) ||
                        rawText.match(/Transaction\s*ID[:\s]+([A-Z0-9]{10,20})/i) ||
                        rawText.match(/Transaktionscode\s*([A-Z0-9]{10,20})/i);
                    const txId = txMatch ? txMatch[1].trim() : null;

                    const amountMatch =
                        rawText.match(/€\s*([0-9]+[.,][0-9]{2})/) ||
                        rawText.match(/([0-9]+[.,][0-9]{2})\s*€/) ||
                        rawText.match(/([0-9]+[.,][0-9]{2})\s*EUR/i);
                    const amount = amountMatch ? parseFloat(amountMatch[1].replace(/\./g, '').replace(',', '.')) : null;

                    const inLedger = txId ? existingTxIds.has(txId) : false;

                    console.log(`\n   📧 [UID ${msg.uid}] Datum: ${dateIso}`);
                    console.log(`      Von     : ${fromStr}`);
                    console.log(`      Betreff : "${subject}"`);
                    console.log(`      Filter  : passesSubjectFilter=${passesSubjectFilter} | isDeposit=${isDeposit} | isWithdrawal=${isWithdrawal}`);
                    console.log(`      Extrakt : Betrag=${amount} € | TxID=${txId || 'KEINE'} | Bereits im Ledger=${inLedger}`);
                    console.log(`      Text-Vorschau (400 Zeichen): ${rawText.slice(0, 400)}`);
                }
            } catch (folderErr) {
                console.warn(`   ⚠️ Konnte Ordner [${mb.path}] nicht lesen:`, folderErr.message);
            } finally {
                if (lock) lock.release();
            }
        }
    } finally {
        await client.logout();
        console.log('\n🔌 IMAP-Verbindung sauber getrennt.');
    }
}

runImapDiagnostic().catch(err => {
    console.error('Fehler im Diagnose-Skript:', err);
    process.exit(1);
});
