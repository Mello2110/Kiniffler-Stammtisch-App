"use client";

import Link from "next/link";
import { ArrowRight, Beer, Calendar, ChartBar, Image as ImageIcon, Shield } from "lucide-react";

export function LandingPage() {
    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            {/* Navigation */}
            <nav className="w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-black tracking-tighter text-primary">KANPAI</span>
                    </div>
                    <Link
                        href="/login"
                        className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                        Login
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative flex-1 flex flex-col items-center justify-center text-center py-24 px-4 overflow-hidden">
                <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background"></div>

                <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 outfit">
                    Manage your <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">
                        Stammtisch
                    </span>
                </h1>

                <p className="text-xl text-muted-foreground max-w-2xl mb-12 leading-relaxed">
                    Die ultimative App für deinen Freundeskreis. Termine, Statistik, Kasse und Erinnerungen – alles an einem Ort, einfach und modern.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                    <Link
                        href="/login"
                        className="inline-flex items-center justify-center h-12 rounded-full bg-primary px-8 text-lg font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 transition-all hover:scale-105"
                    >
                        Jetzt starten
                        <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-24 bg-muted/30">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <FeatureCard
                            icon={Calendar}
                            title="Smarte Terminfindung"
                            description="Nie wieder endlose WhatsApp-Diskussionen. Votes, Terminvorschläge und automatische Erinnerungen."
                        />
                        <FeatureCard
                            icon={ChartBar}
                            title="Lebendige Statistik"
                            description="Wer führt die Season an? Wer hat die wenigsten Events verpasst? Zahlen, Daten, Fakten."
                        />
                        <FeatureCard
                            icon={Shield}
                            title="Strafenkatalog"
                            description="Digitale Verwaltung von Strafen und Einzahlungen. Transparent und fair für alle."
                        />
                        <FeatureCard
                            icon={Beer}
                            title="Season Management"
                            description="Jedes Jahr beginnt neu. Kröne den Season-Champion und starte frisch durch."
                        />
                        <FeatureCard
                            icon={ImageIcon}
                            title="Galerie"
                            description="Sammle die besten Momente eurer Treffen in einer gemeinsamen, privaten Galerie."
                        />
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t text-center text-muted-foreground">
                <p className="text-sm">
                    © {new Date().getFullYear()} Kanpai Stammtisch App. Built with precision.
                </p>
            </footer>
        </div>
    );
}

function FeatureCard({ icon: Icon, title, description }: { icon: any, title: string, description: string }) {
    return (
        <div className="p-6 rounded-2xl bg-card border hover:border-primary/50 transition-colors shadow-sm">
            <div className="h-12 w-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                <Icon className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">{title}</h3>
            <p className="text-muted-foreground">{description}</p>
        </div>
    );
}
