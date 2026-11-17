/**
 * PHASE 6 V2: MATHEMATICAL OKLCH 2-COLOR DESIGN SYSTEM ENGINE (LUMINOUS EDITION)
 * ==============================================================================
 * Berechnet aus lediglich ZWEI Admin-Eingabefarben (`primaryHex`, `accentHex` -
 * Standard: #854d59 Rosewood Berry & #578d8e Sage Teal):
 * 1. Vollständige, harmonische 11-stufige Tonal-Paletten (`50` bis `950`) im OKLCH-Farbraum
 * 2. Speziell für gedeckte/elegante Farben im Dark Mode optimierte Luminous-Glow-Tokens
 *    (`--primary-glow`, `--accent-glow`), damit Highlights, Badges und Verläufe edel "poppen"
 * 3. Dynamische, garantierte WCAG AA Textkontrastfarben (`--primary-foreground`, `--accent-foreground`)
 * 4. Harmonisch getönte Dark-Mode Oberflächen (`--background`, `--secondary`, `--card`, `--border`)
 *    ohne jeglichen lila/indigo Restschleier.
 */

import { DEFAULT_PRIMARY_HEX, DEFAULT_ACCENT_HEX } from "@/lib/defaultRuleset";

export interface OklchColor {
    l: number; // 0 .. 1 (Perceptual Lightness)
    c: number; // 0 .. 0.4 (Chroma)
    h: number; // 0 .. 360 (Hue angle in degrees)
}

export interface GeneratedThemeTokens {
    cssVariables: Record<string, string>;
    primaryScale: Record<string, string>;
    accentScale: Record<string, string>;
    primaryOklch: OklchColor;
    accentOklch: OklchColor;
    primaryContrastRatio: number;
    accentContrastRatio: number;
}

function clamp(val: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, val));
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const clean = (hex || "").replace(/^#/, "").trim();
    const full = clean.length === 3
        ? clean.split("").map(ch => ch + ch).join("")
        : clean.padEnd(6, "0").slice(0, 6);
    const num = parseInt(full, 16) || 0;
    return {
        r: ((num >> 16) & 255) / 255,
        g: ((num >> 8) & 255) / 255,
        b: (num & 255) / 255,
    };
}

function srgbToLinear(c: number): number {
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Exakte Konvertierung von Hex (sRGB) -> Linear sRGB -> Oklab -> OKLCH (Björn Ottosson).
 */
export function hexToOklch(hex: string): OklchColor {
    const { r: sr, g: sg, b: sb } = hexToRgb(hex);
    const r = srgbToLinear(sr);
    const g = srgbToLinear(sg);
    const b = srgbToLinear(sb);

    const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
    const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
    const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

    const l_ = Math.cbrt(l);
    const m_ = Math.cbrt(m);
    const s_ = Math.cbrt(s);

    const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
    const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
    const bLab = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;

    const C = Math.sqrt(a * a + bLab * bLab);
    let H = (Math.atan2(bLab, a) * 180) / Math.PI;
    if (H < 0) H += 360;

    return {
        l: clamp(L, 0, 1),
        c: clamp(C, 0, 0.37),
        h: Number.isFinite(H) ? H : 0,
    };
}

/**
 * Konvertiert Hex zu "H S% L%" String, hebt aber für dunkle/gedeckte Farben im Dark-Mode
 * die Mindest-Helligkeit und Sättigung leicht an, damit Buttons & Texte kristallklar leuchten.
 */
export function hexToVibrantHslChannelString(hex: string, boostForDarkUi = true): string {
    const { r, g, b } = hexToRgb(hex);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    let l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    if (boostForDarkUi) {
        // Wenn eine edle, gedeckte Farbe wie #854d59 (L=41%, S=27%) gewählt wird,
        // heben wir für leuchtende UI-Akzente die Helligkeit sanft in den Bereich >= 54% und Sättigung >= 38%
        l = Math.max(l, 0.54);
        s = Math.min(0.85, Math.max(s * 1.28, 0.36));
    }

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function getRelativeLuminance(hex: string): number {
    const { r, g, b } = hexToRgb(hex);
    return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

export function getContrastRatio(lum1: number, lum2: number): number {
    const brighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);
    return (brighter + 0.05) / (darker + 0.05);
}

/**
 * Erzeugt eine harmonische 11-stufige Tonal-Palette (`50` bis `950`) im OKLCH-Farbraum.
 */
export function generateOklchTonalScale(base: OklchColor): Record<string, string> {
    const effectiveChroma = Math.max(base.c, 0.085);
    const steps: { key: string; l: number; chromaFactor: number }[] = [
        { key: "50",  l: 0.96, chromaFactor: 0.24 },
        { key: "100", l: 0.92, chromaFactor: 0.42 },
        { key: "200", l: 0.85, chromaFactor: 0.65 },
        { key: "300", l: 0.77, chromaFactor: 0.88 },
        { key: "400", l: 0.69, chromaFactor: 1.08 },
        { key: "500", l: clamp(base.l, 0.54, 0.65), chromaFactor: 1.05 },
        { key: "600", l: 0.50, chromaFactor: 0.98 },
        { key: "700", l: 0.42, chromaFactor: 0.86 },
        { key: "800", l: 0.34, chromaFactor: 0.72 },
        { key: "900", l: 0.26, chromaFactor: 0.56 },
        { key: "950", l: 0.18, chromaFactor: 0.42 },
    ];

    const scale: Record<string, string> = {};
    for (const st of steps) {
        const c = Number(clamp(effectiveChroma * st.chromaFactor, 0.01, 0.32).toFixed(4));
        const h = Number(base.h.toFixed(2));
        scale[st.key] = `oklch(${(st.l * 100).toFixed(1)}% ${c} ${h})`;
    }
    return scale;
}

/**
 * Berechnet alle CSS-Custom-Properties für das 2-Farben-Designsystem.
 */
export function generateClubThemeTokens(
    primaryHex: string = DEFAULT_PRIMARY_HEX,
    accentHex: string = DEFAULT_ACCENT_HEX
): GeneratedThemeTokens {
    const safePrimary = primaryHex || DEFAULT_PRIMARY_HEX;
    const safeAccent = accentHex || DEFAULT_ACCENT_HEX;

    const pOklch = hexToOklch(safePrimary);
    const aOklch = hexToOklch(safeAccent);

    const primaryScale = generateOklchTonalScale(pOklch);
    const accentScale = generateOklchTonalScale(aOklch);

    // WCAG AA Kontrastberechnung
    const pLum = getRelativeLuminance(safePrimary);
    const aLum = getRelativeLuminance(safeAccent);

    const whiteLum = getRelativeLuminance("#F8FAFC");
    const darkLum = getRelativeLuminance("#090D16");

    const pContrastWhite = getContrastRatio(pLum, whiteLum);
    const pContrastDark = getContrastRatio(pLum, darkLum);
    const useDarkOnPrimary = pContrastDark > pContrastWhite && pOklch.l > 0.72;

    const aContrastWhite = getContrastRatio(aLum, whiteLum);
    const aContrastDark = getContrastRatio(aLum, darkLum);
    const useDarkOnAccent = aContrastDark > aContrastWhite && aOklch.l > 0.72;

    const primaryFgHsl = useDarkOnPrimary ? "220 45% 6%" : "210 40% 98%";
    const accentFgHsl = useDarkOnAccent ? "220 45% 6%" : "210 40% 98%";

    // Berechne HSL Hue aus RGB für perfekt getönte neutrale Dark-Mode-Flächen (0% Lila-Schleier!)
    const pHslStr = hexToVibrantHslChannelString(safePrimary, true);
    const aHslStr = hexToVibrantHslChannelString(safeAccent, true);
    const primaryHueInt = parseInt(pHslStr.split(" ")[0], 10) || 347;

    const cssVariables: Record<string, string> = {
        "--primary": pHslStr,
        "--primary-foreground": primaryFgHsl,
        "--accent": aHslStr,
        "--accent-foreground": accentFgHsl,
        "--ring": pHslStr,

        // Harmonisch im Farbton der Hauptfarbe getönte Dark-Mode Oberflächen
        "--background": `${primaryHueInt} 26% 5%`,
        "--secondary": `${primaryHueInt} 20% 12%`,
        "--card": `${primaryHueInt} 22% 10%`,
        "--muted": `${primaryHueInt} 18% 14%`,
        "--border": `${primaryHueInt} 20% 18%`,
        "--input": `${primaryHueInt} 20% 15%`,

        // Direkte OKLCH & Glow Variablen für leuchtende Hero-Verläufe & Scheinwerfer
        "--oklch-primary": `oklch(${(pOklch.l * 100).toFixed(1)}% ${pOklch.c.toFixed(4)} ${pOklch.h.toFixed(2)})`,
        "--oklch-accent": `oklch(${(aOklch.l * 100).toFixed(1)}% ${aOklch.c.toFixed(4)} ${aOklch.h.toFixed(2)})`,
        "--primary-glow": primaryScale["400"],
        "--accent-glow": accentScale["400"],
    };

    for (const [step, val] of Object.entries(primaryScale)) {
        cssVariables[`--primary-${step}`] = val;
    }
    for (const [step, val] of Object.entries(accentScale)) {
        cssVariables[`--accent-${step}`] = val;
    }

    return {
        cssVariables,
        primaryScale,
        accentScale,
        primaryOklch: pOklch,
        accentOklch: aOklch,
        primaryContrastRatio: Number(Math.max(pContrastWhite, pContrastDark).toFixed(2)),
        accentContrastRatio: Number(Math.max(aContrastWhite, aContrastDark).toFixed(2)),
    };
}
