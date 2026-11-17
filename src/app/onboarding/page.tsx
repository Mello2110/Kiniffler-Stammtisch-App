"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useClub } from "@/contexts/ClubContext";
import { ALL_GAME_PLUGINS } from "@/games/registry";
import { generateClubThemeTokens } from "@/lib/oklchTheme";
import { DEFAULT_PRIMARY_HEX, DEFAULT_ACCENT_HEX } from "@/lib/defaultRuleset";
import { triggerHaptic } from "@/lib/haptics";
import type { GameDisciplineId } from "@/types";
import {
    ArrowLeft,
    ArrowRight,
    Beer,
    Check,
    CheckCircle2,
    Copy,
    Gamepad2,
    Loader2,
    LogOut,
    Palette,
    Sparkles,
    Users,
    Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

const THEME_PRESETS = [
    { name: "KANPAI Rosewood & Sage", primary: DEFAULT_PRIMARY_HEX, accent: DEFAULT_ACCENT_HEX },
    { name: "Terracotta & Petrol", primary: "#9E5348", accent: "#3E7B82" },
    { name: "Smaragd & Bernstein", primary: "#2E7D6B", accent: "#C98A4B" },
    { name: "Mitternacht & Kupfer", primary: "#3E5F8A", accent: "#C87A55" },
    { name: "Burgund & Goldolive", primary: "#7D3C4A", accent: "#998B4C" },
];

export default function OnboardingPage() {
    const router = useRouter();
    const { user, loading: authLoading, logout } = useAuth();
    const { createNewClub } = useClub();

    const [step, setStep] = useState<1 | 2 | 3>(1);

    // Step 1: Club & Member Basics
    const [clubName, setClubName] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [enabledGames, setEnabledGames] = useState<GameDisciplineId[]>(["kniffel", "schocken", "kegeln"]);

    // Step 2: Theme & Treasury
    const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY_HEX);
    const [accentColor, setAccentColor] = useState(DEFAULT_ACCENT_HEX);
    const [monthlyContributionEur, setMonthlyContributionEur] = useState<string>("15");
    const [paypalMeHandle, setPaypalMeHandle] = useState("");

    // Submission & Result
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [createdClubName, setCreatedClubName] = useState("");
    const [inviteCode, setInviteCode] = useState("");
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (user && !displayName) {
            const fallback = user.displayName || (user.email ? user.email.split("@")[0] : "");
            setDisplayName(fallback);
        }
    }, [user, displayName]);

    const applyLiveTheme = (pHex: string, aHex: string) => {
        setPrimaryColor(pHex);
        setAccentColor(aHex);
        triggerHaptic("tap");
        if (typeof document !== "undefined") {
            const { cssVariables } = generateClubThemeTokens(pHex, aHex);
            for (const [k, v] of Object.entries(cssVariables)) {
                document.documentElement.style.setProperty(k, v);
            }
        }
    };

    const toggleGame = (id: GameDisciplineId) => {
        triggerHaptic("tap");
        setEnabledGames((prev) => {
            if (prev.includes(id)) {
                if (prev.length === 1) return prev;
                return prev.filter((g) => g !== id);
            }
            return [...prev, id];
        });
    };

    const previewSlug =
        clubName
            .toLowerCase()
            .replace(/[^a-z0-9-_]/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "") || "mein-verein";

    const handleCreateClub = async () => {
        if (!clubName.trim() || clubName.trim().length < 2) {
            setError("Bitte gib einen Vereinsnamen (mindestens 2 Zeichen) ein.");
            setStep(1);
            return;
        }
        setError(null);
        setIsCreating(true);
        try {
            const parsedContrib = parseFloat(monthlyContributionEur);
            const result = await createNewClub({
                name: clubName.trim(),
                slug: previewSlug,
                displayName: displayName.trim() || undefined,
                primaryColor,
                accentColor,
                enabledGames,
                paypalMeHandle: paypalMeHandle.trim(),
                monthlyContributionEur: !isNaN(parsedContrib) && parsedContrib >= 0 ? parsedContrib : 15,
            });
            setCreatedClubName(clubName.trim());
            setInviteCode(result.inviteCode);
            setStep(3);
            triggerHaptic("success");
        } catch (err: any) {
            console.error("Error creating club:", err);
            setError(err?.message || "Verein konnte nicht erstellt werden. Bitte erneut versuchen.");
        } finally {
            setIsCreating(false);
        }
    };

    const inviteUrl =
        typeof window !== "undefined" && inviteCode
            ? `${window.location.origin}/join?code=${inviteCode}`
            : `/join?code=${inviteCode}`;

    const handleCopyInvite = () => {
        if (!inviteCode) return;
        navigator.clipboard?.writeText(inviteUrl);
        setCopied(true);
        triggerHaptic("tap");
        setTimeout(() => setCopied(false), 2500);
    };

    if (authLoading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="text-sm">Bereite Einrichtung vor...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-transparent text-foreground">
            <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-card/85 backdrop-blur-xl p-6 sm:p-8 shadow-2xl space-y-6">
                {/* Header & Progress */}
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shrink-0">
                            {step === 3 ? <CheckCircle2 className="h-6 w-6 text-emerald-400" /> : <Beer className="h-6 w-6" />}
                        </div>
                        <div>
                            <div className="text-[11px] uppercase tracking-widest font-bold text-primary">
                                {step === 3 ? "Bereit zum Anstoßen" : `Schritt ${step} von 2`}
                            </div>
                            <h1 className="text-xl sm:text-2xl font-black text-[#F5F0EB] outfit">
                                {step === 1
                                    ? "Neuen Verein gründen"
                                    : step === 2
                                    ? "Look & Vereinskasse"
                                    : `${createdClubName} ist startklar!`}
                            </h1>
                        </div>
                    </div>
                </div>

                {/* Step Progress Bar */}
                {step < 3 && (
                    <div className="grid grid-cols-2 gap-2">
                        <div className={cn("h-1.5 rounded-full transition-colors", step >= 1 ? "bg-primary" : "bg-white/10")} />
                        <div className={cn("h-1.5 rounded-full transition-colors", step >= 2 ? "bg-primary" : "bg-white/10")} />
                    </div>
                )}

                {error && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
                        {error}
                    </div>
                )}

                {/* STEP 1: Club Name, Founder Display Name & Games */}
                {step === 1 && (
                    <div className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Vereinsname *
                            </label>
                            <input
                                type="text"
                                value={clubName}
                                onChange={(e) => setClubName(e.target.value)}
                                placeholder="z.B. Donnerstagsrunde, Kegelclub Nord..."
                                maxLength={60}
                                className="w-full"
                                autoFocus
                            />
                            <p className="text-[11px] text-muted-foreground">
                                URL-Kürzel: <code className="text-primary">{previewSlug}</code>
                            </p>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Dein Name im Verein
                            </label>
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="z.B. Max"
                                maxLength={40}
                                className="w-full"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <Gamepad2 className="h-3.5 w-3.5 text-primary" />
                                Aktive Spiele
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {ALL_GAME_PLUGINS.map((plugin) => {
                                    const active = enabledGames.includes(plugin.id);
                                    return (
                                        <button
                                            key={plugin.id}
                                            type="button"
                                            onClick={() => toggleGame(plugin.id)}
                                            className={cn(
                                                "px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2",
                                                active
                                                    ? "border-primary bg-primary/15 text-[#F5F0EB]"
                                                    : "border-white/10 bg-black/20 text-muted-foreground hover:bg-white/5"
                                            )}
                                        >
                                            <span className="text-xs font-bold">{plugin.title}</span>
                                            {active && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                if (!clubName.trim() || clubName.trim().length < 2) {
                                    setError("Bitte gib einen Vereinsnamen (mindestens 2 Zeichen) ein.");
                                    return;
                                }
                                setError(null);
                                triggerHaptic("tap");
                                setStep(2);
                            }}
                            className="w-full py-3.5 px-5 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 shadow-lg hover:opacity-90 transition-opacity cursor-pointer"
                        >
                            Weiter zu Look &amp; Kasse
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>
                )}

                {/* STEP 2: Theme & Treasury */}
                {step === 2 && (
                    <div className="space-y-5">
                        <div className="space-y-2.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <Palette className="h-3.5 w-3.5 text-primary" />
                                Vereinsfarben (Live-Vorschau)
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {THEME_PRESETS.map((preset) => {
                                    const selected =
                                        primaryColor.toLowerCase() === preset.primary.toLowerCase() &&
                                        accentColor.toLowerCase() === preset.accent.toLowerCase();
                                    return (
                                        <button
                                            key={preset.name}
                                            type="button"
                                            onClick={() => applyLiveTheme(preset.primary, preset.accent)}
                                            className={cn(
                                                "flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer",
                                                selected
                                                    ? "border-primary bg-primary/15"
                                                    : "border-white/10 bg-black/20 hover:bg-white/5"
                                            )}
                                        >
                                            <span className="flex items-center -space-x-1 shrink-0">
                                                <span
                                                    className="w-4 h-4 rounded-full border border-white/20"
                                                    style={{ backgroundColor: preset.primary }}
                                                />
                                                <span
                                                    className="w-4 h-4 rounded-full border border-white/20"
                                                    style={{ backgroundColor: preset.accent }}
                                                />
                                            </span>
                                            <span className="text-xs font-semibold truncate">{preset.name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                    <Wallet className="h-3.5 w-3.5 text-primary" />
                                    Monatsbeitrag (€)
                                </label>
                                <input
                                    type="number"
                                    min={0}
                                    step="0.5"
                                    value={monthlyContributionEur}
                                    onChange={(e) => setMonthlyContributionEur(e.target.value)}
                                    className="w-full text-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    PayPal.me (optional)
                                </label>
                                <input
                                    type="text"
                                    value={paypalMeHandle}
                                    onChange={(e) => setPaypalMeHandle(e.target.value)}
                                    placeholder="z.B. stammtischkasse"
                                    className="w-full text-sm"
                                />
                            </div>
                        </div>

                        <p className="text-[11px] text-muted-foreground">
                            Alle Einstellungen und Hausregeln kannst du jederzeit später in den Optionen anpassen.
                        </p>

                        <div className="flex gap-2.5">
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                disabled={isCreating}
                                className="px-4 py-3.5 rounded-xl bg-secondary/60 hover:bg-secondary border border-white/10 text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Zurück
                            </button>
                            <button
                                type="button"
                                onClick={handleCreateClub}
                                disabled={isCreating}
                                className="flex-1 py-3.5 px-5 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 shadow-lg hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                            >
                                {isCreating ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Erstelle Verein...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="h-4 w-4" />
                                        Verein jetzt gründen
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 3: Success & Invite Link */}
                {step === 3 && (
                    <div className="space-y-5">
                        <p className="text-sm text-muted-foreground">
                            Dein Verein wurde angelegt und du bist automatisch als Admin eingetragen. Teile diesen
                            Einladungslink mit deinen Freunden, damit sie direkt beitreten können:
                        </p>

                        <div className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-3">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                                <Users className="h-3.5 w-3.5" />
                                Dein Einladungslink
                            </div>
                            <div className="font-mono text-xs sm:text-sm text-[#F5F0EB] break-all bg-black/30 p-2.5 rounded-xl border border-white/5">
                                {inviteUrl}
                            </div>
                            <button
                                type="button"
                                onClick={handleCopyInvite}
                                className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                            >
                                {copied ? (
                                    <>
                                        <Check className="h-4 w-4 text-emerald-400" />
                                        Link kopiert!
                                    </>
                                ) : (
                                    <>
                                        <Copy className="h-4 w-4" />
                                        Einladungslink kopieren
                                    </>
                                )}
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={() => router.push("/dashboard")}
                            className="w-full py-3.5 px-5 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 shadow-lg hover:opacity-90 transition-opacity cursor-pointer"
                        >
                            Ab ins Dashboard
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>
                )}

                {/* Footer / Escape hatch for invited users */}
                {step < 3 && (
                    <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-muted-foreground">
                        <span>Du hast einen Einladungslink? Öffne ihn einfach direkt im Browser.</span>
                        <button
                            type="button"
                            onClick={logout}
                            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                        >
                            <LogOut className="h-3 w-3" />
                            Abmelden
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
