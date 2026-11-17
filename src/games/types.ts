/**
 * PHASE 3: UNIVERSAL GAME PLUGIN ARCHITECTURE
 * ===========================================
 * Definiert das standardisierte Interface für alle Spiel-Disziplinen
 * (Kniffeln, Schocken, Kegeln und zukünftige Erweiterungen) auf der KANPAI Plattform.
 */

import React from "react";
import type { ClubRulesetConfig, GameDisciplineId, GuestPlayer, Member } from "@/types";

export interface PenaltyProposal {
    userId: string;         // Member ID (bei Gästen: hostMemberId)
    playerName: string;
    isGuest?: boolean;
    guestId?: string;
    amountEur: number;
    reason: string;
}

export interface RankingEntry {
    memberId: string;
    playerName: string;
    isGuest?: boolean;
    rank: number;
    scoreOrMetric: number;
    matrixPoints: number;
    breakdown?: Record<string, number>;
}

export interface GameRulesConfig {
    defaultPenaltyEur: number;
    maxPlayers: number;
    minPlayers: number;
    supportsGuests: boolean;
    customOptions?: Record<string, number | boolean | string>;
}

export interface UniversalGameSession<TState = any> {
    id: string;
    clubId: string;
    gameType: GameDisciplineId;
    title?: string;
    year: number;
    month: number; // 0-11 (wichtig für chronologische Monatszuordnung!)
    dateIso?: string;
    isSubmitted?: boolean;
    createdAt: any;
    memberSnapshot: string[];
    playerOrder: string[];
    guests?: GuestPlayer[];
    // Spielspezifischer Zustand (bei Kniffeln: scores/chanceTimestamps, bei Schocken: Runden/Hälften/Deckel, bei Kegeln: Würfe/Bilder)
    state?: TState;
    // Rückwärtskompatible Top-Level-Felder für KniffelSheet
    scores?: Record<string, any>;
    chanceTimestamps?: Record<string, number>;
}

export interface ScorecardComponentProps<TState = any> {
    session: UniversalGameSession<TState>;
    members: Member[];
    clubId: string;
    isFullscreen?: boolean;
    onAddPenalty?: (proposal: PenaltyProposal) => Promise<void>;
}

export interface GamePlugin<TState = any> {
    id: GameDisciplineId;
    title: string;
    shortTitle: string;
    subtitle: string;
    badgeLabel: string;
    accentColorHex: string;
    RulesConfig: GameRulesConfig;
    createInitialSessionState: (playerIds: string[], guests: GuestPlayer[]) => Partial<UniversalGameSession<TState>>;
    calculatePenalties: (session: UniversalGameSession<TState>, members: Member[], ruleset?: ClubRulesetConfig) => PenaltyProposal[];
    determineRankings: (session: UniversalGameSession<TState>, members: Member[], ruleset?: ClubRulesetConfig) => RankingEntry[];
    ScorecardComponent: React.ComponentType<ScorecardComponentProps<TState>>;
}
