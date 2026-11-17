"use client";

import { MemberManager } from "@/components/members/MemberManager";
import { Users, ShieldCheck } from "lucide-react";
import { useMemo } from "react";
import { collection, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useFirestoreQuery } from "@/hooks/useFirestoreQuery";
import { useLanguage } from "@/contexts/LanguageContext";
import { useClub } from "@/contexts/ClubContext";
import type { Member } from "@/types";

export default function MembersPage() {
    const { dict } = useLanguage();
    const { clubId, clubCollection } = useClub();
    const qMembers = useMemo(() => query(clubCollection("members")), [clubId, clubCollection]);
    const { data: members } = useFirestoreQuery<Member>(qMembers);

    return (
        <div className="w-full max-w-full overflow-x-hidden space-y-8 pb-10">
            {/* Header Section */}
            <div className="kanpai-hero-banner rounded-3xl border border-white/10 p-6 sm:p-8 md:p-10">
                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-4 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-wider uppercase">
                            <ShieldCheck className="h-3 w-3" />
                            {dict.headers.members.badge}
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight outfit">
                            {dict.headers.members.title} <span className="text-primary italic">{dict.headers.members.highlight}</span>
                        </h1>
                        <p className="text-muted-foreground text-lg leading-relaxed max-w-xl">
                            {dict.headers.members.subtext}
                        </p>
                    </div>

                    <div className="flex items-center gap-4 text-muted-foreground">
                        <div className="flex flex-col items-end">
                            <span className="text-2xl font-black text-foreground outfit">{members.length}</span>
                            <span className="text-xs uppercase font-bold tracking-widest">{dict.members.countLabel}</span>
                        </div>
                        <div className="h-10 w-px bg-border" />
                        <Users className="h-8 w-8 text-accent/50" />
                    </div>
                </div>




            </div>

            <MemberManager />
        </div>
    );
}
