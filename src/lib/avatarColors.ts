// ============================================
// SHARED AVATAR COLOR PALETTE
// ============================================
// This is the single source of truth for avatar colors.
// Colors are stored as CSS hex values and referenced by key in the database.
// We do NOT use Tailwind class strings because Tailwind purges dynamic classes at build time.

export interface AvatarColor {
    key: string;    // The value stored in the database (avatar.bgColor)
    name: string;   // Human-readable German name
    hex: string;    // CSS hex color - used directly via style={{ backgroundColor }}
}

export const AVATAR_COLORS: AvatarColor[] = [
    { key: "lachs",       name: "Lachs",      hex: "#fb7185" }, // rose-400
    { key: "kaminrot",    name: "Kaminrot",   hex: "#dc2626" }, // red-600
    { key: "orange",      name: "Orange",     hex: "#f97316" }, // orange-500
    { key: "bernstein",   name: "Bernstein",  hex: "#f59e0b" }, // amber-500
    { key: "zitrone",     name: "Zitrone",    hex: "#facc15" }, // yellow-400
    { key: "limette",     name: "Limette",    hex: "#84cc16" }, // lime-500
    { key: "minze",       name: "Minze",      hex: "#34d399" }, // emerald-400
    { key: "smaragd",     name: "Smaragd",    hex: "#059669" }, // emerald-600
    { key: "tuerkis",     name: "Türkis",     hex: "#14b8a6" }, // teal-500
    { key: "cyan",        name: "Cyan",       hex: "#06b6d4" }, // cyan-500
    { key: "himmelblau",  name: "Himmelblau", hex: "#0ea5e9" }, // sky-500
    { key: "ozean",       name: "Ozeanblau",  hex: "#2563eb" }, // blue-600
    { key: "indigo",      name: "Indigo",     hex: "#6366f1" }, // indigo-500
    { key: "violett",     name: "Violett",    hex: "#8b5cf6" }, // violet-500
    { key: "fuchsia",     name: "Fuchsia",    hex: "#d946ef" }, // fuchsia-500
    { key: "pink",        name: "Pink",       hex: "#f472b6" }, // pink-400
];

// Lookup helpers
export const AVATAR_COLOR_KEYS = AVATAR_COLORS.map(c => c.key);

export function getAvatarColorHex(key: string): string {
    return AVATAR_COLORS.find(c => c.key === key)?.hex ?? "#6366f1"; // default indigo
}
