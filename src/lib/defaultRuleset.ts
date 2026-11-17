import type { ClubRulesetConfig } from "@/types";

export const DEFAULT_PRIMARY_HEX = "#854d59"; // Rosewood Berry (Mauve-Lachs)
export const DEFAULT_ACCENT_HEX = "#578d8e";  // Sage Teal (Blau-Grün Mint)

/**
 * Exaktes Original-Regelwerk unseres Stammtischs als reproduzierbarer Default-Standard
 * für Kniffeln, Schocken, Kegeln und den Strafenkatalog.
 */
export const DEFAULT_CLUB_RULESET: ClubRulesetConfig = {
    kniffel: {
        placementMode: "dynamic_participants",
        kniffelBonusPoints: 1,
        highestChanceBonusPoints: 1,
        lowestChanceBonusPoints: 1,
        upperBonusThreshold: 63,
        upperBonusScore: 35,
        strokePenaltyEur: 1.0,
    },
    schocken: {
        stockCoasters: 13,
        juleEnabled: true,
        placementMode: "dynamic_participants",
        schockOutMatrixBonusPoints: 1,
        cleanSheetMatrixBonusPoints: 1,
        halfLossPenaltyEur: 1.0,
        finalLossPenaltyEur: 2.0,
        doubleHalfLossPenaltyEur: 2.0,
    },
    kegeln: {
        placementMode: "dynamic_participants",
        alleNeuneMatrixBonusPoints: 1,
        kranzMatrixBonusPoints: 1,
        pudelPenaltyEur: 0.5,
        autoBookPudelPenalty: true,
        pudelKingPenaltyEur: 2.0,
    },
    customPenaltyCatalog: [
        { id: "pen_strich", label: "Strich gewürfelt", amountEur: 1.0, gameType: "kniffel" },
        { id: "pen_dice_drop", label: "Würfel vom Tisch gefallen", amountEur: 0.5, gameType: "general" },
        { id: "pen_schock_half", label: "Schocken: Hälfte verloren", amountEur: 1.0, gameType: "schocken" },
        { id: "pen_schock_final", label: "Schocken: Finale verloren", amountEur: 2.0, gameType: "schocken" },
        { id: "pen_kegel_pudel", label: "Kegeln: Pudel / Rinne (0 Holz)", amountEur: 0.5, gameType: "kegeln" },
        { id: "pen_kegel_klingel", label: "Kegeln: Klingel / Kugel verfehlt", amountEur: 1.0, gameType: "kegeln" },
        { id: "pen_late", label: "Zu spät zum Stammtisch", amountEur: 2.0, gameType: "general" },
    ],
};
