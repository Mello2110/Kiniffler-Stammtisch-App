"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useClub } from "@/contexts/ClubContext";
import { useLanguage } from "@/contexts/LanguageContext";
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
    Link2,
    BookOpen
} from "lucide-react";
import { cn } from "@/lib/utils";

const THEME_PRESETS = [
    { name: "KANPAI Rosewood & Sage", primary: DEFAULT_PRIMARY_HEX, accent: DEFAULT_ACCENT_HEX },
    { name: "Terracotta & Petrol", primary: "#9E5348", accent: "#3E7B82" },
    { name: "Smaragd & Bernstein", primary: "#2E7D6B", accent: "#C98A4B" },
    { name: "Mitternacht & Kupfer", primary: "#3E5F8A", accent: "#C87A55" },
    { name: "Burgund & Goldolive", primary: "#7D3C4A", accent: "#998B4C" },
];

type StudioTab = "design" | "games" | "cash" | "invites" | "rules";

export function ClubAdminStudio() {
    const { language } = useLanguage();
    const {
        clubId,
        club,
        createNewClub,
        updateClubTheme,
        updateClubGames,
        updateClubPaymentConfig,
    } = useClub();

    const [activeTab, setActiveTab] = useState<StudioTab>("design");

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
    const [paymentSyncMode, setPaymentSyncMode] = useState<"manual_confirm" | "auto_webhook" | "imap_legacy">(
        club?.paymentConfig?.paymentSyncMode || (clubId === "club_original" ? "imap_legacy" : "manual_confirm")
    );
    const [webhookSecret, setWebhookSecret] = useState(club?.paymentConfig?.webhookSecret || "");
    const [paymentSaved, setPaymentSaved] = useState(false);

    // 4. Create New Club Form State
    const [newClubName, setNewClubName] = useState("");
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
        setPaymentSyncMode(
            club.paymentConfig?.paymentSyncMode || (club.id === "club_original" ? "imap_legacy" : "manual_confirm")
        );
        setWebhookSecret(club.paymentConfig?.webhookSecret || "");
    }, [club]);

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
        await updateClubTheme({ primaryColor, accentColor });
        setThemeSaved(true);
        setTimeout(() => setThemeSaved(false), 2500);
    };

    const toggleGame = (id: GameDisciplineId) => {
        triggerHaptic("tap");
        setEnabledGames((prev) => {
            if (prev.includes(id)) {
                if (prev.length === 1) return prev;
                const next = prev.filter((g) => g !== id);
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
            const slug = newClubName.toLowerCase().replace(/[^a-z0-9]/g, "-");
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
            triggerHaptic("success");
        } finally {
            setIsCreatingClub(false);
        }
    };

    const studioTabs: { id: StudioTab; label: string; icon: React.ReactNode }[] = [
        { id: "design", label: language === "en" ? "Theme" : "Design", icon: <Palette className="h-3.5 w-3.5" /> },
        { id: "games", label: language === "en" ? "Games" : "Spiele", icon: <Gamepad2 className="h-3.5 w-3.5" /> },
        { id: "cash", label: language === "en" ? "Treasury" : "Kasse", icon: <Wallet className="h-3.5 w-3.5" /> },
        { id: "invites", label: language === "en" ? "Invites" : "Einladen", icon: <Link2 className="h-3.5 w-3.5" /> },
        { id: "rules", label: language === "en" ? "Rules" : "Regeln", icon: <BookOpen className="h-3.5 w-3.5" /> },
    ];

    return (
        <div className="space-y-4 w-full max-w-full overflow-x-hidden">
            {/* Compact Mobile-First Studio Tab Bar */}
            <div className="grid grid-cols-5 gap-1 p-1 rounded-2xl bg-card/70 border border-white/10">
                {studioTabs.map((t) => (
                    <button
                        key={t.id}
                        type="button"
                        onClick={() => setActiveTab(t.id)}
                        className={cn(
                            "flex flex-col sm:flex-row items-center justify-center gap-1 py-2 px-1.5 sm:px-3 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer min-w-0",
                            activeTab === t.id
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                        )}
                    >
                        {t.icon}
                        <span className="truncate max-w-full">{t.label}</span>
                    </button>
                ))}
            </div>

            {/* 1. Design */}
            {activeTab === "design" && (
                <div className="rounded-2xl border border-white/10 bg-card/60 p-4 sm:p-6 space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="min-w-0">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Palette className="h-4 w-4 text-primary shrink-0" />
                                Vereins-Farbwelt (OKLCH)
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Haupt- und Akzentfarbe wählen — alle Kontraste und Flächen passen sich automatisch an.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleSaveTheme}
                            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                        >
                            {themeSaved ? <Check className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
                            {themeSaved ? "Gespeichert!" : "Design speichern"}
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                        {THEME_PRESETS.map((preset) => (
                            <button
                                key={preset.name}
                                type="button"
                                onClick={() => applyLivePreview(preset.primary, preset.accent)}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-white/10 bg-black/25 hover:bg-white/10 text-[11px] font-semibold cursor-pointer"
                            >
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: preset.primary }} />
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: preset.accent }} />
                                <span className="truncate">{preset.name}</span>
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-3.5 rounded-xl border border-white/10 bg-black/20 space-y-3 min-w-0">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="text-xs font-bold">1. Hauptfarbe</div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={primaryColor}
                                        onChange={(e) => applyLivePreview(e.target.value, accentColor)}
                                        className="w-9 h-8 rounded cursor-pointer p-0 border-0 bg-transparent"
                                    />
                                    <input
                                        type="text"
                                        value={primaryColor}
                                        onChange={(e) => applyLivePreview(e.target.value, accentColor)}
                                        className="w-24 font-mono text-xs px-2 py-1.5 rounded-lg bg-secondary border border-white/10"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-11 gap-1 h-4 rounded-lg overflow-hidden">
                                {Object.entries(previewTokens.primaryScale).map(([step, color]) => (
                                    <div key={step} style={{ backgroundColor: color }} title={`primary-${step}`} />
                                ))}
                            </div>
                        </div>

                        <div className="p-3.5 rounded-xl border border-white/10 bg-black/20 space-y-3 min-w-0">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="text-xs font-bold">2. Akzentfarbe</div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={accentColor}
                                        onChange={(e) => applyLivePreview(primaryColor, e.target.value)}
                                        className="w-9 h-8 rounded cursor-pointer p-0 border-0 bg-transparent"
                                    />
                                    <input
                                        type="text"
                                        value={accentColor}
                                        onChange={(e) => applyLivePreview(primaryColor, e.target.value)}
                                        className="w-24 font-mono text-xs px-2 py-1.5 rounded-lg bg-secondary border border-white/10"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-11 gap-1 h-4 rounded-lg overflow-hidden">
                                {Object.entries(previewTokens.accentScale).map(([step, color]) => (
                                    <div key={step} style={{ backgroundColor: color }} title={`accent-${step}`} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 2. Games */}
            {activeTab === "games" && (
                <div className="rounded-2xl border border-white/10 bg-card/60 p-4 sm:p-6 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-base sm:text-lg font-bold">
                            <Gamepad2 className="h-4 w-4 text-primary shrink-0" />
                            Aktive Spiel-Disziplinen
                        </div>
                        <button
                            type="button"
                            onClick={handleSaveGames}
                            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                        >
                            {gamesSaved ? <Check className="h-3.5 w-3.5" /> : null}
                            {gamesSaved ? "Gespeichert!" : "Disziplinen speichern"}
                        </button>
                    </div>

                    <div className="space-y-2.5">
                        {ALL_GAME_PLUGINS.map((plugin) => {
                            const active = enabledGames.includes(plugin.id);
                            const isDefault = defaultGame === plugin.id;
                            return (
                                <div
                                    key={plugin.id}
                                    onClick={() => toggleGame(plugin.id)}
                                    className={cn(
                                        "p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3",
                                        active
                                            ? "border-primary/40 bg-primary/10"
                                            : "border-white/10 bg-black/20 opacity-75"
                                    )}
                                >
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <span className="font-bold text-sm">{plugin.title}</span>
                                            {isDefault && active && (
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-bold">
                                                    Standard
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{plugin.subtitle}</p>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        {active && !isDefault && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDefaultGame(plugin.id);
                                                }}
                                                className="text-[10px] px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 font-semibold"
                                            >
                                                Standard
                                            </button>
                                        )}
                                        <div className={cn("w-10 h-5 rounded-full p-0.5 transition-colors", active ? "bg-primary" : "bg-white/20")}>
                                            <div className={cn("w-4 h-4 rounded-full bg-white transition-transform", active ? "translate-x-5" : "translate-x-0")} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* 3. Kasse & Multi-Tenant Club-Neuanlage */}
            {activeTab === "cash" && (
                <div className="rounded-2xl border border-white/10 bg-card/60 p-4 sm:p-6 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-base sm:text-lg font-bold">
                            <Wallet className="h-4 w-4 text-primary shrink-0" />
                            Kassen- &amp; PayPal-Setup
                        </div>
                        <button
                            type="button"
                            onClick={handleSavePayment}
                            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                        >
                            {paymentSaved ? <Check className="h-3.5 w-3.5" /> : null}
                            {paymentSaved ? "Gespeichert!" : "Finanz-Setup speichern"}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                PayPal.me Handle
                            </label>
                            <input
                                type="text"
                                placeholder="z.B. stammtischkasse"
                                value={paypalHandle}
                                onChange={(e) => setPaypalHandle(e.target.value)}
                                className="w-full mt-1 text-xs"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Kassen-E-Mail
                            </label>
                            <input
                                type="email"
                                placeholder="kasse@verein.de"
                                value={treasuryEmail}
                                onChange={(e) => setTreasuryEmail(e.target.value)}
                                className="w-full mt-1 text-xs"
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
                                onChange={(e) => setMonthlyContrib(Number(e.target.value))}
                                className="w-full mt-1 text-xs"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Buchungstag (Terminierung)
                            </label>
                            <select
                                value={monthlyContribDay}
                                onChange={(e) => setMonthlyContribDay(Number(e.target.value))}
                                className="w-full mt-1 text-xs"
                            >
                                <option value={1}>1. des Monats (Standard)</option>
                                <option value={15}>15. des Monats</option>
                                <option value={0}>Monatsletzter</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Zahlungs-Abgleich Modus
                            </label>
                            <select
                                value={paymentSyncMode}
                                onChange={(e) =>
                                    setPaymentSyncMode(e.target.value as "manual_confirm" | "auto_webhook" | "imap_legacy")
                                }
                                className="w-full mt-1 text-xs"
                            >
                                <option value="manual_confirm">1-Klick-Bestätigung (Standard)</option>
                                <option value="auto_webhook">Automatischer Sync (Webhook)</option>
                                {clubId === "club_original" && (
                                    <option value="imap_legacy">Stammtisch iCloud-IMAP (Bestand)</option>
                                )}
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
                                onChange={(e) => setAutoBookContribs(e.target.checked)}
                                className="h-4 w-4 accent-primary cursor-pointer"
                            />
                        </label>
                    </div>

                    {paymentSyncMode === "auto_webhook" && (
                        <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
                            <div className="flex flex-wrap gap-2">
                                <input
                                    type="text"
                                    readOnly
                                    placeholder="Webhook Secret..."
                                    value={webhookSecret}
                                    className="flex-1 min-w-0 text-xs font-mono"
                                />
                                <button
                                    type="button"
                                    onClick={() =>
                                        setWebhookSecret(
                                            `kp_wh_${Math.random().toString(36).slice(2, 12)}${Math.random().toString(36).slice(2, 8)}`
                                        )
                                    }
                                    className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold shrink-0 cursor-pointer"
                                >
                                    Secret erzeugen
                                </button>
                            </div>
                            <div className="text-[11px] text-muted-foreground break-all">
                                URL: <code>{`https://us-central1-webapp-stammtisch.cloudfunctions.net/inboundPaymentWebhook?clubId=${clubId}&secret=${webhookSecret || "DEIN_SECRET"}`}</code>
                            </div>
                        </div>
                    )}

                    {/* Neuen Verein gründen */}
                    <div className="pt-3 border-t border-white/10 space-y-2.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-primary" />
                            Aktiver Verein: <strong className="text-foreground">{club?.name}</strong>
                        </span>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <input
                                type="text"
                                placeholder="Neuen Verein / Club gründen (Name)..."
                                value={newClubName}
                                onChange={(e) => setNewClubName(e.target.value)}
                                className="flex-1 text-xs py-2"
                            />
                            <button
                                type="button"
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
            )}

            {/* 4. Einladungslinks */}
            {activeTab === "invites" && <ClubInviteManager />}

            {/* 5. Hausregeln & Strafenkatalog */}
            {activeTab === "rules" && <ClubRulesetEditor />}
        </div>
    );
}
