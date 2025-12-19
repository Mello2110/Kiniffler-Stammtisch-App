"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

export const LandingPage = () => {
    const { user, loading } = useAuth();
    const router = useRouter();

    const handleLogin = () => {
        router.push("/login"); // Adjust route if login is different
    };

    const handleDashboard = () => {
        router.push("/dashboard");
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground relative overflow-hidden">
            {/* Background Decor - optional subtle glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/20 blur-[120px] rounded-full pointer-events-none opacity-50" />

            <main className="z-10 flex flex-col items-center text-center px-4 md:px-6 animate-in fade-in zoom-in duration-700">

                {/* Icon */}
                <div className="relative mb-8 group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent rounded-full blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
                    <div className="relative w-40 h-40 md:w-56 md:h-56 rounded-full overflow-hidden border-4 border-secondary/50 shadow-2xl">
                        <Image
                            src="/landing-icon.jpg"
                            alt="Stammtisch App Icon"
                            fill
                            className="object-cover"
                            priority
                        />
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-5xl md:text-7xl font-heading font-bold mb-4 tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400">
                    Stammtisch
                </h1>

                {/* Slogan - Restored as requested */}
                <p className="text-xl md:text-2xl font-sans text-muted-foreground mb-10 max-w-lg">
                    Make every Meetup Count
                </p>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm sm:max-w-md justify-center">
                    {loading ? (
                        <div className="h-12 w-32 bg-secondary/50 rounded-lg animate-pulse mx-auto" />
                    ) : user ? (
                        <button
                            onClick={handleDashboard}
                            className="px-8 py-3.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-lg transition-all shadow-lg hover:shadow-primary/25 active:scale-95"
                        >
                            Go to Dashboard
                        </button>
                    ) : (
                        <button
                            onClick={handleLogin}
                            className="px-8 py-3.5 rounded-lg bg-white text-black hover:bg-gray-100 font-semibold text-lg transition-all shadow-lg active:scale-95"
                        >
                            Login
                        </button>
                    )}
                </div>
            </main>

            {/* Footer / Copyright */}
            <footer className="absolute bottom-6 text-sm text-muted-foreground opacity-60">
                &copy; {new Date().getFullYear()} Stammtisch App
            </footer>
        </div>
    );
};
