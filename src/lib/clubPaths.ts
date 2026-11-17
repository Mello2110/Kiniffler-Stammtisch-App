/**
 * MULTI-TENANT FIRESTORE PATH HELPER
 * ==================================
 * Kapselt den Zugriff auf Club-isolierte Collections und Dokumente
 * (`/clubs/{clubId}/{collectionName}`), damit kein Modul versehentlich
 * auf fremde Mandanten oder ungefilterte Pfade zugreift.
 */

import { collection, doc, CollectionReference, DocumentReference } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const DEFAULT_CLUB_ID = "club_original";

/**
 * Liefert eine typsichere CollectionReference innerhalb eines Clubs:
 * `/clubs/{clubId}/{collectionName}` (inkl. optionaler weiterer Pfadsegmente).
 */
export function getClubCollection<T = any>(
    clubId: string = DEFAULT_CLUB_ID,
    collectionName: string,
    ...pathSegments: string[]
): CollectionReference<T> {
    const effectiveClubId = clubId || DEFAULT_CLUB_ID;
    return collection(db, "clubs", effectiveClubId, collectionName, ...pathSegments) as CollectionReference<T>;
}

/**
 * Liefert eine typsichere DocumentReference innerhalb eines Clubs:
 * `/clubs/{clubId}/{collectionName}/{docId}` (inkl. optionaler weiterer Pfadsegmente).
 */
export function getClubDoc<T = any>(
    clubId: string = DEFAULT_CLUB_ID,
    collectionName: string,
    docId: string,
    ...pathSegments: string[]
): DocumentReference<T> {
    const effectiveClubId = clubId || DEFAULT_CLUB_ID;
    return doc(db, "clubs", effectiveClubId, collectionName, docId, ...pathSegments) as DocumentReference<T>;
}
