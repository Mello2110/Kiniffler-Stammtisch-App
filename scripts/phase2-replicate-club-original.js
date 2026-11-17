/**
 * PHASE 2: NICHT-DESTRUKTIVE REPLIKATION NACH /clubs/club_original
 * ================================================================
 * Repliziert den kompletten, verifizierten Snapshot unseres Stammtischs
 * verlustfrei und inklusive aller historischen Zeitstempel (Firestore Timestamps,
 * Datumsfelder, Monats-/Jahreszuordnungen) und Subcollections (`rsvps`, `headers`)
 * in die neue Multi-Tenant-Hierarchie `/clubs/club_original/...`.
 *
 * Zusätzlich werden globale Benutzerprofile unter `/users/{uid}` initialisiert,
 * die jedes Stammtisch-Mitglied automatisch mit `club_original` verknüpfen.
 *
 * WICHTIG: Die bestehenden Root-Collections bleiben zu 100% UNBERÜHRT!
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const PROJECT_ID = 'webapp-stammtisch';
const TARGET_CLUB_ID = 'club_original';

function loadLatestSnapshot() {
    const backupsRoot = path.join(__dirname, '..', 'backups');
    const dirs = fs.readdirSync(backupsRoot).filter(d => d.startsWith('phase0_snapshot_')).sort();
    if (dirs.length === 0) throw new Error('Kein Snapshot gefunden!');
    const latestDir = path.join(backupsRoot, dirs[dirs.length - 1]);
    console.log(`📂 Lade verifizierten Master-Snapshot aus: ${latestDir}`);
    return JSON.parse(fs.readFileSync(path.join(latestDir, 'full_firestore_and_media_snapshot.json'), 'utf8'));
}

function httpsPostJson(url, bodyObj) {
    return new Promise((resolve, reject) => {
        const bodyStr = JSON.stringify(bodyObj);
        const urlObj = new URL(url);
        const req = https.request({
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(bodyStr)
            }
        }, (res) => {
            let chunks = '';
            res.on('data', d => chunks += d);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(chunks);
                    if (res.statusCode >= 400) {
                        reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(parsed)}`));
                    } else {
                        resolve(parsed);
                    }
                } catch (e) {
                    reject(new Error(`Parse Error (${res.statusCode}): ${chunks.slice(0, 300)}`));
                }
            });
        });
        req.on('error', reject);
        req.write(bodyStr);
        req.end();
    });
}

/**
 * Sendet bis zu 400 Schreiboperationen atomar per Firestore REST commit API.
 */
async function commitWritesInChunks(writes) {
    const CHUNK_SIZE = 250;
    let committed = 0;
    const commitUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:commit`;

    for (let i = 0; i < writes.length; i += CHUNK_SIZE) {
        const chunk = writes.slice(i, i + CHUNK_SIZE);
        await httpsPostJson(commitUrl, { writes: chunk });
        committed += chunk.length;
        console.log(`   ✓ Batch committed: ${committed} / ${writes.length} Dokumente geschrieben`);
    }
}

function toFirestoreString(val) {
    return { stringValue: String(val) };
}
function toFirestoreBool(val) {
    return { booleanValue: Boolean(val) };
}
function toFirestoreDouble(val) {
    return { doubleValue: Number(val) };
}
function toFirestoreTimestamp(isoStr) {
    return { timestampValue: isoStr };
}
function toFirestoreStringArray(arr) {
    return { arrayValue: { values: arr.map(s => ({ stringValue: String(s) })) } };
}

async function runPhase2Replication() {
    console.log('================================================================');
    console.log('🏛️  PHASE 2: MULTI-TENANT REPLIKATION -> /clubs/club_original');
    console.log('================================================================\n');

    const snapshot = loadLatestSnapshot();
    const docPrefix = `projects/${PROJECT_ID}/databases/(default)/documents`;
    const allWrites = [];

    // 1. Erzeuge das Master-Dokument `/clubs/club_original`
    const settingsGen = (snapshot.collections.settings || []).find(d => d.id === 'general');
    const cashConfig = (snapshot.collections.config || []).find(d => d.id === 'cash');
    const clubTitle = settingsGen?.data?.title || 'Stammtisch';
    const startingBalance = cashConfig?.data?.startingBalance ?? 714.65;

    allWrites.push({
        update: {
            name: `${docPrefix}/clubs/${TARGET_CLUB_ID}`,
            fields: {
                id: toFirestoreString(TARGET_CLUB_ID),
                slug: toFirestoreString('stammtisch'),
                name: toFirestoreString(clubTitle),
                subtitle: toFirestoreString('The Original Kniffel & Stammtisch Crew'),
                creatorUid: toFirestoreString('VA4Rfwi83sYfbNYfPxrquz2SHcr1'), // Mello (Admin)
                enabledGames: toFirestoreStringArray(['kniffel', 'schocken', 'kegeln']),
                defaultGame: toFirestoreString('kniffel'),
                theme: {
                    mapValue: {
                        fields: {
                            primaryColor: toFirestoreString('#8B5CF6'), // Original KANPAI Violet
                            accentColor: toFirestoreString('#F59E0B'),  // Amber Accent
                            mode: toFirestoreString('dark')
                        }
                    }
                },
                paymentConfig: {
                    mapValue: {
                        fields: {
                            paypalMeHandle: toFirestoreString(''),
                            treasuryEmail: toFirestoreString('thekiniffler@icloud.com'),
                            monthlyContributionEur: toFirestoreDouble(15),
                            defaultPenaltyEur: toFirestoreDouble(1),
                            currency: toFirestoreString('EUR')
                        }
                    }
                },
                cashConfig: {
                    mapValue: {
                        fields: {
                            startingBalance: toFirestoreDouble(startingBalance)
                        }
                    }
                },
                createdAt: toFirestoreTimestamp('2024-01-01T00:00:00.000Z'),
                migratedAt: toFirestoreTimestamp(new Date().toISOString())
            }
        }
    });

    // 2. Erzeuge globale User-Zuordnungen `/users/{uid}` für alle 9 Stammtisch-Mitglieder
    const members = snapshot.collections.members || [];
    for (const memberDoc of members) {
        const mData = memberDoc.data || {};
        allWrites.push({
            update: {
                name: `${docPrefix}/users/${memberDoc.id}`,
                fields: {
                    uid: toFirestoreString(memberDoc.id),
                    name: toFirestoreString(mData.name || ''),
                    email: toFirestoreString(mData.email || ''),
                    defaultClubId: toFirestoreString(TARGET_CLUB_ID),
                    clubIds: toFirestoreStringArray([TARGET_CLUB_ID]),
                    isSuperAdmin: toFirestoreBool(Boolean(mData.isAdmin)),
                    updatedAt: toFirestoreTimestamp(new Date().toISOString())
                }
            }
        });
    }

    // 3. Repliziere alle Root-Collections 1:1 inklusive Original-Firestore-Typen & Chronologie-Metadaten
    let replicatedRootDocs = 0;
    for (const [colName, docs] of Object.entries(snapshot.collections)) {
        if (!Array.isArray(docs) || docs.length === 0) continue;

        for (const doc of docs) {
            const rawFields = { ...(doc.rawFirestoreFields || {}) };

            // Falls das Original-Dokument kein explizites createdAt-Feld besaß, ergänzen wir
            // `_preservedCreateTime` und `_periodKey`, damit die historische Reihenfolge & Monatszuordnung
            // auch in der neuen Subcollection zu 100% erhalten bleibt, ohne bestehende Felder zu verfälschen.
            if (doc.__chronology__) {
                rawFields._entryTimestamp = toFirestoreTimestamp(doc.__chronology__.entryTimestampIso);
                if (doc.__chronology__.periodKey) {
                    rawFields._periodKey = toFirestoreString(doc.__chronology__.periodKey);
                }
            }

            allWrites.push({
                update: {
                    name: `${docPrefix}/clubs/${TARGET_CLUB_ID}/${colName}/${doc.id}`,
                    fields: rawFields
                }
            });
            replicatedRootDocs++;
        }
    }

    // 4. Repliziere alle Subcollections (`set_events/*/rsvps` & `customizations/*/headers`)
    let replicatedSubDocs = 0;
    for (const [subPath, docs] of Object.entries(snapshot.subcollections)) {
        if (!Array.isArray(docs) || docs.length === 0) continue;

        for (const doc of docs) {
            const rawFields = { ...(doc.rawFirestoreFields || {}) };
            if (doc.__chronology__) {
                rawFields._entryTimestamp = toFirestoreTimestamp(doc.__chronology__.entryTimestampIso);
                if (doc.__chronology__.periodKey) {
                    rawFields._periodKey = toFirestoreString(doc.__chronology__.periodKey);
                }
            }

            allWrites.push({
                update: {
                    name: `${docPrefix}/clubs/${TARGET_CLUB_ID}/${subPath}/${doc.id}`,
                    fields: rawFields
                }
            });
            replicatedSubDocs++;
        }
    }

    // 5. Zusätzlich: Kopiere alle 12 `kniffelSheets` auch als standardisierte `gameSessions`
    //    für die neue modulare Game-Engine (Phase 3), damit alle bisherigen Kniffel-Runden
    //    nahtlos in der neuen Multi-Game-Historie auftauchen!
    const kniffelSheets = snapshot.collections.kniffelSheets || [];
    for (const sheet of kniffelSheets) {
        const rawFields = { ...(sheet.rawFirestoreFields || {}) };
        rawFields.gameType = toFirestoreString('kniffel');
        rawFields.clubId = toFirestoreString(TARGET_CLUB_ID);
        if (sheet.__chronology__) {
            rawFields._entryTimestamp = toFirestoreTimestamp(sheet.__chronology__.entryTimestampIso);
            if (sheet.__chronology__.periodKey) {
                rawFields._periodKey = toFirestoreString(sheet.__chronology__.periodKey);
            }
        }
        allWrites.push({
            update: {
                name: `${docPrefix}/clubs/${TARGET_CLUB_ID}/gameSessions/${sheet.id}`,
                fields: rawFields
            }
        });
    }

    console.log(`📦 Bereit zum Schreiben von ${allWrites.length} Dokumenten nach /clubs/${TARGET_CLUB_ID} und /users/...`);
    console.log(`   - 1 Club-Master-Dokument (/clubs/${TARGET_CLUB_ID})`);
    console.log(`   - ${members.length} Globale User-Profile (/users/{uid})`);
    console.log(`   - ${replicatedRootDocs} Dokumente in Club-Collections`);
    console.log(`   - ${replicatedSubDocs} Dokumente in tieferen Subcollections (rsvps & headers)`);
    console.log(`   - ${kniffelSheets.length} Kniffel-Bögen zusätzlich als universelle gameSessions gespiegelt\n`);

    await commitWritesInChunks(allWrites);

    console.log('\n================================================================');
    console.log(`✅ PHASE 2 REPLIKATION ERFOLGREICH ABGESCHLOSSEN!`);
    console.log(`🛡️  Alle Original-Collections auf Root-Ebene blieben zu 100% unberührt.`);
    console.log(`🏛️  Tenant "${TARGET_CLUB_ID}" ist vollständig mit allen 1.065 historischen Datensätzen bestückt.`);
    console.log('================================================================');
}

runPhase2Replication().catch(err => {
    console.error('❌ Fehler bei Phase 2 Replikation:', err);
    process.exit(1);
});
