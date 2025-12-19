"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Trophy, Calendar, Users, Smartphone, Settings } from "lucide-react";

export const LandingPage = () => {
    const { user, loading } = useAuth();
    const router = useRouter();

    const handleLogin = () => {
        router.push("/login");
    };

    const handleDashboard = () => {
        router.push("/dashboard");
    };

    return (
        <div className="h-screen w-full overflow-y-auto snap-y snap-mandatory scroll-smooth bg-background text-foreground no-scrollbar">

            {/* --- SECTION 1: HERO (KANPAI) --- */}
            <section className="h-screen w-full snap-start flex flex-col items-center justify-center relative overflow-hidden">
                {/* Background Decor */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/20 blur-[120px] rounded-full pointer-events-none opacity-50" />

                <div className="z-10 flex flex-col items-center text-center px-4 md:px-6 animate-in fade-in zoom-in duration-700">

                    {/* Icon */}
                    <div className="relative mb-8 group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent rounded-full blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
                        <div className="relative w-40 h-40 md:w-56 md:h-56 rounded-full overflow-hidden border-4 border-secondary/50 shadow-2xl">
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

                <footer className="absolute bottom-6 text-sm text-muted-foreground opacity-60">
                    {/* Moved to bottom section */}
                </footer>
            </section>


            {/* --- SECTION 2: FEATURES --- */}
            <section className="h-screen w-full snap-start flex flex-col items-center justify-center relative overflow-hidden bg-background px-4 md:px-6">
                {/* Background Decor - Deeper/More Detailed */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

                <div className="z-10 w-full max-w-6xl flex flex-col items-center">
                    <h2 className="text-3xl md:text-5xl font-heading font-bold mb-12 text-center tracking-tight text-foreground flex items-center gap-4">
                        <div className="relative w-10 h-10 md:w-14 md:h-14 rounded-full overflow-hidden shadow-lg border-2 border-primary/20">
                            <Image
                                src="/landing-icon.jpg"
                                alt="KANPAI Logo"
                                fill
                                className="object-cover"
                            />
                        </div>
                        KANPAI Features
                    </h2>

                    <div className="flex flex-wrap justify-center gap-6 w-full max-w-7xl">
                        {/* Card 1 */}
                        <div className="p-6 rounded-2xl border border-secondary/50 bg-secondary/30 backdrop-blur-md shadow-2xl hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="relative z-10">
                                <div className="mb-4 text-primary bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors shadow-inner">
                                    <Trophy className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold mb-2">Points & Leaderboard</h3>
                                <p className="text-muted-foreground text-sm leading-relaxed">
                                    Realtime tracking. Season Leaderboards & Hall of Fame.
                                </p>
                            </div>
                        </div>

                        {/* Card 2 */}
                        <div className="p-6 rounded-2xl border border-secondary/50 bg-secondary/30 backdrop-blur-md shadow-2xl hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="relative z-10">
                                <div className="mb-4 text-primary bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors shadow-inner">
                                    <Calendar className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold mb-2">Event Management</h3>
                                <p className="text-muted-foreground text-sm leading-relaxed">
                                    Easy scheduling. Smart dashboard & one-click maps.
                                </p>
                            </div>
                        </div>

                        {/* Card 3 */}
                        <div className="p-6 rounded-2xl border border-secondary/50 bg-secondary/30 backdrop-blur-md shadow-2xl hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="relative z-10">
                                <div className="mb-4 text-primary bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors shadow-inner">
                                    <Users className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold mb-2">Member Management</h3>
                                <p className="text-muted-foreground text-sm leading-relaxed">
                                    Full profiles. Smart permissions & role control.
                                </p>
                            </div>
                        </div>

                        {/* Card 4 */}
                        <div className="p-6 rounded-2xl border border-secondary/50 bg-secondary/30 backdrop-blur-md shadow-2xl hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="relative z-10">
                                <div className="mb-4 text-primary bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors shadow-inner">
                                    <Smartphone className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold mb-2">PWA Experience</h3>
                                <p className="text-muted-foreground text-sm leading-relaxed">
                                    Native feel. Installable, fullscreen & offline-ready.
                                </p>
                            </div>
                        </div>

                        {/* Card 5 - Customization */}
                        <div className="p-6 rounded-2xl border border-secondary/50 bg-secondary/30 backdrop-blur-md shadow-2xl hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="relative z-10">
                                <div className="mb-4 text-primary bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors shadow-inner">
                                    <Settings className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold mb-2">For Everyone</h3>
                                <p className="text-muted-foreground text-sm leading-relaxed">
                                    Your rules, your sport, your KANPAI. Fully customizable.
                                </p>
                            </div>
                        </div>
                    </div>

                    <footer className="absolute bottom-6 text-sm text-muted-foreground opacity-60">
                        &copy; 2025 KANPAI App
                    </footer>
                </div>
            </section>
        </div>
    );
};
