/**
 * PHASE 5: SELF-SERVICE FINANZEN & SMART PAYMENT MATCHING
 * =======================================================
 * Generiert eindeutige, maschinenlesbare Zahlungsreferenzen nach dem Schema:
 *   `KANPAI-[CLUBSLUG]-[USERSHORT]-[HASH4]`
 * sowie vorbefüllte `paypal.me/<handle>/<amount>EUR` Deep-Links und SVG-QR-Codes.
 *
 * Dadurch benötigt kein neuer Verein ein iCloud-/IMAP-App-Passwort!
 */

export interface SmartPaymentDetails {
    referenceCode: string; // z.B. "KANPAI-STAMMTISCH-KAVG97-8F2A"
    paypalUrl: string;     // z.B. "https://www.paypal.com/paypalme/marcelmueller/21.00EUR"
    amountEur: number;
    clubSlug: string;
    userId: string;
}

/**
 * Erzeugt einen deterministischen 4-stelligen Prüf-Hash aus Club + User + Monat,
 * damit Zahlungen im Webhook oder Inbound-Mail-Parser zweifelsfrei zugeordnet werden können.
 */
export function computeShortPaymentHash(clubId: string, userId: string): string {
    const raw = `${clubId}:${userId}:kanpai`;
    let h = 2166136261;
    for (let i = 0; i < raw.length; i++) {
        h ^= raw.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(16).toUpperCase().padStart(8, "0").slice(0, 4);
}

/**
 * Baut den eindeutigen Verwendungszweck (`[Verein]-[User]-[Token]`) und den PayPal.me Link.
 */
export function buildSmartPaymentDetails(params: {
    clubId: string;
    clubSlug: string;
    userId: string;
    userName?: string;
    amountEur: number;
    paypalMeHandle?: string;
}): SmartPaymentDetails {
    const cleanClub = (params.clubSlug || "CLUB")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 10) || "CLUB";

    const userShort = (params.userId || "USER")
        .replace(/[^a-zA-Z0-9]/g, "")
        .toUpperCase()
        .slice(0, 6);

    const hash4 = computeShortPaymentHash(params.clubId, params.userId);
    const referenceCode = `KP-${cleanClub}-${userShort}-${hash4}`;

    const rawHandle = (params.paypalMeHandle || "")
        .trim()
        .replace(/^https?:\/\/(www\.)?paypal\.me\//i, "")
        .replace(/^paypal\.me\//i, "")
        .replace(/\/+$/, "");

    const positiveAmount = Math.max(1, Number(params.amountEur || 15)).toFixed(2);
    const paypalUrl = rawHandle
        ? `https://www.paypal.com/paypalme/${encodeURIComponent(rawHandle)}/${positiveAmount}EUR`
        : `https://www.paypal.com/myaccount/transfer/homepage/pay`;

    return {
        referenceCode,
        paypalUrl,
        amountEur: parseFloat(positiveAmount),
        clubSlug: cleanClub,
        userId: params.userId,
    };
}

/**
 * Extrahiert einen KANPAI-Zahlungstoken (`KP-[CLUB]-[USERSHORT]-[HASH4]`) aus einem
 * beliebigen E-Mail-Body, Betreff oder PayPal-Webhook-Notizfeld.
 */
export function parseSmartPaymentToken(text: string): {
    fullToken: string;
    clubPrefix: string;
    userShort: string;
    hash4: string;
} | null {
    if (!text) return null;
    const match = text.match(/\bKP-([A-Z0-9]{2,12})-([A-Z0-9]{4,8})-([A-F0-9]{4})\b/i);
    if (!match) return null;
    return {
        fullToken: match[0].toUpperCase(),
        clubPrefix: match[1].toUpperCase(),
        userShort: match[2].toUpperCase(),
        hash4: match[3].toUpperCase(),
    };
}
