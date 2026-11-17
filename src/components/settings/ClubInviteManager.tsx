"use client";

import React, { useEffect, useState } from "react";
import { collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, setDoc, Timestamp, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useClub } from "@/contexts/ClubContext";
import { triggerHaptic } from "@/lib/haptics";
import type { ClubInvite } from "@/types";
import { Check, Copy, Link2, Plus, Trash2, Users } from "lucide-react";

export function ClubInviteManager() {
    const { user } = useAuth();
    const { clubId, club } = useClub();
    const [invites, setInvites] = useState<ClubInvite[]>([]);
    const [expiryDays, setExpiryDays] = useState<number>(30);
    const [maxUses, setMaxUses] = useState<string>("");
    const [isCreating, setIsCreating] = useState(false);
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    useEffect(() => {
        if (!clubId) return;
        const q = query(collection(db, "club_invites"), where("clubId", "==", clubId));
        const unsub = onSnapshot(
            q,
            (snap) => {
                const list = snap.docs.map((d) => d.data() as ClubInvite);
                setInvites(list);
            },
            () => {
                setInvites([]);
            }
        );
        return () => unsub();
    }, [clubId]);

    const handleCreateInvite = async () => {
        if (!user || !club) return;
        setIsCreating(true);
        triggerHaptic("success");
        try {
            const slugPart = (club.slug || "CLUB").replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase();
            const randPart = Math.random().toString(36).slice(2, 7).toUpperCase();
            const code = `${slugPart}-${randPart}`;

            const expiresAt =
                expiryDays > 0
                    ? Timestamp.fromDate(new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000))
                    : null;
            const parsedMax = parseInt(maxUses, 10);

            const payload: ClubInvite = {
                code,
                clubId,
                clubName: club.name,
                createdBy: user.uid,
                createdAt: serverTimestamp(),
                expiresAt,
                maxUses: !isNaN(parsedMax) && parsedMax > 0 ? parsedMax : null,
                usedCount: 0,
                active: true,
            };
            await setDoc(doc(db, "club_invites", code), payload);
            setMaxUses("");
        } finally {
            setIsCreating(false);
        }
    };

    const handleCopy = (code: string) => {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const url = `${origin}/join?code=${code}`;
        navigator.clipboard?.writeText(url);
        setCopiedCode(code);
        triggerHaptic("tap");
        setTimeout(() => setCopiedCode(null), 2000);
    };

    const handleDelete = async (code: string) => {
        await deleteDoc(doc(db, "club_invites", code));
        triggerHaptic("tap");
    };

    return (
        <div className="rounded-3xl border border-white/10 bg-card/60 p-5 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2 text-lg font-bold">
                        <Link2 className="h-5 w-5 text-primary" />
                        Mitglieder-Einladungslinks
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Erstelle einen Einladungslink für neue Mitglieder. Nach Anmeldung/Registrierung treten sie direkt diesem Verein bei.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end p-3.5 rounded-2xl bg-black/20 border border-white/10">
                <div className="sm:col-span-4">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Gültigkeit
                    </label>
                    <select
                        value={expiryDays}
                        onChange={(e) => setExpiryDays(Number(e.target.value))}
                        className="w-full mt-1 text-xs"
                    >
                        <option value={7}>7 Tage</option>
                        <option value={30}>30 Tage</option>
                        <option value={0}>Unbegrenzt</option>
                    </select>
                </div>
                <div className="sm:col-span-4">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Max. Beitritte (optional)
                    </label>
                    <input
                        type="number"
                        min={1}
                        placeholder="Unbegrenzt"
                        value={maxUses}
                        onChange={(e) => setMaxUses(e.target.value)}
                        className="w-full mt-1 text-xs"
                    />
                </div>
                <div className="sm:col-span-4">
                    <button
                        type="button"
                        onClick={handleCreateInvite}
                        disabled={isCreating}
                        className="w-full py-2.5 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        {isCreating ? "Erstelle..." : "Einladungslink erzeugen"}
                    </button>
                </div>
            </div>

            {invites.length > 0 && (
                <div className="space-y-2">
                    {invites.map((inv) => (
                        <div
                            key={inv.code}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-black/25 border border-white/10"
                        >
                            <div className="min-w-0">
                                <div className="font-mono text-xs sm:text-sm font-bold text-[#F5F0EB] truncate">
                                    /join?code={inv.code}
                                </div>
                                <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                                    <span className="inline-flex items-center gap-1">
                                        <Users className="h-3 w-3" />
                                        {inv.usedCount || 0}
                                        {inv.maxUses ? ` / ${inv.maxUses}` : ""} genutzt
                                    </span>
                                    <span>•</span>
                                    <span>
                                        {inv.expiresAt && typeof inv.expiresAt.toDate === "function"
                                            ? `Bis ${inv.expiresAt.toDate().toLocaleDateString("de-DE")}`
                                            : "Unbegrenzt gültig"}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => handleCopy(inv.code)}
                                    className="px-3 py-1.5 rounded-xl bg-primary/15 hover:bg-primary/25 text-primary text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                                >
                                    {copiedCode === inv.code ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                    {copiedCode === inv.code ? "Kopiert!" : "Link kopieren"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDelete(inv.code)}
                                    className="p-2 rounded-xl text-muted-foreground hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
                                    title="Einladung widerrufen"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
