"use client";

/**
 * PHASE 2, 3, 5 & 6: CLUB ADMIN STUDIO (DESIGN SYSTEM, GAMES, PAYMENTS & MULTI-TENANCY)
 * =====================================================================================
 * Ermöglicht Vereins-Admins:
 * 1. Dynamisches 2-Farben-Designsystem (Hauptfarbe + Akzentfarbe) mit Live-OKLCH-Skala (50–950) & WCAG-AA-Kontrastprüfung
 * 2. Aktivierung/Deaktivierung der Spiel-Disziplinen (Kniffeln, Schocken, Kegeln) per Schalter
 * 3. 2-Klick PayPal.me & Kassen-E-Mail Setup (ohne Herausgabe von Mailbox-Passwörtern)
 * 4. Multi-Tenant Workspace: Neuen Verein / Stammtisch anlegen oder zwischen Vereinen wechseln
 */

import React, { useState, useEffect, useMemo } from "react";
import { useClub } from "@/contexts/ClubContext";
import { ALL_GAME_PLUGINS } from "@/games/registry";
import { generateClubThemeTokens } from "@/lib/oklchTheme";
import { DEFAULT_PRIMARY_HEX, DEFAULT_ACCENT_HEX } from "@/lib/defaultRuleset";
import { ClubRulesetEditor } from "./ClubRulesetEditor";
import { ClubInviteManager } from "./ClubInviteManager";
import { triggerHaptic } from "@/lib/haptics";
import type { GameDisciplineId } from "@/types";
import {
    Palette,
    Gamepad2,
    Wallet,
    Building2,
    Check,
    Sparkles,
    Plus,
    Eye
} from "lucide-react";
import { cn } from "@/lib/utils";

const THEME_PRESETS = [
    { name: "KANPAI Rosewood & Sage", primary: DEFAULT_PRIMARY_HEX, accent: DEFAULT_ACCENT_HEX },
    { name: "Terracotta & Petrol", primary: "#9E5348", accent: "#3E7B82" },
    { name: "Smaragd & Bernstein", primary: "#2E7D6B", accent: "#C98A4B" },
    { name: "Mitternacht & Kupfer", primary: "#3E5F8A", accent: "#C87A55" },
    { name: "Burgund & Goldolive", primary: "#7D3C4A", accent: "#998B4C" },
];

export function ClubAdminStudio() {
    const {
        clubId,
        club,
        availableClubs,
        switchClub,
        createNewClub,
        updateClubTheme,
        updateClubGames,
        updateClubPaymentConfig,
    } = useClub();

    // 1. Theme State
    const [primaryColor, setPrimaryColor] = useState(club?.theme?.primaryColor || DEFAULT_PRIMARY_HEX);
    const [accentColor, setAccentColor] = useState(club?.theme?.accentColor || DEFAULT_ACCENT_HEX);
    const [themeSaved, setThemeSaved] = useState(false);

    // 2. Games State
    const [enabledGames, setEnabledGames] = useState<GameDisciplineId[]>(
        club?.enabledGames || ["kniffel", "schocken", "kegeln"]
    );
    const [defaultGame, setDefaultGame] = useState<GameDisciplineId>(club?.defaultGame || "kniffel");
    const [gamesSaved, setGamesSaved] = useState(false);

    // 3. Payment Self-Service State
    const [paypalHandle, setPaypalHandle] = useState(club?.paymentConfig?.paypalMeHandle || "");
    const [treasuryEmail, setTreasuryEmail] = useState(club?.paymentConfig?.treasuryEmail || "");
    const [monthlyContrib, setMonthlyContrib] = useState(club?.paymentConfig?.monthlyContributionEur ?? 15);
    const [monthlyContribDay, setMonthlyContribDay] = useState(club?.paymentConfig?.monthlyContributionDay ?? 1);
    const [autoBookContribs, setAutoBookContribs] = useState(club?.paymentConfig?.autoBookContributions ?? true);
    const [paymentSyncMode, setPaymentSyncMode] = useState<'manual_confirm' | 'auto_webhook' | 'imap_legacy'>(
        club?.paymentConfig?.paymentSyncMode || (clubId === "club_original" ? "imap_legacy" : "manual_confirm")
    );
    const [webhookSecret, setWebhookSecret] = useState(club?.paymentConfig?.webhookSecret || "");
    const [paymentSaved, setPaymentSaved] = useState(false);

    // 4. Create New Club Modal/Form State
    const [newClubName, setNewClubName] = useState("");
    const [newClubSlug, setNewClubSlug] = useState("");
    const [isCreatingClub, setIsCreatingClub] = useState(false);

    useEffect(() => {
        if (!club) return;
        setPrimaryColor(club.theme?.primaryColor || DEFAULT_PRIMARY_HEX);
        setAccentColor(club.theme?.accentColor || DEFAULT_ACCENT_HEX);
        setEnabledGames(club.enabledGames || ["kniffel", "schocken", "kegeln"]);
        setDefaultGame(club.defaultGame || "kniffel");
        setPaypalHandle(club.paymentConfig?.paypalMeHandle || "");
        setTreasuryEmail(club.paymentConfig?.treasuryEmail || "");
        setMonthlyContrib(club.paymentConfig?.monthlyContributionEur ?? 15);
        setMonthlyContribDay(club.paymentConfig?.monthlyContributionDay ?? 1);
        setAutoBookContribs(club.paymentConfig?.autoBookContributions ?? true);
        setPaymentSyncMode(club.paymentConfig?.paymentSyncMode || (club.id === "club_original" ? "imap_legacy" : "manual_confirm"));
        setWebhookSecret(club.paymentConfig?.webhookSecret || "");
    }, [club]);

    // Live-Vorschau im Browser sobald der Admin den Farbwähler bewegt
    const previewTokens = useMemo(
        () => generateClubThemeTokens(primaryColor, accentColor),
        [primaryColor, accentColor]
    );

    const applyLivePreview = (pHex: string, aHex: string) => {
        setPrimaryColor(pHex);
        setAccentColor(aHex);
        if (typeof document !== "undefined") {
            const { cssVariables } = generateClubThemeTokens(pHex, aHex);
            for (const [k, v] of Object.entries(cssVariables)) {
                document.documentElement.style.setProperty(k, v);
            }
        }
    };

    const handleSaveTheme = async () => {
        triggerHaptic("success");
        await updateClubTheme({
            primaryColor,
            accentColor,
            mode: "dark",
        });
        setThemeSaved(true);
        setTimeout(() => setThemeSaved(false), 2500);
    };

    const toggleDiscipline = (id: GameDisciplineId) => {
        triggerHaptic("tap");
        setEnabledGames(prev => {
            if (prev.includes(id)) {
                if (prev.length <= 1) return prev; // Mindestens 1 Spiel muss aktiv bleiben
                const next = prev.filter(g => g !== id);
                if (defaultGame === id) setDefaultGame(next[0]);
                return next;
            }
            return [...prev, id];
        });
    };

    const handleSaveGames = async () => {
        triggerHaptic("success");
        await updateClubGames(enabledGames, defaultGame);
        setGamesSaved(true);
        setTimeout(() => setGamesSaved(false), 2500);
    };

    const handleSavePayment = async () => {
        triggerHaptic("success");
        await updateClubPaymentConfig({
            paypalMeHandle: paypalHandle.trim(),
            treasuryEmail: treasuryEmail.trim(),
            monthlyContributionEur: Number(monthlyContrib) || 15,
            monthlyContributionDay: monthlyContribDay,
            autoBookContributions: autoBookContribs,
            paymentSyncMode,
            webhookSecret: webhookSecret.trim() || undefined,
        });
        setPaymentSaved(true);
        setTimeout(() => setPaymentSaved(false), 2500);
    };

    const handleCreateClub = async () => {
        if (!newClubName.trim()) return;
        setIsCreatingClub(true);
        try {
            const slug = newClubSlug.trim() || newClubName.toLowerCase().replace(/[^a-z0-9]/g, "-");
            await createNewClub({
                name: newClubName.trim(),
                slug,
                primaryColor,
                accentColor,
                enabledGames,
                paypalMeHandle: paypalHandle,
                treasuryEmail,
            });
            setNewClubName("");
            setNewClubSlug("");
            triggerHaptic("success");
        } finally {
            setIsCreatingClub(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* 1. Dynamisches 2-Farben OKLCH Designsystem */}
            <div className="rounded-3xl border border-primary/25 bg-card/60 backdrop-blur-md p-6 md:p-8 space-y-6 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-bold uppercase tracking-wider mb-2">
                            <Palette className="h-3.5 w-3.5" />
                            OKLCH 2-Farben Designsystem
                        </div>
                        <h3 className="text-2xl font-black outfit">
                            Vereins-Farbwelt & Automatische Kontrast-Skala
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            Wähle nur <strong>Hauptfarbe</strong> und <strong>Akzentfarbe</strong>. Alle 11 Abstufungen (`50` bis `950`), getönte Hintergründe und WCAG-AA-Textkontraste werden mathematisch im OKLCH-Farbraum berechnet.
                        </p>
                    </div>

                    <button
                        onClick={handleSaveTheme}
                        className="px-5 py-3 rounded-2xl bg-primary text-primary-foreground font-black text-sm flex items-center gap-2 shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all cursor-pointer shrink-0"
                    >
                        {themeSaved ? <Check className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                        {themeSaved ? "Design gespeichert!" : "Design für Verein speichern"}
                    </button>
                </div>

                {/* Preset Pills */}
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-2">
                        Schnell-Presets:
                    </span>
                    {THEME_PRESETS.map(preset => (
                        <button
                            key={preset.name}
                            onClick={() => applyLivePreview(preset.primary, preset.accent)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-background/60 hover:bg-white/10 text-xs font-semibold transition-all cursor-pointer"
                        >
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.primary }} />
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.accent }} />
                            <span>{preset.name}</span>
                        </button>
                    ))}
                </div>

                {/* 2 Color Pickers + OKLCH Tonal Scale Preview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Primary Color */}
                    <div className="p-5 rounded-2xl border border-white/10 bg-background/50 space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm font-bold">1. Hauptfarbe (Primary)</div>
                                <div className="text-xs text-muted-foreground">
                                    OKLCH L={(previewTokens.primaryOklch.l * 100).toFixed(0)}% • C={previewTokens.primaryOklch.c.toFixed(3)} • H={previewTokens.primaryOklch.h.toFixed(0)}°
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={primaryColor}
                                    onChange={e => applyLivePreview(e.target.value, accentColor)}
                                    className="w-12 h-10 rounded-lg cursor-pointer p-0 border-0 bg-transparent"
                                />
                                <input
                                    type="text"
                                    value={primaryColor}
                                    onChange={e => applyLivePreview(e.target.value, accentColor)}
                                    className="w-24 font-mono text-xs px-2.5 py-2 rounded-lg bg-secondary border border-white/10"
                                />
                            </div>

                        </div>

                        {/* 50 - 950 Tonal Bar */}
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                                <span>primary-50 bis primary-950 (OKLCH)</span>
                                <span className="text-emerald-400 font-bold">
                                    WCAG Kontrast: {previewTokens.primaryContrastRatio}:1 (AA ✓)
                                </span>
                            </div>
                            <div className="grid grid-cols-11 gap-1 h-8 rounded-xl overflow-hidden p-1 bg-black/30">
                                {Object.entries(previewTokens.primaryScale).map(([step, oklchVal]) => (
                                    <div
                                        key={step}
                                        style={{ background: oklchVal }}
                                        className="rounded-md h-full flex items-end justify-center pb-0.5"
                                        title={`primary-${step}: ${oklchVal}`}
                                    >
                                        <span className="text-[8px] font-bold mix-blend-difference text-white">
                                            {step}
                                        </span>
                                    </div>
                                ))}
                            </div>

                        </div>
                    </div>

                    {/* Accent Color */}
                    <div className="p-5 rounded-2xl border border-white/10 bg-background/50 space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm font-bold">2. Akzentfarbe (Accent)</div>
                                <div className="text-xs text-muted-foreground">
                                    OKLCH L={(previewTokens.accentOklch.l * 100).toFixed(0)}% • C={previewTokens.accentOklch.c.toFixed(3)} • H={previewTokens.accentOklch.h.toFixed(0)}°
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={accentColor}
                                    onChange={e => applyLivePreview(primaryColor, e.target.value)}
                                    className="w-12 h-10 rounded-lg cursor-pointer p-0 border-0 bg-transparent"
                                />
                                <input
                                    type="text"
                                    value={accentColor}
                                    onChange={e => applyLivePreview(primaryColor, e.target.value)}
                                    className="w-24 font-mono text-xs px-2.5 py-2 rounded-lg bg-secondary border border-white/10"
                                />
                            </div>

                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                                <span>accent-50 bis accent-950 (OKLCH)</span>
                                <span className="text-emerald-400 font-bold">
                                    WCAG Kontrast: {previewTokens.accentContrastRatio}:1 (AA ✓)
                                </span>
                            </div>
                            <div className="grid grid-cols-11 gap-1 h-8 rounded-xl overflow-hidden p-1 bg-black/30">
                                {Object.entries(previewTokens.accentScale).map(([step, oklchVal]) => (
                                    <div
                                        key={step}
                                        style={{ background: oklchVal }}
                                        className="rounded-md h-full flex items-end justify-center pb-0.5"
                                        title={`accent-${step}: ${oklchVal}`}
                                    >
                                        <span className="text-[8px] font-bold mix-blend-difference text-white">
                                            {step}
                                        </span>
                                    </div>
                                ))}
                            </div>

                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Modulare Spiel-Disziplinen & 3. Self-Service Bezahlsystem */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Spiel-Disziplinen Schalter */}
                <div className="rounded-3xl border border-white/10 bg-card/60 p-6 space-y-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-lg font-bold">
                            <Gamepad2 className="h-5 w-5 text-primary" />
                            Aktive Spiel-Disziplinen
                        </div>
                        <button
                            onClick={handleSaveGames}
                            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                        >
                            {gamesSaved ? <Check className="h-3.5 w-3.5" /> : null}
                            {gamesSaved ? "Gespeichert!" : "Spiele speichern"}
                        </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Wähle per Schalter aus, welche Sportarten und Würfelspiele in eurem Verein aktiv gespielt werden:
                    </p>

                    <div className="space-y-3">
                        {ALL_GAME_PLUGINS.map(plugin => {
                            const active = enabledGames.includes(plugin.id);
                            const isDefault = defaultGame === plugin.id;
                            return (
                                <div
                                    key={plugin.id}
                                    onClick={() => toggleDiscipline(plugin.id)}
                                    className={cn(
                                        "p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4",
                                        active
                                            ? "border-primary bg-primary/10"
                                            : "border-white/10 bg-background/40 opacity-60"
                                    )}
                                >
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm">{plugin.title}</span>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-muted-foreground">
                                                {plugin.badgeLabel}
                                            </span>
                                            {isDefault && active && (
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-bold">
                                                    Standard
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">{plugin.subtitle}</p>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        {active && !isDefault && (
                                            <button
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    setDefaultGame(plugin.id);
                                                }}
                                                className="text-[10px] px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 font-semibold"
                                            >
                                                Als Standard
                                            </button>
                                        )}
                                        <div
                                            className={cn(
                                                "w-11 h-6 rounded-full p-1 transition-colors",
                                                active ? "bg-primary" : "bg-white/20"
                                            )}
                                        >
                                            <div
                                                className={cn(
                                                    "w-4 h-4 rounded-full bg-white transition-transform",
                                                    active ? "translate-x-5" : "translate-x-0"
                                                )}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Self-Service Finanzen (2-Klick PayPal Setup) */}
                <div className="rounded-3xl border border-white/10 bg-card/60 p-6 space-y-5 flex flex-col justify-between">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-lg font-bold">
                                <Wallet className="h-5 w-5 text-primary" />
                                2-Klick Kassen- & PayPal-Setup
                            </div>
                            <button
                                onClick={handleSavePayment}
                                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                            >
                                {paymentSaved ? <Check className="h-3.5 w-3.5" /> : null}
                                {paymentSaved ? "Gespeichert!" : "Finanz-Setup speichern"}
                            </button>
                        </div>

                        <p className="text-xs text-muted-foreground">
                            Kein E-Mail-Passwort erforderlich! Hinterlege lediglich euer PayPal.me-Handle und die Kassen-E-Mail für automatische QR-Codes und Smart-Verwendungszwecke (`KP-[VEREIN]-[USER]-[HASH]`).
                        </p>

                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    PayPal.me Handle oder Link
                                </label>
                                <input
                                    type="text"
                                    placeholder="z.B. marcelmueller oder paypal.me/stammtisch"
                                    value={paypalHandle}
                                    onChange={e => setPaypalHandle(e.target.value)}
                                    className="w-full mt-1"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        Kassen-E-Mail
                                    </label>
                                    <input
                                        type="email"
                                        placeholder="kasse@verein.de"
                                        value={treasuryEmail}
                                        onChange={e => setTreasuryEmail(e.target.value)}
                                        className="w-full mt-1"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        Monatsbeitrag (€)
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        step="0.5"
                                        value={monthlyContrib}
                                        onChange={e => setMonthlyContrib(Number(e.target.value))}
                                        className="w-full mt-1"
                                    />
                                </div>
                            </div>

                            {/* Terminierungs-Regel für Monatsbeitrag */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        Buchungstag (Terminierung)
                                    </label>
                                    <select
                                        value={monthlyContribDay}
                                        onChange={e => setMonthlyContribDay(Number(e.target.value))}
                                        className="w-full mt-1 text-xs"
                                    >
                                        <option value={1}>1. des Monats (Standard)</option>
                                        <option value={15}>15. des Monats</option>
                                        <option value={0}>Monatsletzter</option>
                                    </select>
                                </div>
                                <label className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 cursor-pointer self-end">
                                    <div>
                                        <div className="text-xs font-bold">Automatisch buchen</div>
                                        <div className="text-[10px] text-muted-foreground">Zum Stichtag ins Ledger</div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={autoBookContribs}
                                        onChange={e => setAutoBookContribs(e.target.checked)}
                                        className="h-4 w-4 accent-primary cursor-pointer"
                                    />
                                </label>
                            </div>

                            {/* Zahlungs-Abgleich Modus */}
                            <div className="pt-1 space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Zahlungs-Abgleich Modus
                                </label>
                                <select
                                    value={paymentSyncMode}
                                    onChange={e => setPaymentSyncMode(e.target.value as 'manual_confirm' | 'auto_webhook' | 'imap_legacy')}
                                    className="w-full text-xs"
                                >
                                    <option value="manual_confirm">1-Klick-Bestätigung (Standard – keine Einrichtung nötig)</option>
                                    <option value="auto_webhook">Automatischer Sync (Webhook / Mail-Weiterleitung)</option>
                                    {clubId === "club_original" && (
                                        <option value="imap_legacy">Stammtisch iCloud-IMAP Sync (Bestand)</option>
                                    )}
                                </select>
                                {paymentSyncMode === "manual_confirm" && (
                                    <p className="text-[11px] text-muted-foreground">
                                        Mitglieder zahlen per PayPal.me / QR-Code und melden ihre Zahlung. Der Kassenwart bestätigt Eingänge mit 1 Klick auf der Kassen-Seite.
                                    </p>
                                )}
                                {paymentSyncMode === "imap_legacy" && (
                                    <p className="text-[11px] text-emerald-400">
                                        Bestehender iCloud-IMAP-Abgleich für euren Stammtisch ist unverändert aktiv.
                                    </p>
                                )}
                            </div>

                            {paymentSyncMode === "auto_webhook" && (
                                <div className="pt-1 space-y-2 rounded-2xl border border-white/10 bg-black/20 p-3.5">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        Inbound-Webhook Secret &amp; URL
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            readOnly
                                            placeholder="Noch kein Secret generiert..."
                                            value={webhookSecret}
                                            className="flex-1 text-xs font-mono"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setWebhookSecret(`kp_wh_${Math.random().toString(36).slice(2, 12)}${Math.random().toString(36).slice(2, 8)}`)}
                                            className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold shrink-0 cursor-pointer"
                                        >
                                            Secret erzeugen
                                        </button>
                                    </div>
                                    <div className="text-[11px] text-muted-foreground space-y-1 leading-relaxed">
                                        <div>
                                            <strong>Webhook-URL:</strong>{" "}
                                            <code className="break-all text-[#F5F0EB]">
                                                {`https://us-central1-${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "stammtisch-app"}.cloudfunctions.net/inboundPaymentWebhook?clubId=${clubId}&secret=${webhookSecret || "DEIN_SECRET"}`}
                                            </code>
                                        </div>
                                        <p>
                                            <strong>Einrichtung:</strong> Leite PayPal-Eingangsmails über einen Mail-to-Webhook-Dienst (z. B. Make, Zapier oder Cloudflare Email Worker) als POST-JSON an diese URL weiter. Zahlungen mit <code className="text-primary">KP-...</code>-Code oder passendem Mitgliedsnamen werden automatisch gebucht.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Multi-Tenant Workspace Switcher & Club-Neuanlage */}
                    <div className="pt-4 border-t border-white/10 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <Building2 className="h-3.5 w-3.5 text-primary" />
                                Aktiver Mandant: <strong className="text-foreground">{club?.name} ({clubId})</strong>
                            </span>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2">
                            <input
                                type="text"
                                placeholder="Neuen Verein / Club gründen (Name)..."
                                value={newClubName}
                                onChange={e => setNewClubName(e.target.value)}
                                className="flex-1 text-xs py-2"
                            />
                            <button
                                onClick={handleCreateClub}
                                disabled={isCreatingClub || !newClubName.trim()}
                                className="px-4 py-2 rounded-xl bg-secondary hover:bg-white/15 border border-white/10 text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer shrink-0"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                {isCreatingClub ? "Erstelle..." : "Neuen Club anlegen"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. Einladungslinks für neue Mitglieder */}
            <ClubInviteManager />

            {/* 5. Hausregeln & Strafenkatalog */}
            <ClubRulesetEditor />
        </div>
    );
}
