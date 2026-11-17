"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useClub } from "@/contexts/ClubContext";
import type { ClubInvite } from "@/types";
import { Beer, CheckCircle2, Loader2, AlertCircle, UserPlus, LogIn } from "lucide-react";

export default function JoinClubPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { switchClub } = useClub();

    const [code, setCode] = useState("");
    const [invite, setInvite] = useState<ClubInvite | null>(null);
    const [loadingInvite, setLoadingInvite] = useState(true);
    const [displayName, setDisplayName] = useState("");
    const [isJoining, setIsJoining] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [joinedClubName, setJoinedClubName] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const c = (params.get("code") || "").trim().toUpperCase();
            setCode(c);
            if (!c) {
                setLoadingInvite(false);
                setError("Kein Einladungscode angegeben.");
            }
        }
    }, []);

    useEffect(() => {
        const fetchInvite = async () => {
            if (!code) return;
            setLoadingInvite(true);
            try {
                const snap = await getDoc(doc(db, "club_invites", code));
                if (snap.exists()) {
                    setInvite(snap.data() as ClubInvite);
                } else {
                    setError("Dieser Einladungslink ist ungültig oder wurde widerrufen.");
                }
            } catch (err: any) {
                setError(err.message || "Einladung konnte nicht geladen werden.");
            } finally {
                setLoadingInvite(false);
            }
        };
        fetchInvite();
    }, [code]);

    useEffect(() => {
        if (user && !displayName) {
            const fallback = user.displayName || (user.email ? user.email.split("@")[0] : "");
            setDisplayName(fallback);
        }
    }, [user, displayName]);

    const isExpired =
        invite?.expiresAt &&
        typeof invite.expiresAt.toDate === "function" &&
        invite.expiresAt.toDate() < new Date();
    const isLimitReached =
        typeof invite?.maxUses === "number" &&
        invite.maxUses > 0 &&
        (invite.usedCount || 0) >= invite.maxUses;
    const isValid = !!invite && invite.active && !isExpired && !isLimitReached;

    const handleJoin = async () => {
        if (!user || !isValid) return;
        setIsJoining(true);
        setError(null);
        try {
            const fn = httpsCallable<{ code: string; displayName: string }, { clubId: string; clubName: string }>(
                functions,
                "joinClubByInvite"
            );
            const res = await fn({ code, displayName: displayName.trim() });
            setJoinedClubName(res.data.clubName);
            await switchClub(res.data.clubId);
            setTimeout(() => {
                router.push("/dashboard");
            }, 900);
        } catch (err: any) {
            setError(err.message || "Beitritt fehlgeschlagen.");
        } finally {
            setIsJoining(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background text-foreground">
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-card/85 backdrop-blur-xl p-6 sm:p-8 shadow-2xl space-y-6 text-center">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
                    <Beer className="h-7 w-7" />
                </div>

                {loadingInvite || authLoading ? (
                    <div className="py-8 flex flex-col items-center gap-3 text-muted-foreground">
                        <Loader2 className="h-7 w-7 animate-spin text-primary" />
                        <span className="text-sm">Einladung wird geprüft...</span>
                    </div>
                ) : joinedClubName ? (
                    <div className="py-4 space-y-3">
                        <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto" />
                        <h1 className="text-2xl font-bold text-[#F5F0EB]">Willkommen bei {joinedClubName}!</h1>
                        <p className="text-sm text-muted-foreground">Du wirst direkt zum Dashboard weitergeleitet...</p>
                    </div>
                ) : !isValid ? (
                    <div className="space-y-4">
                        <AlertCircle className="h-10 w-10 text-red-400 mx-auto" />
                        <h1 className="text-xl font-bold">Einladung nicht gültig</h1>
                        <p className="text-sm text-muted-foreground">
                            {error ||
                                (isExpired
                                    ? "Dieser Einladungslink ist leider abgelaufen."
                                    : isLimitReached
                                    ? "Das Nutzungslimit dieses Einladungslinks wurde erreicht."
                                    : "Dieser Einladungslink wurde deaktiviert.")}
                        </p>
                        <Link
                            href="/login"
                            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold"
                        >
                            Zur Anmeldung
                        </Link>
                    </div>
                ) : (
                    <>
                        <div className="space-y-2">
                            <span className="text-[11px] uppercase tracking-widest font-bold text-primary">
                                Vereins-Einladung
                            </span>
                            <h1 className="text-2xl sm:text-3xl font-black text-[#F5F0EB] outfit">
                                {invite.clubName}
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Du wurdest eingeladen, diesem Verein auf KANPAI beizutreten.
                            </p>
                        </div>

                        {error && (
                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 text-left">
                                {error}
                            </div>
                        )}

                        {!user ? (
                            <div className="space-y-3 pt-2">
                                <Link
                                    href={`/login?redirect=${encodeURIComponent(`/join?code=${code}`)}`}
                                    className="w-full py-3.5 px-5 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 shadow-lg hover:opacity-90 transition-opacity"
                                >
                                    <LogIn className="h-4 w-4" />
                                    Anmelden / Konto erstellen &amp; beitreten
                                </Link>
                                <p className="text-[11px] text-muted-foreground">
                                    Nach dem Login wirst du automatisch hierher zurückgeleitet.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4 text-left pt-2">
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        Dein Name im Verein
                                    </label>
                                    <input
                                        type="text"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        placeholder="z.B. Max Mustermann"
                                        className="w-full mt-1"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleJoin}
                                    disabled={isJoining || !displayName.trim()}
                                    className="w-full py-3.5 px-5 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
                                >
                                    {isJoining ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                                    {isJoining ? "Trete bei..." : "Jetzt Verein beitreten"}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
