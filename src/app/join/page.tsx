"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
} from "firebase/auth";
import { auth, db, functions } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useClub } from "@/contexts/ClubContext";
import type { ClubInvite } from "@/types";
import {
    Beer,
    CheckCircle2,
    Loader2,
    AlertCircle,
    UserPlus,
    LogIn,
    Mail,
    Lock,
    User as UserIcon,
    LogOut,
} from "lucide-react";

export default function JoinClubPage() {
    const router = useRouter();
    const { user, loading: authLoading, confirmMembership, refreshMembership } = useAuth();
    const { switchClub } = useClub();

    const [code, setCode] = useState("");
    const [invite, setInvite] = useState<ClubInvite | null>(null);
    const [loadingInvite, setLoadingInvite] = useState(true);

    // Auth + Join form state
    const [authMode, setAuthMode] = useState<"register" | "login">("register");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
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

    const executeJoin = async (resolvedName: string) => {
        const fn = httpsCallable<{ code: string; displayName: string }, { clubId: string; clubName: string }>(
            functions,
            "joinClubByInvite"
        );
        const res = await fn({ code, displayName: resolvedName.trim() });
        setJoinedClubName(res.data.clubName);
        confirmMembership();
        refreshMembership().catch(() => {});
        await switchClub(res.data.clubId);
        setTimeout(() => {
            router.push("/dashboard");
        }, 800);
    };

    const handleJoin = async () => {
        if (!user || !isValid || isJoining) return;
        setIsJoining(true);
        setError(null);
        try {
            await executeJoin(displayName);
        } catch (err: any) {
            setError(err.message || "Beitritt fehlgeschlagen.");
        } finally {
            setIsJoining(false);
        }
    };

    const handleEmailAuthAndJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid || isJoining) return;
        setError(null);
        setIsJoining(true);

        try {
            let currentUser = auth.currentUser;
            if (authMode === "register") {
                const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
                currentUser = cred.user;
            } else {
                const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
                currentUser = cred.user;
            }

            const fallbackName =
                displayName.trim() ||
                currentUser?.displayName ||
                email.trim().split("@")[0] ||
                "Neues Mitglied";

            await executeJoin(fallbackName);
        } catch (err: any) {
            console.error("Invite auth/join error:", err);
            if (err.code === "auth/email-already-in-use") {
                setError("Diese E-Mail-Adresse hat bereits ein Konto. Wechsle oben auf 'Bereits registriert' und melde dich an.");
                setAuthMode("login");
            } else if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
                setError("Ungültige E-Mail oder falsches Passwort.");
            } else if (err.code === "auth/weak-password") {
                setError("Das Passwort muss mindestens 6 Zeichen lang sein.");
            } else {
                setError(err.message || "Anmeldung oder Beitritt fehlgeschlagen.");
            }
        } finally {
            setIsJoining(false);
        }
    };

    const handleGoogleAuth = async () => {
        if (!isValid || isJoining) return;
        setError(null);
        setIsJoining(true);
        try {
            const provider = new GoogleAuthProvider();
            const res = await signInWithPopup(auth, provider);
            if (!displayName.trim()) {
                const fallback = res.user.displayName || (res.user.email ? res.user.email.split("@")[0] : "");
                setDisplayName(fallback);
            }
        } catch (err: any) {
            if (err.code !== "auth/popup-closed-by-user") {
                setError(err.message || "Google-Anmeldung fehlgeschlagen.");
            }
        } finally {
            setIsJoining(false);
        }
    };

    const handleSwitchAccount = async () => {
        setError(null);
        await signOut(auth);
        setDisplayName("");
        setEmail("");
        setPassword("");
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-transparent text-foreground">
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
                            <div className="space-y-4 text-left pt-1">
                                {/* Mode Switch: Register vs Login */}
                                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-secondary/40 border border-white/10">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setAuthMode("register");
                                            setError(null);
                                        }}
                                        className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                            authMode === "register"
                                                ? "bg-primary text-primary-foreground"
                                                : "text-muted-foreground hover:text-foreground"
                                        }`}
                                    >
                                        Konto erstellen
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setAuthMode("login");
                                            setError(null);
                                        }}
                                        className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                            authMode === "login"
                                                ? "bg-primary text-primary-foreground"
                                                : "text-muted-foreground hover:text-foreground"
                                        }`}
                                    >
                                        Bereits registriert
                                    </button>
                                </div>

                                <form onSubmit={handleEmailAuthAndJoin} className="space-y-3">
                                    {authMode === "register" && (
                                        <div className="relative">
                                            <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <input
                                                type="text"
                                                required
                                                value={displayName}
                                                onChange={(e) => setDisplayName(e.target.value)}
                                                placeholder="Dein Name im Verein (z.B. Max)"
                                                className="w-full pl-10 pr-3 py-2.5 text-sm"
                                            />
                                        </div>
                                    )}

                                    <div className="relative">
                                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="E-Mail-Adresse"
                                            className="w-full pl-10 pr-3 py-2.5 text-sm"
                                        />
                                    </div>

                                    <div className="relative">
                                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <input
                                            type="password"
                                            required
                                            minLength={6}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Passwort (min. 6 Zeichen)"
                                            className="w-full pl-10 pr-3 py-2.5 text-sm"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isJoining}
                                        className="w-full py-3.5 px-5 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
                                    >
                                        {isJoining ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : authMode === "register" ? (
                                            <UserPlus className="h-4 w-4" />
                                        ) : (
                                            <LogIn className="h-4 w-4" />
                                        )}
                                        {isJoining
                                            ? "Trete bei..."
                                            : authMode === "register"
                                            ? "Konto erstellen & beitreten"
                                            : "Anmelden & beitreten"}
                                    </button>
                                </form>

                                <div className="relative flex items-center py-1">
                                    <div className="flex-grow border-t border-white/10" />
                                    <span className="mx-3 text-[11px] uppercase tracking-wider text-muted-foreground">oder</span>
                                    <div className="flex-grow border-t border-white/10" />
                                </div>

                                <button
                                    type="button"
                                    onClick={handleGoogleAuth}
                                    disabled={isJoining}
                                    className="w-full py-3 px-5 rounded-xl bg-white text-gray-800 hover:bg-gray-100 font-semibold text-sm transition-all shadow flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                                >
                                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                                        <path
                                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                            fill="#4285F4"
                                        />
                                        <path
                                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                            fill="#34A853"
                                        />
                                        <path
                                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                            fill="#FBBC05"
                                        />
                                        <path
                                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                            fill="#EA4335"
                                        />
                                    </svg>
                                    Mit Google fortfahren
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4 text-left pt-2">
                                <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-black/25 border border-white/10 text-xs">
                                    <span className="text-muted-foreground truncate">
                                        Angemeldet als <strong className="text-foreground">{user.email}</strong>
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleSwitchAccount}
                                        className="inline-flex items-center gap-1 text-primary hover:underline font-semibold shrink-0 cursor-pointer"
                                    >
                                        <LogOut className="h-3 w-3" />
                                        Anderes Konto
                                    </button>
                                </div>

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
