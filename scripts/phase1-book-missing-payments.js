/**
 * PHASE 1: GEZIELTES EINBUCHEN DER FEHLENDEN OKTOBER-ZAHLUNGEN & UID-CURSOR INITIALISIERUNG
 * =========================================================================================
 * Verbucht die 4 im isolierten IMAP-Diagnose-Run identifizierten PayPal-Einzahlungen
 * vom 16.10.2026 und 19.10.2026 exakt mit ihrem historischen E-Mail-Zeitstempel
 * und initialisiert das UID-Cursor-Tracking (`config/imap_sync` -> lastProcessedUid: 73).
 *
 * WICHTIG: Idempotent über `paypalTxId` (keine Duplikate möglich).
 */

const { initializeApp } = require('firebase/app');
const {
    getFirestore,
    collection,
    query,
    where,
    getDocs,
    doc,
    setDoc,
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

const MISSING_OCTOBER_PAYMENTS = [
    {
        imapUid: 67,
        paypalTxId: '8HN11742H5784325E',
        dateIso: '2026-10-16T17:52:39.000Z',
        userId: 'KavG97XlPYdmNwAvWkzZCgUUuw52', // Con der Fußballheld (Constantin Drüppel)
        senderName: 'Constantin Drüppel',
        amount: 15.00,
        type: 'paypal_deposit',
        description: 'PayPal Einzahlung von Constantin Drüppel'
    },
    {
        imapUid: 68,
        paypalTxId: '1N939933F1897963B',
        dateIso: '2026-10-16T17:54:41.000Z',
        userId: '5fGd0gq8ruPnhnjTTBIe5VuFSLO2', // Ostblocklatino (Pascal Osyra)
        senderName: 'Pascal Osyra',
        amount: 40.00,
        type: 'paypal_deposit',
        description: 'PayPal Einzahlung von Pascal Osyra'
    },
    {
        imapUid: 69,
        paypalTxId: '7AW39731HK173341G',
        dateIso: '2026-10-16T17:55:56.000Z',
        userId: 'F0uGnNYHd4SLDXTGo4bF3coHVN03', // Fabian (Fabian Wittling)
        senderName: 'Fabian Wittling',
        amount: 30.00,
        type: 'paypal_deposit',
        description: 'PayPal Einzahlung von Fabian Wittling'
    },
    {
        imapUid: 70,
        paypalTxId: '6R865912M3487774E',
        dateIso: '2026-10-19T13:26:18.000Z',
        userId: 'KavG97XlPYdmNwAvWkzZCgUUuw52', // Con der Fußballheld (Constantin Drüppel)
        senderName: 'Constantin Drüppel',
        amount: 21.00,
        type: 'paypal_deposit',
        description: 'PayPal Einzahlung von Constantin Drüppel'
    }
];

async function bookMissingPayments() {
    console.log('================================================================');
    console.log('💳 PHASE 1: GEZIELTE NACHBUCHUNG DER OKTOBER-EINZAHLUNGEN');
    console.log('================================================================\n');

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    let bookedCount = 0;
    let skippedCount = 0;

    for (const payment of MISSING_OCTOBER_PAYMENTS) {
        // Idempotenz-Prüfung anhand paypalTxId
        const existingQ = query(
            collection(db, 'ledger_entries'),
            where('paypalTxId', '==', payment.paypalTxId)
        );
        const existingSnap = await getDocs(existingQ);

        if (!existingSnap.empty) {
            console.log(`⏭️  Überspringe [UID ${payment.imapUid}] TxID ${payment.paypalTxId} (${payment.amount.toFixed(2)} € von ${payment.senderName}) — bereits im Ledger vorhanden (Doc: ${existingSnap.docs[0].id}).`);
            skippedCount++;
            continue;
        }

        const newDocRef = doc(collection(db, 'ledger_entries'));
        const historicalDate = new Date(payment.dateIso);

        const entryData = {
            id: newDocRef.id,
            userId: payment.userId,
            amount: payment.amount,
            type: payment.type,
            description: payment.description,
            date: payment.dateIso,
            createdAt: Timestamp.fromDate(historicalDate),
            paypalTxId: payment.paypalTxId
        };

        await setDoc(newDocRef, entryData);
        bookedCount++;
        console.log(`✅ Verbucht [UID ${payment.imapUid}]: +${payment.amount.toFixed(2)} € für ${payment.senderName} (${payment.userId}) | Datum: ${payment.dateIso} | TxID: ${payment.paypalTxId} | DocID: ${newDocRef.id}`);
    }

    // Setze den persistenten UID-Cursor in `config/imap_sync` auf UID 73 (aktueller Stand der INBOX)
    const syncRef = doc(db, 'config', 'imap_sync');
    await setDoc(syncRef, {
        lastProcessedUid: 73,
        lastSyncAt: Timestamp.now(),
        updatedBy: 'phase1-sanitization'
    }, { merge: true });

    console.log(`\n📌 UID-Cursor in config/imap_sync erfolgreich auf lastProcessedUid = 73 gesetzt.`);
    console.log(`🎉 Ergebnis: ${bookedCount} Zahlungen neu verbucht, ${skippedCount} übersprungen.`);
    console.log('================================================================');
    process.exit(0);
}

bookMissingPayments().catch(err => {
    console.error('❌ Fehler beim Nachbuchen:', err);
    process.exit(1);
});
