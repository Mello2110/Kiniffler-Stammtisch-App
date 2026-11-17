"use client";

import React from "react";
import { KniffelScorecard } from "@/components/kniffel/KniffelScorecard";
import type { GamePlugin, PenaltyProposal, RankingEntry, ScorecardComponentProps, UniversalGameSession } from "@/games/types";
import type { GuestPlayer, KniffelScores, KniffelSheet, Member, ScoreValue } from "@/types";

const UPPER_FIELDS: (keyof KniffelScores)[] = ["ones", "twos", "threes", "fours", "fives", "sixes"];
const LOWER_FIELDS: (keyof KniffelScores)[] = ["threeOfAKind", "fourOfAKind", "fullHouse", "smallStraight", "largeStraight", "kniffel", "chance"];

function getNumericValue(val: ScoreValue | undefined): number {
    if (!val || val === "stroke") return 0;
    return val;
}

function calculatePlayerTotal(scores?: KniffelScores): number {
    if (!scores) return 0;
    const upper = UPPER_FIELDS.reduce((s, f) => s + getNumericValue(scores[f]), 0);
    const bonus = upper >= 63 ? 35 : 0;
    const lower = LOWER_FIELDS.reduce((s, f) => s + getNumericValue(scores[f]), 0);
    return upper + bonus + lower;
}

function KniffelPluginScorecardAdapter({ session, members }: ScorecardComponentProps<any>) {
    const sheet: KniffelSheet = {
        id: session.id,
        year: session.year,
        month: session.month,
        isSubmitted: session.isSubmitted,
        createdAt: session.createdAt,
        memberSnapshot: session.memberSnapshot || [],
        playerOrder: session.playerOrder || session.memberSnapshot || [],
        guests: session.guests || [],
        scores: session.scores || session.state?.scores || {},
        chanceTimestamps: session.chanceTimestamps || session.state?.chanceTimestamps || {},
    };
    return <KniffelScorecard sheet={sheet} members={members} />;
}

export const KniffelGamePlugin: GamePlugin = {
    id: "kniffel",
    title: "Kniffeln",
    shortTitle: "Kniffel",
    subtitle: "Der Klassiker mit 5 Würfeln, Bonus-Jagd (63 Punkte), Chance-Duell und Strich-Strafen.",
    badgeLabel: "Würfel-Klassiker",
    accentColorHex: "#854d59",
    RulesConfig: {
        defaultPenaltyEur: 1,
        maxPlayers: 12,
        minPlayers: 2,
        supportsGuests: true,
        customOptions: {
            upperBonusThreshold: 63,
            upperBonusPoints: 35,
            strokePenaltyEur: 1,
        },
    },
    createInitialSessionState: (playerIds: string[], guests: GuestPlayer[]) => {
        const emptyScores: KniffelScores = {
            ones: null,
            twos: null,
            threes: null,
            fours: null,
            fives: null,
            sixes: null,
            threeOfAKind: null,
            fourOfAKind: null,
            fullHouse: null,
            smallStraight: null,
            largeStraight: null,
            kniffel: null,
            chance: null,
        };
        const scores: Record<string, KniffelScores> = {};
        for (const pid of playerIds) {
            scores[pid] = { ...emptyScores };
        }
        return {
            memberSnapshot: playerIds.filter(id => !id.startsWith("guest_")),
            playerOrder: playerIds,
            guests,
            scores,
            state: { scores },
        };
    },
    calculatePenalties: (session: UniversalGameSession, members: Member[]): PenaltyProposal[] => {
        const proposals: PenaltyProposal[] = [];
        const scoresMap: Record<string, KniffelScores> = session.scores || session.state?.scores || {};
        const memberMap = new Map(members.map(m => [m.id, m]));
        const guestMap = new Map((session.guests || []).map(g => [g.id, g]));

        for (const [pid, pScores] of Object.entries(scoresMap)) {
            if (!pScores) continue;
            let strokeCount = 0;
            for (const f of [...UPPER_FIELDS, ...LOWER_FIELDS]) {
                if (pScores[f] === "stroke") strokeCount++;
            }
            if (strokeCount > 0) {
                const m = memberMap.get(pid);
                const g = guestMap.get(pid);
                if (m) {
                    proposals.push({
                        userId: m.id,
                        playerName: m.name,
                        amountEur: strokeCount * 1,
                        reason: `${strokeCount}x Strich (Kniffel)`,
                    });
                } else if (g && g.hostMemberId) {
                    proposals.push({
                        userId: g.hostMemberId,
                        playerName: g.name,
                        isGuest: true,
                        guestId: g.id,
                        amountEur: strokeCount * 1,
                        reason: `${strokeCount}x Strich (${g.name})`,
                    });
                }
            }
        }
        return proposals;
    },
    determineRankings: (session: UniversalGameSession, members: Member[]): RankingEntry[] => {
        const scoresMap: Record<string, KniffelScores> = session.scores || session.state?.scores || {};
        const memberMap = new Map(members.map(m => [m.id, m]));
        const guestMap = new Map((session.guests || []).map(g => [g.id, g]));

        const entries = (session.playerOrder || session.memberSnapshot || []).map(pid => {
            const m = memberMap.get(pid);
            const g = guestMap.get(pid);
            const total = calculatePlayerTotal(scoresMap[pid]);
            return {
                memberId: pid,
                playerName: m?.name || g?.name || "Unbekannt",
                isGuest: !!g,
                scoreOrMetric: total,
            };
        });

        entries.sort((a, b) => b.scoreOrMetric - a.scoreOrMetric);
        const totalPlayers = entries.length;

        return entries.map((e, idx) => ({
            ...e,
            rank: idx + 1,
            matrixPoints: e.isGuest ? 0 : Math.max(0, totalPlayers - idx),
        }));
    },
    ScorecardComponent: KniffelPluginScorecardAdapter,
};
