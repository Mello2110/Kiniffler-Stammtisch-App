/**
 * SAISON-PUNKTE-LOGIK (je Disziplin getrennt, per Hausregeln konfigurierbar)
 * ===========================================================================
 * Rückwärtskompatibilität: Alle bisherigen `points`-Dokumente (ID `${uid}_${year}_${month}`,
 * ohne `gameType`) gehören zur Disziplin "kniffel". Schocken/Kegeln bekommen eigene Dokumente
 * (`${uid}_${year}_${month}_${gameType}`), sodass die Kniffel-Saison nie vermischt wird.
 */

import type { GameDisciplineId, PointEntry } from "@/types";

export type PlacementMode = "dynamic_participants" | "fixed_top3";

export function pointDocId(userId: string, year: number, month: number, gameType: GameDisciplineId = "kniffel"): string {
    const base = `${userId}_${year}_${month}`;
    return gameType === "kniffel" ? base : `${base}_${gameType}`;
}

export function pointEntryGameType(entry: Pick<PointEntry, "gameType">): GameDisciplineId {
    return entry.gameType || "kniffel";
}

export function matchesDiscipline(entry: Pick<PointEntry, "gameType">, game: GameDisciplineId): boolean {
    return pointEntryGameType(entry) === game;
}

/**
 * Platzierungspunkte.
 * - dynamic_participants (Stammtisch-Standard): Platz 1 = N Punkte, ..., letzter = 1 Punkt
 * - fixed_top3: Platz 1 = 3, Platz 2 = 2, Platz 3 = 1, sonst 0
 * `rank` ist der (Gleichstand-)Rang ab 1, `participants` die Anzahl gewerteter Spieler.
 */
export function placementPoints(rank: number, participants: number, mode: PlacementMode = "dynamic_participants"): number {
    if (mode === "fixed_top3") {
        return Math.max(0, 4 - rank);
    }
    return Math.max(0, participants - rank + 1);
}

/** Vergibt Ränge mit Gleichstand (1,1,3,...). Liste muss absteigend nach `value` sortiert sein. */
export function assignRanks<T extends { value: number }>(sortedDesc: T[]): (T & { rank: number })[] {
    const out: (T & { rank: number })[] = [];
    let i = 0;
    while (i < sortedDesc.length) {
        let ties = 1;
        while (i + ties < sortedDesc.length && sortedDesc[i + ties].value === sortedDesc[i].value) ties++;
        for (let k = 0; k < ties; k++) out.push({ ...sortedDesc[i + k], rank: i + 1 });
        i += ties;
    }
    return out;
}
