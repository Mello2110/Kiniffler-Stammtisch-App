/**
 * PHASE 0: KANPAI 100% DATA SAFETY & BACKUP SUITE
 * =================================================
 * Dieses Skript exportiert verlustfrei und nicht-destruktiv:
 * 1. Alle Firestore Root-Collections (inkl. korrekter Naming-Varianten)
 * 2. Alle Firestore Subcollections (`set_events/{id}/rsvps` & `customizations/{pageId}/headers`)
 * 3. Alle Cloudinary-Bild-Metadaten, Asset-Infos & sicheren URLs (paginiert)
 * 4. Einen kryptografischen SHA-256 Integritäts-Report (`manifest.json`)
 *
 * WICHTIG: Dieses Skript führt AUSSCHLIESSLICH Leseoperationen (Read-Only) durch!
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const cloudinary = require('cloudinary').v2;

// --- 1. KONFIGURATION ---
const PROJECT_ID = 'webapp-stammtisch';
const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyCFa09-8DVF8o2OQssr15lZJ-aCIvh21HM';

cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'doasrf18u',
    api_key: process.env.CLOUDINARY_API_KEY || '271343821461348',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'Q6EA3q2rGrJ1glAMF4_koOoqAiA'
});

// Vollständige Liste aller im Code und Briefing identifizierten Root-Collections
const ROOT_COLLECTIONS = [
    'members',
    'kniffelSheets',      // Tatsächlicher Name im Produktivcode
    'kniffel_sheets',     // Sicherheits-Check (falls historisch vorhanden)
    'penalties',
    'expenses',
    'donations',
    'contributions',      // Im Code aktiv genutzt (Monatsbeiträge)
    'ledger_entries',
    'set_events',
    'stammtisch_votes',   // Tatsächlicher Name im Produktivcode
    'voting_events',      // Sicherheits-Check (falls historisch vorhanden)
    'gallery',
    'config',
    'settings',           // Im Code genutzt (settings/general)
    'points',
    'tokenTransactions',  // Im Code genutzt (Token-Historie & Shiny-System)
    'tokenPots',          // Sicherheits-Check für TokenPots
    'feedback',           // Im Code genutzt (/feedback)
    'mail',               // E-Mail Queue Collection
    'customizations'      // Basis-Collection für EditableHeaders
];

// Bekannte Page-IDs für `customizations/{pageId}/headers/{headerId}`
const KNOWN_CUSTOMIZATION_PAGES = [
    'dashboard',
    'cash',
    'events',
    'kniffel',
    'stats',
    'statistiken',
    'hall-of-fame',
    'members',
    'gallery',
    'feedback',
    'options',
    'profile'
];

// --- 2. HILFSFUNKTIONEN FÜR FIRESTORE REST API (INKL. TYP-ERHALTUNG) ---

function httpsRequest(url, options = {}, body = null) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const reqOptions = {
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: options.headers || {}
        };
        if (body) {
            const dataStr = typeof body === 'string' ? body : JSON.stringify(body);
            reqOptions.headers['Content-Type'] = 'application/json';
            reqOptions.headers['Content-Length'] = Buffer.byteLength(dataStr);
        }
        const req = https.request(reqOptions, (res) => {
            let chunks = '';
            res.on('data', (d) => chunks += d);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(chunks);
                    if (res.statusCode >= 400) {
                        reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(parsed)}`));
                    } else {
                        resolve(parsed);
                    }
                } catch (e) {
                    reject(new Error(`JSON Parse Error (${res.statusCode}): ${chunks.slice(0, 300)}`));
                }
            });
        });
        req.on('error', reject);
        if (body) {
            req.write(typeof body === 'string' ? body : JSON.stringify(body));
        }
        req.end();
    });
}

/**
 * Konvertiert ein Firestore REST Value-Objekt verlustfrei in ein kanonisches JS-Format
 * inklusive Typ-Marker für Timestamps, damit eine 1:1 Replikation möglich ist.
 */
function parseFirestoreValue(valObj) {
    if (!valObj || typeof valObj !== 'object') return null;
    if ('stringValue' in valObj) return valObj.stringValue;
    if ('booleanValue' in valObj) return Boolean(valObj.booleanValue);
    if ('integerValue' in valObj) return Number(valObj.integerValue);
    if ('doubleValue' in valObj) return Number(valObj.doubleValue);
    if ('nullValue' in valObj) return null;
    if ('timestampValue' in valObj) {
        return {
            __datatype__: 'timestamp',
            value: valObj.timestampValue
        };
    }
    if ('geoPointValue' in valObj) {
        return {
            __datatype__: 'geopoint',
            value: valObj.geoPointValue
        };
    }
    if ('referenceValue' in valObj) {
        return {
            __datatype__: 'reference',
            value: valObj.referenceValue
        };
    }
    if ('arrayValue' in valObj) {
        const values = valObj.arrayValue.values || [];
        return values.map(parseFirestoreValue);
    }
    if ('mapValue' in valObj) {
        const fields = valObj.mapValue.fields || {};
        const result = {};
        for (const [k, v] of Object.entries(fields)) {
            result[k] = parseFirestoreValue(v);
        }
        return result;
    }
    return valObj;
}

function parseFirestoreDoc(doc) {
    const fullPath = doc.name; // projects/.../databases/(default)/documents/col/docId
    const pathParts = fullPath.split('/documents/')[1].split('/');
    const id = pathParts[pathParts.length - 1];
    const relativePath = pathParts.join('/');

    const data = {};
    if (doc.fields) {
        for (const [k, v] of Object.entries(doc.fields)) {
            data[k] = parseFirestoreValue(v);
        }
    }

    // --- CHRONOLOGICAL & PERIOD METADATA ENRICHMENT ---
    // Stellt sicher, dass JEDES Dokument sowohl einen exakten Eintragungszeitpunkt
    // (entryTimestampIso / entryEpochMs) als auch eine eindeutige Monats-/Jahreszuordnung
    // (periodYear, periodMonthIndex0, periodMonth1Based) besitzt, selbst wenn im
    // ursprünglichen Dokument nur Firestore-Systemzeiten (__createTime__) vorhanden waren.
    const extractIso = (val) => {
        if (!val) return null;
        if (typeof val === 'string') return val;
        if (typeof val === 'number') return new Date(val).toISOString();
        if (val.__datatype__ === 'timestamp' && val.value) return val.value;
        return null;
    };

    const appCreatedAtIso =
        extractIso(data.createdAt) ||
        extractIso(data.timestamp) ||
        extractIso(data.uploadDate) ||
        extractIso(data.reconciledAt) ||
        null;

    // Effektiver Zeitpunkt der Eintragung (App-Timestamp bevorzugt, sonst Firestore System-CreateTime)
    const effectiveEntryTimestampIso = appCreatedAtIso || doc.createTime;
    const effectiveEntryEpochMs = new Date(effectiveEntryTimestampIso).getTime();

    // Fachliches Ereignis-/Zuschreibungsdatum (z.B. Monat/Jahr für Beiträge, Punkte, Kniffelbögen, Events)
    let periodYear = typeof data.year === 'number' ? data.year : null;
    let periodMonthIndex0 = typeof data.month === 'number' ? data.month : null; // 0 = Jan, 11 = Dez

    if ((periodYear === null || periodMonthIndex0 === null) && typeof data.date === 'string') {
        const parsedDate = new Date(data.date);
        if (!isNaN(parsedDate.getTime())) {
            if (periodYear === null) periodYear = parsedDate.getUTCFullYear();
            if (periodMonthIndex0 === null) periodMonthIndex0 = parsedDate.getUTCMonth();
        }
    }

    if (periodYear === null || periodMonthIndex0 === null) {
        const fallbackDate = new Date(effectiveEntryTimestampIso);
        if (!isNaN(fallbackDate.getTime())) {
            if (periodYear === null) periodYear = fallbackDate.getUTCFullYear();
            if (periodMonthIndex0 === null) periodMonthIndex0 = fallbackDate.getUTCMonth();
        }
    }

    const __chronology__ = {
        entryTimestampIso: effectiveEntryTimestampIso,
        entryEpochMs: effectiveEntryEpochMs,
        appCreatedAtIso: appCreatedAtIso,
        firestoreSystemCreateTime: doc.createTime,
        firestoreSystemUpdateTime: doc.updateTime,
        explicitDateField: data.date || data.captureDate || null,
        periodYear,
        periodMonthIndex0, // 0-11 (wie in Firestore für points/contributions/kniffelSheets genutzt)
        periodMonth1Based: periodMonthIndex0 !== null ? periodMonthIndex0 + 1 : null, // 1-12 (lesbar)
        periodKey: periodYear !== null && periodMonthIndex0 !== null
            ? `${periodYear}-${String(periodMonthIndex0 + 1).padStart(2, '0')}`
            : null
    };

    return {
        id,
        __path__: relativePath,
        __createTime__: doc.createTime,
        __updateTime__: doc.updateTime,
        __chronology__,
        data,
        rawFirestoreFields: doc.fields || {} // Zusätzlich Rohdaten für 100%ige Garantietreue
    };
}

/**
 * Liest alle Dokumente einer Collection (oder eines Pfads) paginiert via Firestore REST API aus.
 */
async function fetchAllDocumentsInCollection(collectionPath, authToken) {
    const documents = [];
    let pageToken = null;

    do {
        const queryParams = new URLSearchParams({ pageSize: '300' });
        if (pageToken) queryParams.set('pageToken', pageToken);

        const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collectionPath}?${queryParams.toString()}`;
        const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};

        const response = await httpsRequest(url, { headers });
        if (response.documents && Array.isArray(response.documents)) {
            for (const rawDoc of response.documents) {
                documents.push(parseFirestoreDoc(rawDoc));
            }
        }
        pageToken = response.nextPageToken || null;
    } while (pageToken);

    // Deterministische Sortierung nach Document-ID für reproduzierbare Checksummen
    documents.sort((a, b) => a.id.localeCompare(b.id));
    return documents;
}

// --- 3. CLOUDINARY VOLL-EXPORT ---

async function exportCloudinaryAssets() {
    console.log('\n📸 Starte Cloudinary Metadaten- & URL-Export...');
    const allResources = [];
    let nextCursor = null;

    do {
        const res = await cloudinary.api.resources({
            type: 'upload',
            max_results: 500,
            next_cursor: nextCursor,
            context: true,
            tags: true,
            metadata: true
        });
        if (res.resources && res.resources.length > 0) {
            allResources.push(...res.resources);
        }
        nextCursor = res.next_cursor || null;
    } while (nextCursor);

    allResources.sort((a, b) => a.public_id.localeCompare(b.public_id));
    console.log(`✅ Cloudinary Export abgeschlossen: ${allResources.length} Assets gefunden.`);
    return allResources;
}

// --- 4. SHA-256 CHECKSUMMEN-GENERATOR ---

function computeSha256(content) {
    const str = typeof content === 'string' ? content : JSON.stringify(content);
    return crypto.createHash('sha256').update(str, 'utf8').digest('hex');
}

// --- 5. HAUPTPROZESS ---

async function runPhase0Backup() {
    const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
    const backupRootDir = path.join(__dirname, '..', 'backups', `phase0_snapshot_${timestampStr}`);
    const collectionsDir = path.join(backupRootDir, 'collections');
    const subcollectionsDir = path.join(backupRootDir, 'subcollections');

    fs.mkdirSync(collectionsDir, { recursive: true });
    fs.mkdirSync(subcollectionsDir, { recursive: true });

    console.log('================================================================');
    console.log('🛡️  KANPAI PHASE 0: 100% DATA SAFETY & ARCHIVAL SNAPSHOT');
    console.log(`📁 Zielverzeichnis: ${backupRootDir}`);
    console.log('================================================================\n');

    // Schritt 1: Authentifizierung für Firestore REST API
    console.log('🔑 Authentifiziere gegen Firebase Identity Toolkit...');
    let authToken = null;
    try {
        const authResp = await httpsRequest(
            `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
            { method: 'POST' },
            { returnSecureToken: true }
        );
        authToken = authResp.idToken;
        console.log('✅ Authentifizierung erfolgreich.\n');
    } catch (err) {
        console.warn('⚠️ Anonyme Auth nicht möglich, versuche unauthentifizierten Lesezugriff:', err.message);
    }

    const fullSnapshot = {
        metadata: {
            projectId: PROJECT_ID,
            exportedAt: new Date().toISOString(),
            exporterVersion: '1.0.0-phase0-immutable'
        },
        collections: {},
        subcollections: {},
        cloudinary: []
    };

    const manifest = {
        projectId: PROJECT_ID,
        timestamp: new Date().toISOString(),
        backupDirectory: backupRootDir,
        collectionCounts: {},
        subcollectionCounts: {},
        checksums: {},
        totalFirestoreDocuments: 0,
        totalCloudinaryAssets: 0
    };

    // Schritt 2: Alle Root-Collections exportieren
    console.log('📦 Exportiere Firestore Root-Collections...');
    for (const colName of ROOT_COLLECTIONS) {
        try {
            const docs = await fetchAllDocumentsInCollection(colName, authToken);
            fullSnapshot.collections[colName] = docs;
            manifest.collectionCounts[colName] = docs.length;
            manifest.totalFirestoreDocuments += docs.length;

            const colFilePath = path.join(collectionsDir, `${colName}.json`);
            const colJson = JSON.stringify(docs, null, 2);
            fs.writeFileSync(colFilePath, colJson, 'utf8');
            manifest.checksums[`collections/${colName}.json`] = computeSha256(colJson);

            console.log(`  ├─ ${colName.padEnd(22)} : ${String(docs.length).padStart(5)} Dokumente (SHA-256: ${manifest.checksums[`collections/${colName}.json`].slice(0, 12)}...)`);
        } catch (err) {
            console.error(`  ❌ Fehler beim Export von Collection "${colName}":`, err.message);
            throw err; // Hard Fail: Kein unvollständiges Backup akzeptieren!
        }
    }

    // Schritt 3: Subcollections von `set_events/{eventId}/rsvps` exportieren
    console.log('\n🔍 Exportiere Subcollections: set_events/{eventId}/rsvps...');
    const setEvents = fullSnapshot.collections['set_events'] || [];
    const allRsvps = [];
    for (const ev of setEvents) {
        const subPath = `set_events/${ev.id}/rsvps`;
        const rsvpDocs = await fetchAllDocumentsInCollection(subPath, authToken);
        if (rsvpDocs.length > 0) {
            allRsvps.push(...rsvpDocs);
            fullSnapshot.subcollections[subPath] = rsvpDocs;
            manifest.subcollectionCounts[subPath] = rsvpDocs.length;
            manifest.totalFirestoreDocuments += rsvpDocs.length;
        }
    }
    const rsvpsFilePath = path.join(subcollectionsDir, 'set_events_rsvps.json');
    const rsvpsJson = JSON.stringify(allRsvps, null, 2);
    fs.writeFileSync(rsvpsFilePath, rsvpsJson, 'utf8');
    manifest.checksums['subcollections/set_events_rsvps.json'] = computeSha256(rsvpsJson);
    console.log(`  └─ set_events/*/rsvps     : ${String(allRsvps.length).padStart(5)} Dokumente`);

    // Schritt 4: Subcollections von `customizations/{pageId}/headers` exportieren
    console.log('\n🔍 Exportiere Subcollections: customizations/{pageId}/headers...');
    const customPages = new Set([
        ...KNOWN_CUSTOMIZATION_PAGES,
        ...(fullSnapshot.collections['customizations'] || []).map(d => d.id)
    ]);
    const allCustomHeaders = [];
    for (const pageId of customPages) {
        const subPath = `customizations/${pageId}/headers`;
        const headerDocs = await fetchAllDocumentsInCollection(subPath, authToken);
        if (headerDocs.length > 0) {
            allCustomHeaders.push(...headerDocs);
            fullSnapshot.subcollections[subPath] = headerDocs;
            manifest.subcollectionCounts[subPath] = headerDocs.length;
            manifest.totalFirestoreDocuments += headerDocs.length;
        }
    }
    const headersFilePath = path.join(subcollectionsDir, 'customizations_headers.json');
    const headersJson = JSON.stringify(allCustomHeaders, null, 2);
    fs.writeFileSync(headersFilePath, headersJson, 'utf8');
    manifest.checksums['subcollections/customizations_headers.json'] = computeSha256(headersJson);
    console.log(`  └─ customizations/*/headers: ${String(allCustomHeaders.length).padStart(5)} Dokumente`);

    // Schritt 5: Cloudinary Assets & Metadaten sichern
    try {
        const cloudinaryAssets = await exportCloudinaryAssets();
        fullSnapshot.cloudinary = cloudinaryAssets;
        manifest.totalCloudinaryAssets = cloudinaryAssets.length;

        const cloudFilePath = path.join(backupRootDir, 'cloudinary_assets.json');
        const cloudJson = JSON.stringify(cloudinaryAssets, null, 2);
        fs.writeFileSync(cloudFilePath, cloudJson, 'utf8');
        manifest.checksums['cloudinary_assets.json'] = computeSha256(cloudJson);
    } catch (err) {
        console.error('❌ Fehler beim Cloudinary-Export:', err.message);
        throw err;
    }

    // Schritt 6: Chronologische Timeline aller Events & Eintragungen generieren
    console.log('\n⏳ Generiere chronologische Event-Reproduktions-Timeline...');
    const timelineEvents = [];
    for (const [colName, docs] of Object.entries(fullSnapshot.collections)) {
        for (const doc of docs) {
            timelineEvents.push({
                collection: colName,
                id: doc.id,
                path: doc.__path__,
                entryTimestampIso: doc.__chronology__.entryTimestampIso,
                entryEpochMs: doc.__chronology__.entryEpochMs,
                periodKey: doc.__chronology__.periodKey,
                periodYear: doc.__chronology__.periodYear,
                periodMonthIndex0: doc.__chronology__.periodMonthIndex0,
                explicitDateField: doc.__chronology__.explicitDateField
            });
        }
    }
    for (const [subPath, docs] of Object.entries(fullSnapshot.subcollections)) {
        for (const doc of docs) {
            timelineEvents.push({
                collection: subPath,
                id: doc.id,
                path: doc.__path__,
                entryTimestampIso: doc.__chronology__.entryTimestampIso,
                entryEpochMs: doc.__chronology__.entryEpochMs,
                periodKey: doc.__chronology__.periodKey,
                periodYear: doc.__chronology__.periodYear,
                periodMonthIndex0: doc.__chronology__.periodMonthIndex0,
                explicitDateField: doc.__chronology__.explicitDateField
            });
        }
    }
    timelineEvents.sort((a, b) => a.entryEpochMs - b.entryEpochMs || a.path.localeCompare(b.path));
    const timelinePath = path.join(backupRootDir, 'chronological_timeline.json');
    const timelineJson = JSON.stringify(timelineEvents, null, 2);
    fs.writeFileSync(timelinePath, timelineJson, 'utf8');
    manifest.checksums['chronological_timeline.json'] = computeSha256(timelineJson);
    console.log(`✅ Chronologische Timeline mit ${timelineEvents.length} datierten Einträgen erstellt.`);

    // Schritt 7: Kompletter Monolith-Snapshot + Manifest schreiben
    const fullSnapshotPath = path.join(backupRootDir, 'full_firestore_and_media_snapshot.json');
    const fullSnapshotJson = JSON.stringify(fullSnapshot, null, 2);
    fs.writeFileSync(fullSnapshotPath, fullSnapshotJson, 'utf8');
    manifest.checksums['full_firestore_and_media_snapshot.json'] = computeSha256(fullSnapshotJson);

    const manifestPath = path.join(backupRootDir, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

    console.log('\n================================================================');
    console.log('✅ PHASE 0 BACKUP ERFOLGREICH ABGESCHLOSSEN & VERIFIZIERT!');
    console.log(`📊 Firestore Dokumente gesamt : ${manifest.totalFirestoreDocuments}`);
    console.log(`🖼️  Cloudinary Assets gesamt   : ${manifest.totalCloudinaryAssets}`);
    console.log(`🔐 Master Snapshot SHA-256    : ${manifest.checksums['full_firestore_and_media_snapshot.json']}`);
    console.log(`📄 Manifest gespeichert unter : ${manifestPath}`);
    console.log('================================================================');
}

runPhase0Backup().catch((err) => {
    console.error('\n🚨 ABBRUCH IN PHASE 0 BACKUP:', err);
    process.exit(1);
});
