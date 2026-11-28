"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Loader2, Mail, Lock, AlertCircle, ArrowLeft, ShieldAlert, Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function LoginPage() {
    const { loginWithGoogle, refreshMembership } = useAuth();
    const { dict } = useLanguage();
    const router = useRouter();

    const [showEmailForm, setShowEmailForm] = useState(false);
    const [isRegisterMode, setIsRegisterMode] = useState(false);
    const [redirectUrl, setRedirectUrl] = useState<string>("/dashboard");
    const [isInviteFlow, setIsInviteFlow] = useState(false);
    const [isOnboardingFlow, setIsOnboardingFlow] = useState(false);
    const [email, setEmail] = useState("");

    useEffect(() => {
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const r = params.get("redirect");
            const mode = params.get("mode");
            if (r && r.startsWith("/join")) {
                setRedirectUrl(r);
                setIsInviteFlow(true);
                setIsOnboardingFlow(false);
            } else if ((r && r.startsWith("/onboarding")) || mode === "register") {
                setRedirectUrl(r && r.startsWith("/onboarding") ? r : "/onboarding");
                setIsOnboardingFlow(true);
                setIsInviteFlow(false);
                setIsRegisterMode(true);
            }
        }
    }, []);
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [resetMessage, setResetMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handlePasswordReset = async () => {
        setError("");
        setResetMessage("");
        if (!email.trim()) {
            setError("Bitte gib zuerst deine E-Mail-Adresse ein.");
            return;
        }
        setIsLoading(true);
        try {
            await sendPasswordResetEmail(auth, email.trim());
            setResetMessage("Wir haben dir eine E-Mail zum Zurücksetzen deines Passworts gesendet.");
        } catch (err: any) {
            setError(err?.message || "Passwort-Reset fehlgeschlagen.");
        } finally {
            setIsLoading(false);
        }
    };

    const canRegister = isInviteFlow || isOnboardingFlow;

    const handleGoogleLogin = async () => {
        setError("");
        setIsLoading(true);
        try {
            const target = canRegister ? redirectUrl : undefined;
            await loginWithGoogle(target);
        } catch (err: any) {
            console.error("Google login failed:", err);
            if (err.code !== "auth/popup-closed-by-user") {
                setError(dict?.auth?.errors?.default || "Anmeldung mit Google fehlgeschlagen.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            if (isRegisterMode && canRegister) {
                await createUserWithEmailAndPassword(auth, email, password);
                await refreshMembership();
                router.push(redirectUrl);
                return;
            }

            await signInWithEmailAndPassword(auth, email, password);
            const hasMembership = await refreshMembership();

            if (canRegister) {
                router.push(redirectUrl);
                return;
            }

            if (!hasMembership) {
                router.push("/onboarding");
                return;
            }

            router.push("/dashboard");
        } catch (err: any) {
            console.error("Auth error:", err);
            if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
                setError(dict?.auth?.errors?.invalid || "Ungültige Anmeldedaten");
            } else if (err.code === "auth/email-already-in-use") {
                setError("Diese E-Mail-Adresse wird bereits verwendet. Bitte melde dich stattdessen an.");
            } else if (err.code === "auth/weak-password") {
                setError("Das Passwort muss mindestens 6 Zeichen lang sein.");
            } else {
                setError(dict?.auth?.errors?.default || "Ein Fehler ist aufgetreten");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center relative overflow-hidden bg-background text-foreground pb-16">
            {/* Background Decor */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/20 blur-[120px] rounded-full pointer-events-none opacity-50" />

            <div className="z-10 flex flex-col items-center text-center px-4 md:px-6 w-full max-w-md animate-in fade-in zoom-in duration-700">

                {/* Icon */}
                <div className="relative mb-8 group">
                    <div className="absolute -inset-1 bg-primary/40 rounded-full blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
                    <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-secondary/50 shadow-2xl">
                        <Image
                            src="/landing-icon.jpg"
                            alt="KANPAI App Icon"
                            fill
                            className="object-cover"
                            priority
                        />
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-4xl md:text-5xl font-heading font-bold mb-3 tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400">
                    KANPAI
                </h1>

                {/* Slogan */}
                <p className="text-lg md:text-xl font-sans text-muted-foreground mb-6">
                    {isOnboardingFlow
                        ? "Neuen Verein gründen"
                        : showEmailForm
                        ? "Willkommen zurück"
                        : "Anmelden um fortzufahren"}
                </p>

                {/* Notice banner */}
                <div className="mb-6 flex items-center justify-center gap-2 text-xs text-muted-foreground bg-secondary/30 py-2 px-3.5 rounded-full border border-secondary/50">
                    {isInviteFlow ? (
                        <ShieldAlert className="w-4 h-4 shrink-0 text-emerald-400" />
                    ) : isOnboardingFlow ? (
                        <Sparkles className="w-4 h-4 shrink-0 text-primary" />
                    ) : (
                        <ShieldAlert className="w-4 h-4 shrink-0 text-amber-500" />
                    )}
                    <span>
                        {isInviteFlow
                            ? "Vereins-Einladung erkannt – anmelden oder Konto erstellen"
                            : isOnboardingFlow
                            ? "Konto erstellen oder anmelden, um deinen Verein einzurichten"
                            : "Beitritt zu bestehenden Vereinen nur per Einladungslink"}
                    </span>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="w-full mb-4 flex items-center gap-2 p-3 text-sm text-red-400 bg-red-950/20 border border-red-900/50 rounded-lg text-left">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}
                {resetMessage && (
                    <div className="w-full mb-4 p-3 text-sm text-emerald-300 bg-emerald-950/20 border border-emerald-900/50 rounded-lg text-left">
                        {resetMessage}
                    </div>
                )}

                {/* --- LOGIN CONTENT --- */}
                {!showEmailForm ? (
                    /* INITIAL STATE: 2 BIG BUTTONS */
                    <div className="flex flex-col gap-4 w-full">
                        {/* Button 1: Email */}
                        <button
                            onClick={() => setShowEmailForm(true)}
                            className="w-full px-8 py-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-lg transition-all shadow-lg hover:shadow-primary/25 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <Mail className="w-5 h-5" />
                            {isOnboardingFlow && isRegisterMode ? "Mit E-Mail registrieren" : "Mit E-Mail anmelden"}
                        </button>

                        {/* Button 2: Google */}
                        <button
                            onClick={handleGoogleLogin}
                            disabled={isLoading}
                            className="w-full px-8 py-4 rounded-xl bg-white text-gray-800 hover:bg-gray-100 font-semibold text-lg transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                        >
                            <svg className="h-5 w-5" viewBox="0 0 24 24">
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
                            {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : "Mit Google fortfahren"}
                        </button>

                        {!canRegister && (
                            <div className="pt-2 space-y-2 text-xs text-muted-foreground">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsOnboardingFlow(true);
                                        setIsRegisterMode(true);
                                        setRedirectUrl("/onboarding");
                                        setError("");
                                    }}
                                    className="min-h-[44px] inline-flex items-center justify-center px-3 text-primary hover:underline font-semibold cursor-pointer"
                                >
                                    Noch keinen Verein? Neuen Verein gründen &rarr;
                                </button>
                                <p className="opacity-75">
                                    Du wurdest eingeladen? Öffne direkt den Einladungslink deines Vereins.
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    /* EXPANDED EMAIL FORM */
                    <form onSubmit={handleSubmit} className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {canRegister && (
                            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-secondary/40 border border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setIsRegisterMode(false)}
                                    className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${!isRegisterMode ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                                >
                                    Anmelden
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsRegisterMode(true)}
                                    className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${isRegisterMode ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                                >
                                    Konto erstellen
                                </button>
                            </div>
                        )}
                        {/* Email Input */}
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="E-Mail Adresse"
                                className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-secondary/50 bg-secondary/20 backdrop-blur-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                            />
                        </div>

                        {/* Password Input */}
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <input
                                type="password"
                                required
                                minLength={6}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Passwort (min. 6 Zeichen)"
                                className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-secondary/50 bg-secondary/20 backdrop-blur-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                            />
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full px-8 py-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-lg transition-all shadow-lg hover:shadow-primary/25 active:scale-95 flex items-center justify-center cursor-pointer"
                        >
                            {isLoading ? (
                                <Loader2 className="animate-spin h-5 w-5" />
                            ) : isRegisterMode && canRegister ? (
                                "Konto erstellen & weiter"
                            ) : (
                                "Anmelden"
                            )}
                        </button>

                        {/* Back Link */}
                        <div className="flex flex-col gap-1 mt-3 text-sm font-medium">
                            {!(isRegisterMode && canRegister) && (
                                <button
                                    type="button"
                                    onClick={handlePasswordReset}
                                    disabled={isLoading}
                                    className="min-h-[44px] inline-flex items-center justify-center px-3 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                                >
                                    Passwort vergessen?
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setShowEmailForm(false)}
                                className="min-h-[44px] text-muted-foreground hover:text-foreground inline-flex items-center justify-center gap-1.5 px-3 transition-colors cursor-pointer"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" /> Zurück
                            </button>
                            {!canRegister && (
                                <Link
                                    href="/login?mode=register&redirect=/onboarding"
                                    onClick={() => {
                                        setIsOnboardingFlow(true);
                                        setIsRegisterMode(true);
                                        setRedirectUrl("/onboarding");
                                        setError("");
                                    }}
                                    className="min-h-[44px] inline-flex items-center justify-center px-3 text-xs text-primary hover:underline"
                                >
                                    Noch keinen Verein? Neuen Verein gründen &rarr;
                                </Link>
                            )}
                        </div>
                    </form>
                )}

            </div>

            <footer className="absolute bottom-6 text-sm text-muted-foreground opacity-60">
                &copy; 2025 KANPAI App
            </footer>
        </div>
    );
}
