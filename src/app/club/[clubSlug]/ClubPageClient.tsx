"use client";

import { useEffect } from "react";
import { useClub } from "@/contexts/ClubContext";
import { DashboardView } from "@/components/dashboard/DashboardView";

export default function ClubPageClient({ clubSlug }: { clubSlug: string }) {
    const { switchClub } = useClub();

    useEffect(() => {
        if (clubSlug) {
            switchClub(clubSlug);
        }
    }, [clubSlug, switchClub]);

    return <DashboardView />;
}
