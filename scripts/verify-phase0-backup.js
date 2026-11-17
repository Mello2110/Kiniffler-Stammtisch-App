/**
 * PHASE 0: BACKUP VERIFICATION & INTEGRITY AUDITOR
 * =================================================
 * Prüft das erstellte Phase-0-Backup auf:
 * 1. Vollständigkeit aller Dateien gemäß manifest.json
 * 2. Kryptografische Übereinstimmung aller SHA-256 Checksummen
 * 3. Finanzielle & strukturelle Konsistenz (Mitglieder-Salden, Kassenstand, Punkte)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function computeSha256(content) {
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

function verifyLatestBackup() {
    const backupsRoot = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupsRoot)) {
        throw new Error('Kein backups/ Verzeichnis gefunden!');
    }

    const dirs = fs.readdirSync(backupsRoot)
        .filter(d => d.startsWith('phase0_snapshot_'))
        .sort();

    if (dirs.length === 0) {
        throw new Error('Kein Phase-0 Snapshot im backups/ Verzeichnis gefunden!');
    }

    const latestDir = path.join(backupsRoot, dirs[dirs.length - 1]);
    const manifestPath = path.join(latestDir, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    console.log('================================================================');
    console.log('🔍 PHASE 0: KRYPTOGRAFISCHE & INHALTLICHE BACKUP-VERIFIZIERUNG');
    console.log(`📁 Prüfe Snapshot: ${latestDir}`);
    console.log('================================================================\n');

    // 1. Checksummen-Prüfung
    let allHashesMatch = true;
    for (const [relFile, expectedHash] of Object.entries(manifest.checksums)) {
        const fullPath = path.join(latestDir, relFile);
        if (!fs.existsSync(fullPath)) {
            console.error(`❌ Datei fehlt: ${relFile}`);
            allHashesMatch = false;
            continue;
        }
        const actualHash = computeSha256(fs.readFileSync(fullPath, 'utf8'));
        if (actualHash !== expectedHash) {
            console.error(`❌ Hash-Mismatch bei ${relFile}: erwartet ${expectedHash}, erhalten ${actualHash}`);
            allHashesMatch = false;
        }
    }

    if (!allHashesMatch) {
        throw new Error('Integritätsprüfung fehlgeschlagen! Mindestens eine Checksumme stimmt nicht.');
    }
    console.log(`✅ Alle ${Object.keys(manifest.checksums).length} SHA-256 Checksummen zu 100% verifiziert!\n`);

    // 2. Chronologische & Perioden-Vollständigkeit prüfen (100% Reproduzierbarkeit)
    const snapshot = JSON.parse(fs.readFileSync(path.join(latestDir, 'full_firestore_and_media_snapshot.json'), 'utf8'));
    let missingChronologyCount = 0;
    let totalCheckedDocs = 0;

    for (const [colName, docs] of Object.entries(snapshot.collections)) {
        for (const doc of docs) {
            totalCheckedDocs++;
            if (!doc.__chronology__ || !doc.__chronology__.entryTimestampIso || !doc.__chronology__.periodKey) {
                console.error(`❌ Fehlende Chronologie-Daten bei ${colName}/${doc.id}`);
                missingChronologyCount++;
            }
        }
    }
    for (const [subPath, docs] of Object.entries(snapshot.subcollections)) {
        for (const doc of docs) {
            totalCheckedDocs++;
            if (!doc.__chronology__ || !doc.__chronology__.entryTimestampIso || !doc.__chronology__.periodKey) {
                console.error(`❌ Fehlende Chronologie-Daten bei ${subPath}/${doc.id}`);
                missingChronologyCount++;
            }
        }
    }
    if (missingChronologyCount > 0) {
        throw new Error(`Chronologie-Prüfung fehlgeschlagen: ${missingChronologyCount} Dokumente ohne Datum/Periode!`);
    }
    console.log(`✅ Alle ${totalCheckedDocs} Dokumente besitzen vollständige Zeitstempel (__chronology__.entryTimestampIso & periodKey YYYY-MM)!\n`);

    // 3. Finanzielle & strukturelle Kontrollsummen berechnen (Referenzwerte für Phase 1 & 2)
    const members = snapshot.collections.members || [];
    const ledgers = snapshot.collections.ledger_entries || [];
    const configCash = (snapshot.collections.config || []).find(c => c.id === 'cash');
    const startingBalance = configCash?.data?.startingBalance || 0;

    let realCashFlowSum = 0;
    const memberBalances = {};
    for (const m of members) {
        memberBalances[m.id] = { name: m.data.name, balance: 0, txCount: 0, points: m.data.points || 0 };
    }
    memberBalances['system'] = { name: 'Kasse / System', balance: 0, txCount: 0 };

    let latestDepositDate = '';
    for (const entry of ledgers) {
        const d = entry.data;
        const amt = Number(d.amount || 0);
        if (d.type === 'paypal_deposit' || d.type === 'paypal_withdrawal') {
            realCashFlowSum += amt;
        }
        if (d.type === 'paypal_deposit' && d.date > latestDepositDate) {
            latestDepositDate = d.date;
        }
        if (!memberBalances[d.userId]) {
            memberBalances[d.userId] = { name: `Unbekannt (${d.userId})`, balance: 0, txCount: 0 };
        }
        memberBalances[d.userId].balance += amt;
        memberBalances[d.userId].txCount += 1;
    }

    const realCashBalance = startingBalance + realCashFlowSum;
    let totalPositiveMemberBalance = 0;
    let totalNegativeBalance = 0;

    console.log('📊 AKTUELLE MITGLIEDER-SALDEN (BASELINE VOR PHASE 1):');
    for (const [uid, info] of Object.entries(memberBalances)) {
        if (uid !== 'system' && members.some(m => m.id === uid)) {
            if (info.balance > 0) totalPositiveMemberBalance += info.balance;
            if (info.balance < 0) totalNegativeBalance += Math.abs(info.balance);
        }
        console.log(`  - ${info.name.padEnd(22)} (${uid.padEnd(28)}): ${info.balance.toFixed(2).padStart(8)} € (${info.txCount} Buchungen)`);
    }

    const netTreasuryBalance = realCashBalance - totalPositiveMemberBalance;
    console.log('\n💰 KASSEN-KONTROLLWERTE (BASELINE):');
    console.log(`  - Startguthaben (config/cash) : ${startingBalance.toFixed(2)} €`);
    console.log(`  - PayPal Kontostand (real)    : ${realCashBalance.toFixed(2)} €`);
    console.log(`  - Mitgliederguthaben (+)      : ${totalPositiveMemberBalance.toFixed(2)} €`);
    console.log(`  - Ausstehende Forderungen (-) : ${totalNegativeBalance.toFixed(2)} €`);
    console.log(`  - Netto-Vereinskasse          : ${netTreasuryBalance.toFixed(2)} €`);
    console.log(`  - Letzte PayPal-Einzahlung am : ${latestDepositDate}`);
    console.log('================================================================');
}

verifyLatestBackup();
