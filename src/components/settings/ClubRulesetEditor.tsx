"use client";

import React, { useEffect, useState } from "react";
import { useClub } from "@/contexts/ClubContext";
import { DEFAULT_CLUB_RULESET } from "@/lib/defaultRuleset";
import { triggerHaptic } from "@/lib/haptics";
import type { ClubRulesetConfig, CustomPenaltyCatalogItem, GameDisciplineId } from "@/types";
import { BookOpen, Check, Plus, RotateCcw, Trash2, Coins, Dices, Flame, CircleDot } from "lucide-react";
import { cn } from "@/lib/utils";

type RulesTab = GameDisciplineId | "catalog";

export function ClubRulesetEditor() {
    const { club, updateClubRuleset } = useClub();
    const [activeTab, setActiveTab] = useState<RulesTab>("kniffel");
    const [ruleset, setRuleset] = useState<ClubRulesetConfig>(club?.ruleset || DEFAULT_CLUB_RULESET);
    const [saved, setSaved] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Neuer Strafenkatalog-Eintrag
    const [newLabel, setNewLabel] = useState("");
    const [newAmount, setNewAmount] = useState("1.00");
    const [newGameType, setNewGameType] = useState<GameDisciplineId | "general">("general");

    useEffect(() => {
        if (club?.ruleset) {
            setRuleset(club.ruleset);
        }
    }, [club?.ruleset]);

    const handleSave = async () => {
        setIsSaving(true);
        triggerHaptic("success");
        try {
            await updateClubRuleset(ruleset);
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } finally {
            setIsSaving(false);
        }
    };

    const handleResetDefaults = () => {
        triggerHaptic("tap");
        setRuleset(DEFAULT_CLUB_RULESET);
    };

    const handleAddCatalogItem = () => {
        const trimmed = newLabel.trim();
        const amount = Math.max(0, parseFloat(newAmount) || 0);
        if (!trimmed) return;
        const item: CustomPenaltyCatalogItem = {
            id: `pen_${Date.now()}`,
            label: trimmed,
            amountEur: amount,
            gameType: newGameType,
        };
        setRuleset((prev) => ({
            ...prev,
            customPenaltyCatalog: [...prev.customPenaltyCatalog, item],
        }));
        setNewLabel("");
        setNewAmount("1.00");
        triggerHaptic("tap");
    };

    const handleRemoveCatalogItem = (id: string) => {
        setRuleset((prev) => ({
            ...prev,
            customPenaltyCatalog: prev.customPenaltyCatalog.filter((item) => item.id !== id),
        }));
    };

    const tabs: { id: RulesTab; label: string; icon: React.ReactNode }[] = [
        { id: "kniffel", label: "Kniffeln", icon: <Dices className="h-3.5 w-3.5" /> },
        { id: "schocken", label: "Schocken", icon: <Flame className="h-3.5 w-3.5" /> },
        { id: "kegeln", label: "Kegeln", icon: <CircleDot className="h-3.5 w-3.5" /> },
        { id: "catalog", label: "Strafenkatalog", icon: <Coins className="h-3.5 w-3.5" /> },
    ];

    return (
        <div className="rounded-3xl border border-white/10 bg-card/60 p-5 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2 text-lg font-bold">
                        <BookOpen className="h-5 w-5 text-primary shrink-0" />
                        Hausregeln &amp; Strafenkatalog
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Lege fest, wie Saison-Matrix-Punkte, Boni und automatische Strafen für Kniffeln, Schocken &amp; Kegeln berechnet werden.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={handleResetDefaults}
                        className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Stammtisch-Standard
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                    >
                        {saved ? <Check className="h-3.5 w-3.5" /> : null}
                        {saved ? "Gespeichert!" : isSaving ? "Speichere..." : "Regelwerk speichern"}
                    </button>
                </div>
            </div>

            {/* Segmented Tab Switcher */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1 rounded-2xl bg-black/25 border border-white/10">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer",
                            activeTab === tab.id
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                        )}
                    >
                        {tab.icon}
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Kniffeln */}
            {activeTab === "kniffel" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="sm:col-span-2 lg:col-span-3">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Platzierungs-Wertung (Saison-Matrix)
                        </label>
                        <select
                            value={ruleset.kniffel.placementMode}
                            onChange={(e) =>
                                setRuleset((p) => ({
                                    ...p,
                                    kniffel: {
                                        ...p.kniffel,
                                        placementMode: e.target.value as "dynamic_participants" | "fixed_top3",
                                    },
                                }))
                            }
                            className="w-full mt-1"
                        >
                            <option value="dynamic_participants">Dynamisch nach Teilnehmerzahl (N bis 1 Punkt – Stammtisch Original)</option>
                            <option value="fixed_top3">Fix Top 3 (3 / 2 / 1 Punkte)</option>
                        </select>
                    </div>

                    <RuleNumberInput
                        label="Kniffel-Bonus (Matrix-Pkt)"
                        value={ruleset.kniffel.kniffelBonusPoints}
                        onChange={(v) => setRuleset((p) => ({ ...p, kniffel: { ...p.kniffel, kniffelBonusPoints: v } }))}
                    />
                    <RuleNumberInput
                        label="Höchste Chance (Matrix-Pkt)"
                        value={ruleset.kniffel.highestChanceBonusPoints}
                        onChange={(v) => setRuleset((p) => ({ ...p, kniffel: { ...p.kniffel, highestChanceBonusPoints: v } }))}
                    />
                    <RuleNumberInput
                        label="Niedrigste Chance (Matrix-Pkt)"
                        value={ruleset.kniffel.lowestChanceBonusPoints}
                        onChange={(v) => setRuleset((p) => ({ ...p, kniffel: { ...p.kniffel, lowestChanceBonusPoints: v } }))}
                    />
                    <RuleNumberInput
                        label="Oberer Block Schwelle"
                        value={ruleset.kniffel.upperBonusThreshold}
                        onChange={(v) => setRuleset((p) => ({ ...p, kniffel: { ...p.kniffel, upperBonusThreshold: v } }))}
                    />
                    <RuleNumberInput
                        label="Oberer Block Bonus"
                        value={ruleset.kniffel.upperBonusScore}
                        onChange={(v) => setRuleset((p) => ({ ...p, kniffel: { ...p.kniffel, upperBonusScore: v } }))}
                    />
                    <RuleNumberInput
                        label="Strich-Strafe (€)"
                        step="0.5"
                        value={ruleset.kniffel.strokePenaltyEur}
                        onChange={(v) => setRuleset((p) => ({ ...p, kniffel: { ...p.kniffel, strokePenaltyEur: v } }))}
                    />
                </div>
            )}

            {/* Schocken */}
            {activeTab === "schocken" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Platzierungs-Wertung (Saison-Matrix)
                        </label>
                        <select
                            value={ruleset.schocken.placementMode}
                            onChange={(e) =>
                                setRuleset((p) => ({
                                    ...p,
                                    schocken: {
                                        ...p.schocken,
                                        placementMode: e.target.value as "dynamic_participants" | "fixed_top3",
                                    },
                                }))
                            }
                            className="w-full mt-1"
                        >
                            <option value="dynamic_participants">Dynamisch nach Teilnehmerzahl (N bis 1 Punkt)</option>
                            <option value="fixed_top3">Fix Top 3 (3 / 2 / 1 Punkte)</option>
                        </select>
                    </div>

                    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                        <div>
                            <div className="text-xs font-bold">Jule (4-2-1) aktiv</div>
                            <div className="text-[11px] text-muted-foreground">Zählt als 7 Deckel</div>
                        </div>
                        <input
                            type="checkbox"
                            checked={ruleset.schocken.juleEnabled}
                            onChange={(e) =>
                                setRuleset((p) => ({ ...p, schocken: { ...p.schocken, juleEnabled: e.target.checked } }))
                            }
                            className="h-4 w-4 accent-primary cursor-pointer"
                        />
                    </div>

                    <RuleNumberInput
                        label="Deckel im Stock"
                        value={ruleset.schocken.stockCoasters}
                        onChange={(v) => setRuleset((p) => ({ ...p, schocken: { ...p.schocken, stockCoasters: v } }))}
                    />
                    <RuleNumberInput
                        label="Schock-Out Bonus (Matrix-Pkt)"
                        value={ruleset.schocken.schockOutMatrixBonusPoints}
                        onChange={(v) =>
                            setRuleset((p) => ({ ...p, schocken: { ...p.schocken, schockOutMatrixBonusPoints: v } }))
                        }
                    />
                    <RuleNumberInput
                        label="0 Hälften Bonus (Matrix-Pkt)"
                        value={ruleset.schocken.cleanSheetMatrixBonusPoints}
                        onChange={(v) =>
                            setRuleset((p) => ({ ...p, schocken: { ...p.schocken, cleanSheetMatrixBonusPoints: v } }))
                        }
                    />
                    <RuleNumberInput
                        label="Hälfte verloren (€)"
                        step="0.5"
                        value={ruleset.schocken.halfLossPenaltyEur}
                        onChange={(v) =>
                            setRuleset((p) => ({ ...p, schocken: { ...p.schocken, halfLossPenaltyEur: v } }))
                        }
                    />
                    <RuleNumberInput
                        label="Finale verloren (€)"
                        step="0.5"
                        value={ruleset.schocken.finalLossPenaltyEur}
                        onChange={(v) =>
                            setRuleset((p) => ({ ...p, schocken: { ...p.schocken, finalLossPenaltyEur: v } }))
                        }
                    />
                    <RuleNumberInput
                        label="Doppelte Hälfte / Bock (€)"
                        step="0.5"
                        value={ruleset.schocken.doubleHalfLossPenaltyEur}
                        onChange={(v) =>
                            setRuleset((p) => ({ ...p, schocken: { ...p.schocken, doubleHalfLossPenaltyEur: v } }))
                        }
                    />
                </div>
            )}

            {/* Kegeln */}
            {activeTab === "kegeln" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Platzierungs-Wertung (Saison-Matrix)
                        </label>
                        <select
                            value={ruleset.kegeln.placementMode}
                            onChange={(e) =>
                                setRuleset((p) => ({
                                    ...p,
                                    kegeln: {
                                        ...p.kegeln,
                                        placementMode: e.target.value as "dynamic_participants" | "fixed_top3",
                                    },
                                }))
                            }
                            className="w-full mt-1"
                        >
                            <option value="dynamic_participants">Dynamisch nach Teilnehmerzahl (N bis 1 Punkt)</option>
                            <option value="fixed_top3">Fix Top 3 (3 / 2 / 1 Punkte)</option>
                        </select>
                    </div>

                    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                        <div>
                            <div className="text-xs font-bold">Pudel automatisch buchen</div>
                            <div className="text-[11px] text-muted-foreground">Bei Übergabe an Saison</div>
                        </div>
                        <input
                            type="checkbox"
                            checked={ruleset.kegeln.autoBookPudelPenalty}
                            onChange={(e) =>
                                setRuleset((p) => ({
                                    ...p,
                                    kegeln: { ...p.kegeln, autoBookPudelPenalty: e.target.checked },
                                }))
                            }
                            className="h-4 w-4 accent-primary cursor-pointer"
                        />
                    </div>

                    <RuleNumberInput
                        label="Alle Neune Bonus (Matrix-Pkt)"
                        value={ruleset.kegeln.alleNeuneMatrixBonusPoints}
                        onChange={(v) =>
                            setRuleset((p) => ({ ...p, kegeln: { ...p.kegeln, alleNeuneMatrixBonusPoints: v } }))
                        }
                    />
                    <RuleNumberInput
                        label="Kranz Bonus (Matrix-Pkt)"
                        value={ruleset.kegeln.kranzMatrixBonusPoints}
                        onChange={(v) =>
                            setRuleset((p) => ({ ...p, kegeln: { ...p.kegeln, kranzMatrixBonusPoints: v } }))
                        }
                    />
                    <RuleNumberInput
                        label="Pudel-Strafe (€)"
                        step="0.5"
                        value={ruleset.kegeln.pudelPenaltyEur}
                        onChange={(v) => setRuleset((p) => ({ ...p, kegeln: { ...p.kegeln, pudelPenaltyEur: v } }))}
                    />
                    <RuleNumberInput
                        label="Pudel-König Strafe (€)"
                        step="0.5"
                        value={ruleset.kegeln.pudelKingPenaltyEur}
                        onChange={(v) => setRuleset((p) => ({ ...p, kegeln: { ...p.kegeln, pudelKingPenaltyEur: v } }))}
                    />
                </div>
            )}

            {/* Custom Penalty Catalog */}
            {activeTab === "catalog" && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end p-3 rounded-2xl bg-black/20 border border-white/10">
                        <div className="sm:col-span-5">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                Grund / Vergehen
                            </label>
                            <input
                                type="text"
                                placeholder="z.B. Würfel vom Tisch gefallen"
                                value={newLabel}
                                onChange={(e) => setNewLabel(e.target.value)}
                                className="w-full mt-1 text-xs"
                            />
                        </div>
                        <div className="sm:col-span-3">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                Disziplin
                            </label>
                            <select
                                value={newGameType}
                                onChange={(e) => setNewGameType(e.target.value as GameDisciplineId | "general")}
                                className="w-full mt-1 text-xs"
                            >
                                <option value="general">Allgemein</option>
                                <option value="kniffel">Kniffeln</option>
                                <option value="schocken">Schocken</option>
                                <option value="kegeln">Kegeln</option>
                            </select>
                        </div>
                        <div className="sm:col-span-2">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                Betrag (€)
                            </label>
                            <input
                                type="number"
                                step="0.5"
                                min={0}
                                value={newAmount}
                                onChange={(e) => setNewAmount(e.target.value)}
                                className="w-full mt-1 text-xs"
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <button
                                type="button"
                                onClick={handleAddCatalogItem}
                                disabled={!newLabel.trim()}
                                className="w-full py-2 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Hinzufügen
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {ruleset.customPenaltyCatalog.map((item) => (
                            <div
                                key={item.id}
                                className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-black/25 border border-white/10"
                            >
                                <div className="min-w-0">
                                    <div className="text-xs font-bold truncate">{item.label}</div>
                                    <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                                        <span className="uppercase tracking-wider">{item.gameType}</span>
                                        <span>•</span>
                                        <span className="text-accent font-semibold">{item.amountEur.toFixed(2)} €</span>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveCatalogItem(item.id)}
                                    className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 cursor-pointer shrink-0"
                                    title="Eintrag entfernen"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function RuleNumberInput({
    label,
    value,
    onChange,
    step = "1",
}: {
    label: string;
    value: number;
    onChange: (val: number) => void;
    step?: string;
}) {
    return (
        <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</label>
            <input
                type="number"
                step={step}
                min={0}
                value={value}
                onChange={(e) => onChange(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1"
            />
        </div>
    );
}
