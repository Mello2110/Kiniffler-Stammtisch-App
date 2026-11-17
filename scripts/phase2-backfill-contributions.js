/**
 * PHASE 2B: SANIERUNG & NACHBUCHUNG DER MONATSBEITRÄGE (1. DES MONATS REGEL)
 * =========================================================================
 * 1. Korrigiert die Datumsfelder (`date`, `createdAt`, `reconciledAt`) der bestehenden
 *    Monatsbeiträge von Juni, Juli und August 2026, die durch den UTC-Zeitzonen-Versatz
 *    bisher auf den Letzten des Vormonats (z.B. 30.06. 22:05 UTC statt 01.07.) datiert waren,
 *    exakt auf den 1. des jeweiligen Monats (`2026-06-01`, `2026-07-01`, `2026-08-01`).
 * 2. Bucht die fehlenden Monatsbeiträge für September (month=8), Oktober (month=9) und
 *    November (month=10) 2026 für alle 9 Stammtisch-Mitglieder nach — exakt datiert auf:
 *    - `2026-09-01T00:05:00.000Z` (Monatsbeitrag September 2026)
 *    - `2026-10-01T00:05:00.000Z` (Monatsbeitrag Oktober 2026)
 *    - `2026-11-01T00:05:00.000Z` (Monatsbeitrag November 2026)
 * 3. Schreibt synchron sowohl in `/clubs/club_original/...` als auch in die Root-Collections.
 */

const { initializeApp } = require('firebase/app');
const {
    getFirestore,
    collection,
    getDocs,
    doc,
    setDoc,
    updateDoc,
    query,
    where,
    Timestamp
} = require('firebase/firestore');

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCFa09-8DVF8o2OQssr15lZJ-aCIvh21HM",
    authDomain: "webapp-stammtisch.firebaseapp.com",
    projectId: "webapp-stammtisch",
    storageBucket: "webapp-stammtisch.firebasestorage.app",
    messagingSenderId: "112239637478",
    appId: "1:112239637478:web:78a18a3671f33605801c27"
};

const MONTH_NAMES = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

// Hilfsfunktion: Erzeugt den 1. des Monats um 08:00:00 UTC (damit er in UTC und Europe/Berlin immer der 01.MM.YYYY ist!)
function getFirstOfMonthIso(year, monthIndex0) {
    return new Date(Date.UTC(year, monthIndex0, 1, 8, 0, 0)).toISOString();
}

async function runContributionsFixAndBackfill() {
    console.log('================================================================');
    console.log('📅 MONATSBEITRÄGE: DATUMSKORREKTUR (01.MM.) & NACHBUCHUNG SEP–NOV');
    console.log('================================================================\n');

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const clubId = 'club_original';

    // 1. Lade alle Mitglieder aus /clubs/club_original/members
    const membersSnap = await getDocs(collection(db, 'clubs', clubId, 'members'));
    const members = membersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    console.log(`👥 Gefundene Mitglieder in ${clubId}: ${members.length}`);

    // 2. Korrigiere bestehende Monatsbeitrags-Ledger-Einträge (März bis August 2026),
    //    deren `date` wegen des 22:05-UTC-Bugs auf dem 30./31. lag, auf den 01.MM.2026!
    console.log('\n🔧 Prüfe & korrigiere Datumsstempel bestehender Monatsbeiträge auf den 01. des Monats...');
    const clubLedgerSnap = await getDocs(
        query(collection(db, 'clubs', clubId, 'ledger_entries'), where('type', '==', 'contribution'))
    );

    let fixedDatesCount = 0;
    for (const lDoc of clubLedgerSnap.docs) {
        const data = lDoc.data();
        const desc = data.description || '';
        const match = desc.match(/Monatsbeitrag\s+([A-Za-zäöüÄÖÜ]+)\s+(\d{4})/);
        if (!match) continue;

        const mName = match[1];
        const yr = parseInt(match[2], 10);
        const mIdx = MONTH_NAMES.indexOf(mName);
        if (mIdx === -1) continue;

        const targetIso = getFirstOfMonthIso(yr, mIdx);
        const targetPrefix = `${yr}-${String(mIdx + 1).padStart(2, '0')}-01`;

        if (!String(data.date || '').startsWith(targetPrefix)) {
            const targetTs = Timestamp.fromDate(new Date(targetIso));
            await updateDoc(doc(db, 'clubs', clubId, 'ledger_entries', lDoc.id), {
                date: targetIso,
                createdAt: targetTs
            });
            await updateDoc(doc(db, 'ledger_entries', lDoc.id), {
                date: targetIso,
                createdAt: targetTs
            }).catch(() => {});
            fixedDatesCount++;
        }
    }
    console.log(`✅ ${fixedDatesCount} bestehende Monatsbeitrags-Buchungen exakt auf den 01. des jeweiligen Monats normiert.`);

    // 3. Buche fehlende Monate September (8), Oktober (9) und November (10) 2026 nach
    const TARGET_MONTHS = [8, 9, 10]; // 8 = September, 9 = Oktober, 10 = November
    const YEAR = 2026;

    let createdCount = 0;
    let skippedCount = 0;

    console.log('\n📥 Buche fehlende Monatsbeiträge für September, Oktober und November 2026 nach...');

    for (const monthIdx of TARGET_MONTHS) {
        const monthName = MONTH_NAMES[monthIdx];
        const firstIso = getFirstOfMonthIso(YEAR, monthIdx);
        const firstTs = Timestamp.fromDate(new Date(firstIso));
        const desc = `Monatsbeitrag ${monthName} ${YEAR}`;

        for (const member of members) {
            // Prüfe ob Beitrag in `contributions` oder `ledger_entries` bereits existiert
            const existingContribSnap = await getDocs(
                query(
                    collection(db, 'clubs', clubId, 'contributions'),
                    where('userId', '==', member.id),
                    where('year', '==', YEAR),
                    where('month', '==', monthIdx)
                )
            );

            const existingLedgerSnap = await getDocs(
                query(
                    collection(db, 'clubs', clubId, 'ledger_entries'),
                    where('userId', '==', member.id),
                    where('description', '==', desc)
                )
            );

            if (!existingContribSnap.empty && !existingLedgerSnap.empty) {
                skippedCount++;
                continue;
            }

            const compositeContribId = existingContribSnap.empty
                ? `${member.id}_${YEAR}_${monthIdx}`
                : existingContribSnap.docs[0].id;

            const contribPayload = {
                id: compositeContribId,
                userId: member.id,
                month: monthIdx,
                year: YEAR,
                isPaid: true,
                paidViaReconciliation: true,
                reconciledAt: firstTs
            };

            // Schreibe contribution (Club + Root)
            await setDoc(doc(db, 'clubs', clubId, 'contributions', compositeContribId), contribPayload);
            await setDoc(doc(db, 'contributions', compositeContribId), contribPayload);

            if (existingLedgerSnap.empty) {
                const ledgerId = `contrib_${YEAR}_${String(monthIdx + 1).padStart(2, '0')}_${member.id.slice(0, 8)}`;
                const ledgerPayload = {
                    id: ledgerId,
                    userId: member.id,
                    amount: -15,
                    type: 'contribution',
                    description: desc,
                    date: firstIso,
                    createdAt: firstTs,
                    linkedDocId: compositeContribId
                };

                await setDoc(doc(db, 'clubs', clubId, 'ledger_entries', ledgerId), ledgerPayload);
                await setDoc(doc(db, 'ledger_entries', ledgerId), ledgerPayload);
                createdCount++;
                console.log(`   ✓ Verbucht: ${desc} (-15.00 €) für ${member.name.padEnd(20)} | Datum: ${firstIso}`);
            }
        }
    }

    console.log(`\n🎉 Fertig: ${createdCount} Monatsbeiträge neu verbucht (${skippedCount} bereits vorhanden).`);
    console.log('================================================================');
    process.exit(0);
}

runContributionsFixAndBackfill().catch(err => {
    console.error('❌ Fehler:', err);
    process.exit(1);
});
