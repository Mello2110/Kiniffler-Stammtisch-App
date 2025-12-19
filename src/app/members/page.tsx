"use client";

import { MemberManager } from "@/components/members/MemberManager";
import { Users, ShieldCheck } from "lucide-react";

export default function MembersPage() {
    return (
        <div className="max-w-4xl mx-auto space-y-10 pb-20">
            {/* Header Section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 via-background to-background border p-8 md:p-12">
                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-4 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-wider uppercase">
                            <ShieldCheck className="h-3 w-3" />
                            Community
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight outfit">
                            Stammtisch <span className="text-primary italic">Crew</span>
                        </h1>
                        <p className="text-muted-foreground text-lg leading-relaxed max-w-xl">
                            Hier kannst du die Köpfe hinter dem Tisch verwalten.
                            Nur echte Originale sind erlaubt!
                        </p>
                    </div>

                    <div className="flex items-center gap-4 text-muted-foreground">
                        <div className="flex flex-col items-end">
                            <span className="text-2xl font-black text-foreground outfit">1337</span>
                            <span className="text-xs uppercase font-bold tracking-widest">Members</span>
                        </div>
                        <div className="h-10 w-px bg-border" />
                        <Users className="h-8 w-8 opacity-20" />
                    </div>
                </div>

                {/* Decorative background elements */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
            </div>

            <MemberManager />
        </div>
    );
}
