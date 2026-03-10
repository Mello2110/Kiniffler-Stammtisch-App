"use client";

import { useMemo } from "react";
import { collection, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useFirestoreQuery } from "@/hooks/useFirestoreQuery";
import type { Member } from "@/types";
import { PayPalLedger } from "@/components/cash/PayPalLedger";
import { useAuth } from "@/contexts/AuthContext";
import { Wallet, ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function LedgerPage() {
    const { user } = useAuth();

    // Fetch members for assignment lookup
    const qMembers = useMemo(() => query(collection(db, "members"), orderBy("name", "asc")), []);
    const { data: members } = useFirestoreQuery<Member>(qMembers);

    return (
        <div className="space-y-8 pb-10">
            {/* Header section with back button */}
            <div className="flex flex-col gap-4">
                <Link
                    href="/cash"
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors w-fit"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Back to Treasury
                </Link>

                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-background to-background border p-8 md:p-12">
                    <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="space-y-4 max-w-2xl">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-wider uppercase">
                                <Wallet className="h-3 w-3" />
                                PayPal Sync
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black tracking-tight outfit">
                                Digital <span className="text-primary italic">Ledger</span>
                            </h1>
                            <p className="text-muted-foreground text-lg leading-relaxed">
                                Alle PayPal-Transaktionen auf einen Blick.
                                Das System erkennt automatisch Strafen und Beiträge anhand von Betreff und Absender.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <PayPalLedger members={members} />
        </div>
    );
}
