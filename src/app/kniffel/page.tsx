"use client";

import { useState, useMemo } from "react";
import { collection, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useFirestoreQuery } from "@/hooks/useFirestoreQuery";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Member, KniffelSheet } from "@/types";
import { Dice5, Plus } from "lucide-react";
import { KniffelYearNav } from "@/components/kniffel/KniffelYearNav";
import { KniffelSheetList } from "@/components/kniffel/KniffelSheetList";
import { AddSheetModal } from "@/components/kniffel/AddSheetModal";

export default function KniffelPage() {
    const { dict } = useLanguage();
    const currentYear = new Date().getFullYear();

    // Selected year and month for navigation
    const [selectedYear, setSelectedYear] = useState<number>(currentYear);
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Fetch all members for dynamic columns
    const qMembers = useMemo(() => query(collection(db, "members"), orderBy("name", "asc")), []);
    const { data: members } = useFirestoreQuery<Member>(qMembers);

    // Fetch Kniffel sheets for selected year/month (sorted client-side to avoid composite index)
    const qSheets = useMemo(() =>
        query(
            collection(db, "kniffelSheets"),
            where("year", "==", selectedYear),
            where("month", "==", selectedMonth)
        ),
        [selectedYear, selectedMonth]
    );
    const { data: sheets, loading: sheetsLoading } = useFirestoreQuery<KniffelSheet>(qSheets);

    return (
        <div className="space-y-8 pb-10">
            {/* Header Section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 via-background to-background border p-8 md:p-12">
                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-4 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-wider uppercase">
                            <Dice5 className="h-3 w-3" />
                            {dict.headers.kniffel.badge}
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight outfit">
                            {dict.headers.kniffel.title} <span className="text-primary italic">{dict.headers.kniffel.highlight}</span>
                        </h1>
                        <p className="text-muted-foreground text-lg leading-relaxed">
                            {dict.headers.kniffel.subtext}
                        </p>
                    </div>

                    <div className="flex items-center gap-4 text-muted-foreground">
                        <div className="flex flex-col items-end">
                            <span className="text-2xl font-black text-foreground outfit">{sheets.length}</span>
                            <span className="text-xs uppercase font-bold tracking-widest">{dict.kniffel.sheetCount}</span>
                        </div>
                        <div className="h-10 w-px bg-border" />
                        <Dice5 className="h-8 w-8 opacity-20" />
                    </div>
                </div>

                <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Year/Month Navigation */}
                <div className="lg:col-span-1">
                    <KniffelYearNav
                        selectedYear={selectedYear}
                        selectedMonth={selectedMonth}
                        onSelectYear={setSelectedYear}
                        onSelectMonth={setSelectedMonth}
                        sheets={sheets}
                    />
                </div>

                {/* Sheet List */}
                <div className="lg:col-span-3">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-xl font-semibold outfit">
                            {dict.kniffel.months[selectedMonth]} {selectedYear}
                        </h2>
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-medium transition-all duration-300 shadow-lg shadow-primary/25"
                        >
                            <Plus className="h-4 w-4" />
                            {dict.kniffel.addSheet}
                        </button>
                    </div>

                    <KniffelSheetList
                        sheets={sheets}
                        members={members}
                        loading={sheetsLoading}
                        selectedYear={selectedYear}
                        selectedMonth={selectedMonth}
                    />
                </div>
            </div>

            {/* Add Sheet Modal */}
            <AddSheetModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                members={members}
                selectedYear={selectedYear}
                selectedMonth={selectedMonth}
            />
        </div>
    );
}
