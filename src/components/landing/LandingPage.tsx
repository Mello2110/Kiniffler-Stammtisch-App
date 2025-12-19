"use client";

import Link from "next/link";
import { ArrowRight, Beer, Calendar, ChartBar, Image as ImageIcon, Shield, LayoutDashboard, CheckCircle2, TrendingUp, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function LandingPage() {
    const { user } = useAuth();

    return (
        <div className="min-h-screen bg-[#020617] text-white flex flex-col font-sans selection:bg-primary/30">
            {/* Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
            </div>

            {/* Navigation */}
            <nav className="w-full border-b border-white/5 bg-background/50 backdrop-blur-xl sticky top-0 z-50">
                <div className="container mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {/* Logo Text */}
                        <span className="text-2xl font-black tracking-tighter bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                            KANPAI
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        {user ? (
                            <Link
                                href="/dashboard"
                                className="inline-flex items-center justify-center rounded-full bg-white/10 px-6 py-2.5 text-sm font-bold text-white hover:bg-white/20 transition-all hover:scale-105 active:scale-95 duration-200 border border-white/10"
                            >
                                <LayoutDashboard className="mr-2 h-4 w-4" />
                                Go to Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href="/login"
                                    className="hidden sm:inline-flex text-sm font-semibold text-white/70 hover:text-white transition-colors"
                                >
                                    Log in
                                </Link>
                                <Link
                                    href="/login"
                                    className="inline-flex items-center justify-center rounded-full bg-[#8B5CF6] px-6 py-2.5 text-sm font-bold text-white shadow-[0_0_20px_-5px_rgba(139,92,246,0.5)] hover:bg-[#7c4bf0] transition-all hover:scale-105 active:scale-95 duration-200"
                                >
                                    Register
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-24 pb-32 sm:pt-32 sm:pb-40 overflow-hidden">
                <div className="container mx-auto px-6 relative z-10">
                    <div className="flex flex-col items-center text-center max-w-4xl mx-auto mb-20">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-purple-200 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                            </span>
                            The #1 App for your Stammtisch
                        </div>

                        <h1 className="text-6xl sm:text-7xl md:text-8xl font-black tracking-tight mb-8 leading-[0.9] outfit animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                            Make every <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8B5CF6] via-purple-400 to-blue-400">
                                Meetup count.
                            </span>
                        </h1>

                        <p className="text-xl sm:text-2xl text-white/60 max-w-2xl leading-relaxed mb-10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                            Organize appointments, track stats, manage the cash box, and crown the season champion. All in one beautiful, private space.
                        </p>

                        {!user && (
                            <div className="flex flex-col sm:flex-row gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
                                <Link
                                    href="/login"
                                    className="inline-flex items-center justify-center h-14 rounded-full bg-white text-black px-10 text-lg font-bold hover:bg-gray-100 transition-all hover:scale-105 shadow-[0_0_30px_-5px_rgba(255,255,255,0.3)]"
                                >
                                    Start for free
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* App Showcase / Mockup */}
                    <div className="relative mx-auto max-w-5xl perspective-1000 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500 group">
                        {/* Glow behind mockup */}
                        <div className="absolute inset-0 bg-gradient-to-t from-purple-500/20 via-transparent to-transparent blur-[80px] -z-10" />

                        <div className="relative rounded-2xl border border-white/10 bg-[#0F172A]/80 backdrop-blur-2xl shadow-2xl overflow-hidden transform group-hover:scale-[1.01] transition-transform duration-500">
                            {/* Mockup Header */}
                            <div className="h-12 border-b border-white/5 flex items-center px-4 space-x-2">
                                <div className="h-3 w-3 rounded-full bg-red-500/50" />
                                <div className="h-3 w-3 rounded-full bg-yellow-500/50" />
                                <div className="h-3 w-3 rounded-full bg-green-500/50" />
                                <div className="ml-4 h-6 w-64 rounded-md bg-white/5" />
                            </div>

                            {/* Mockup Content Grid */}
                            <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 opacity-90">
                                {/* Next Event Card (Mock) */}
                                <div className="md:col-span-1 space-y-4">
                                    <div className="rounded-xl p-6 bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10">
                                        <div className="text-xs font-bold text-purple-300 uppercase tracking-widest mb-2">Next Up</div>
                                        <div className="text-2xl font-bold text-white mb-1">Friday, 18.04</div>
                                        <div className="text-white/60">BrewDog Berlin</div>
                                        <div className="mt-4 flex -space-x-2">
                                            {[1, 2, 3, 4].map(i => (
                                                <div key={i} className="h-8 w-8 rounded-full bg-white/10 border-2 border-[#0F172A]" />
                                            ))}
                                        </div>
                                    </div>
                                    <div className="rounded-xl p-6 bg-white/5 border border-white/10">
                                        <div className="flex items-center gap-3 text-white/70">
                                            <Beer className="h-5 w-5" />
                                            <span>Cash Box</span>
                                        </div>
                                        <div className="text-3xl font-bold text-white mt-2">€420.50</div>
                                    </div>
                                </div>

                                {/* Leaderboard (Mock) */}
                                <div className="md:col-span-2 rounded-xl border border-white/10 bg-white/5 p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="font-bold text-lg">Season Leaderboard</h3>
                                        <TrendingUp className="h-5 w-5 text-green-400" />
                                    </div>
                                    <div className="space-y-4">
                                        {[
                                            { name: "Marcel", pts: 89, pos: 1 },
                                            { name: "Lukas", pts: 82, pos: 2 },
                                            { name: "Sarah", pts: 75, pos: 3 },
                                        ].map((p, i) => (
                                            <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-white/5">
                                                <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold ${i === 0 ? "bg-yellow-500 text-black" : "bg-white/10"}`}>
                                                    {p.pos}
                                                </div>
                                                <div className="flex-1 font-medium">{p.name}</div>
                                                <div className="font-bold text-white">{p.pts} pts</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-24 border-t border-white/5 bg-white/5 relative">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-5xl font-black mb-6">Everything you need.</h2>
                        <p className="text-xl text-white/60">Built for casual groups who take fun seriously.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <FeatureCard
                            icon={Calendar}
                            title="Easy Scheduling"
                            description="Vote for dates, set locations, and get automated reminders. Zero friction."
                        />
                        <FeatureCard
                            icon={ChartBar}
                            title="Live Stats"
                            description="Detailed statistics about attendance, points, and streaks. Who is the MVP?"
                        />
                        <FeatureCard
                            icon={Shield}
                            title="Fair Penalties"
                            description="Manage the penalty catalog and track payments digitally. Transparent for everyone."
                        />
                        <FeatureCard
                            icon={Beer}
                            title="Season Mode"
                            description="Reset points yearly to crown a new champion. Keep the competition alive."
                        />
                        <FeatureCard
                            icon={ImageIcon}
                            title="Private Gallery"
                            description="A secure space for photos from your legendary nights out."
                        />
                        <FeatureCard
                            icon={Users}
                            title="Member Profiles"
                            description="Customizable profiles with stats, roles, and personal accolades."
                        />
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-32 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#8B5CF6]/20"></div>
                <div className="container mx-auto px-6 text-center relative z-10">
                    <h2 className="text-4xl sm:text-6xl font-black mb-8">Ready for the next round?</h2>

                    {!user && (
                        <Link
                            href="/login"
                            className="inline-flex items-center justify-center h-16 rounded-full bg-white text-black px-12 text-xl font-bold hover:bg-gray-100 transition-all hover:scale-105 shadow-xl"
                        >
                            Join Kanpai Free
                            <ArrowRight className="ml-2 h-6 w-6" />
                        </Link>
                    )}
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-white/10 text-center text-white/40">
                <div className="flex items-center justify-center gap-2 mb-4">
                    <span className="text-lg font-black tracking-tighter text-white/50">KANPAI</span>
                </div>
                <p className="text-sm">
                    © {new Date().getFullYear()} Kanpai Stammtisch App.
                </p>
            </footer>
        </div>
    );
}

function FeatureCard({ icon: Icon, title, description }: { icon: any, title: string, description: string }) {
    return (
        <div className="group p-8 rounded-3xl bg-white/[0.03] border border-white/5 hover:border-[#8B5CF6]/50 hover:bg-white/[0.06] transition-all duration-300">
            <div className="h-14 w-14 rounded-2xl bg-[#8B5CF6]/10 text-[#8B5CF6] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Icon className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">{title}</h3>
            <p className="text-white/60 leading-relaxed">{description}</p>
        </div>
    );
}
