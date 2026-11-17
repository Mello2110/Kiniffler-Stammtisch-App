/**
 * HAPTIC FEEDBACK ENGINE (WEB VIBRATION API)
 * ==========================================
 * Liefert taktiles Vibrationsfeedback auf mobilen Endgeräten für Würfelwürfe,
 * Schock-Out, Alle Neune / Kranz, Pudel und Strafbuchungen.
 */

export type HapticPattern =
    | "tap"
    | "diceRoll"
    | "specialThrow" // Kniffel, Schock-Out, Alle Neune
    | "penalty"      // Strich, Pudel, Hälftenverlust
    | "success";

const PATTERNS: Record<HapticPattern, number | number[]> = {
    tap: 12,
    diceRoll: [18, 30, 25, 35, 15],
    specialThrow: [40, 50, 80, 50, 120],
    penalty: [90, 60, 90],
    success: [20, 40, 45],
};

export function triggerHaptic(pattern: HapticPattern = "tap"): void {
    if (typeof window === "undefined" || typeof navigator === "undefined") return;
    try {
        if ("vibrate" in navigator && typeof navigator.vibrate === "function") {
            navigator.vibrate(PATTERNS[pattern]);
        }
    } catch {
        // Ignore on unsupported browsers (e.g. desktop Safari)
    }
}
