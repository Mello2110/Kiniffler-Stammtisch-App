"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Loader2, Mail, Lock, AlertCircle, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function LoginPage() {
    const { loginWithGoogle } = useAuth();
    const { dict } = useLanguage();
    const router = useRouter();

    const [isRegistering, setIsRegistering] = useState(false);
    const [showEmailForm, setShowEmailForm] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            if (isRegistering) {
                await createUserWithEmailAndPassword(auth, email, password);
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
            router.push("/dashboard");
        } catch (err: any) {
            console.error("Auth error:", err);
            // Simple mapping for common errors
            if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
                setError(dict?.auth?.errors?.invalid || "Invalid credentials");
            } else if (err.code === "auth/email-already-in-use") {
                setError(dict?.auth?.errors?.emailInUse || "Email already in use");
            } else if (err.code === "auth/weak-password") {
                setError(dict?.auth?.errors?.weakPass || "Password too weak");
            } else {
                setError(dict?.auth?.errors?.default || "An error occurred");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden bg-background text-foreground">
            {/* --- VISUALS COPIED FROM LANDING PAGE --- */}
            {/* Background Decor */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/20 blur-[120px] rounded-full pointer-events-none opacity-50" />

            <div className="z-10 flex flex-col items-center text-center px-4 md:px-6 w-full max-w-md animate-in fade-in zoom-in duration-700">

                {/* Icon */}
                <div className="relative mb-8 group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent rounded-full blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
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
                <p className="text-lg md:text-xl font-sans text-muted-foreground mb-8">
                    {showEmailForm ? (isRegistering ? "Create Account" : "Welcome Back") : "Login to continue"}
                </p>

                {/* --- LOGIN CONTENT --- */}

                {!showEmailForm ? (
                    /* INITIAL STATE: 2 BIG BUTTONS */
                    <div className="flex flex-col gap-4 w-full">
                        {/* Button 1: Email */}
                        <button
                            onClick={() => setShowEmailForm(true)}
                            className="w-full px-8 py-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-lg transition-all shadow-lg hover:shadow-primary/25 active:scale-95 flex items-center justify-center gap-2"
                        >
                            <Mail className="w-5 h-5" />
                            Mit E-Mail anmelden
                        </button>

                        {/* Button 2: Google */}
                        <button
                            onClick={loginWithGoogle}
                            className="w-full px-8 py-4 rounded-xl bg-white text-gray-800 hover:bg-gray-100 font-semibold text-lg transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
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
                            Mit Google anmelden
                        </button>
                    </div>
                ) : (
                    /* EXPANDED EMAIL FORM */
                    <form onSubmit={handleSubmit} className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Passwort"
                                className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-secondary/50 bg-secondary/20 backdrop-blur-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                            />
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="flex items-center gap-2 p-3 text-sm text-red-400 bg-red-950/20 border border-red-900/50 rounded-lg">
                                <AlertCircle className="h-4 w-4" />
                                {error}
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full px-8 py-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-lg transition-all shadow-lg hover:shadow-primary/25 active:scale-95 flex items-center justify-center"
                        >
                            {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : (isRegistering ? "Registrieren" : "Anmelden")}
                        </button>

                        {/* Bottom Links */}
                        <div className="flex flex-col gap-3 mt-4 text-sm font-medium">
                            <button
                                type="button"
                                onClick={() => setIsRegistering(!isRegistering)}
                                className="text-primary hover:text-primary/80 transition-colors"
                            >
                                {isRegistering ? "Bereits einen Account? Anmelden" : "Keinen Account? Registrieren"}
                            </button>

                            <button
                                type="button"
                                onClick={() => setShowEmailForm(false)}
                                className="text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 transition-colors"
                            >
                                <ArrowLeft className="w-3 h-3" /> Zurück
                            </button>
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
