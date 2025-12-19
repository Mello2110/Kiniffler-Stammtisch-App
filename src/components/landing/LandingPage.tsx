"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
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
        <div className="h-screen w-full overflow-y-auto snap-y snap-mandatory scroll-smooth bg-background text-foreground no-scrollbar">

            {/* --- SECTION 1: HERO (KANPAI) --- */}
            <section className="h-screen w-full snap-start flex flex-col items-center justify-center relative overflow-hidden">
                {/* Background Decor - optional subtle glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/20 blur-[120px] rounded-full pointer-events-none opacity-50" />

                <div className="z-10 flex flex-col items-center text-center px-4 md:px-6 animate-in fade-in zoom-in duration-700">

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
                        KANPAI
                    </h1>

                    {/* Slogan */}
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
                </div>

                {/* Footer / Copyright (only on first slide per design? Or bottom of last? 
                    User requested "Exact existing design", which had footer at bottom. 
                    Ideally footer stays on first slide or moves to last. I'll keep it absolute in 1st section for now to match "1:1" request) */}
                <footer className="absolute bottom-6 text-sm text-muted-foreground opacity-60">
                    &copy; {new Date().getFullYear()} Stammtisch App
                </footer>
            </section>


            {/* --- SECTION 2: FEATURES --- */}
            <section className="h-screen w-full snap-start flex flex-col items-center justify-center relative overflow-hidden bg-background">
                {/* Background Decor - different position/color for variety but same style */}
                <div className="absolute bottom-0 right-1/2 translate-x-1/2 w-[800px] h-[500px] bg-accent/10 blur-[120px] rounded-full pointer-events-none opacity-40" />

                <div className="z-10 flex flex-col items-center text-center px-4 md:px-6 max-w-2xl">
                    <div className="mb-8 p-6 md:p-10 rounded-2xl border border-secondary/50 bg-secondary/20 backdrop-blur-sm shadow-2xl">
                        <h2 className="text-3xl md:text-5xl font-heading font-bold mb-8 tracking-tight text-foreground">
                            ✨ KANPAI Features
                        </h2>

                        <ul className="text-left space-y-4 text-lg md:text-xl text-muted-foreground font-sans mb-8">
                            <li className="flex items-center gap-3">
                                <span className="text-primary">●</span> Automatisches Intro/Recap Skip
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="text-primary">●</span> Wiedergabe 0.1x - 4.0x
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="text-primary">●</span> Smart Shortcuts (Alt+= / Alt+-)
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="text-primary">●</span> Perfekt für YT, Netflix, Disney
                            </li>
                        </ul>

                        <div className="pt-6 border-t border-secondary/50">
                            <p className="text-xl font-semibold text-primary-foreground/90">
                                🎯 Dein Streaming-Companion
                            </p>
                        </div>
                    </div>
                </div>
            </section>

        </div>
    );
};
