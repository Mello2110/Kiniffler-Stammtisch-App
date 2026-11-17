"use client";

import { useEffect } from "react";
import { useClub } from "@/contexts/ClubContext";
import { ModularGameHub } from "@/components/games/ModularGameHub";
import type { GameDisciplineId } from "@/types";

interface GameRunnerClientProps {
    clubSlug: string;
    gameType: string;
    sessionId: string;
}

export default function GameRunnerClient({ clubSlug, gameType, sessionId }: GameRunnerClientProps) {
    const { switchClub } = useClub();

    useEffect(() => {
        if (clubSlug) {
            switchClub(clubSlug);
        }
    }, [clubSlug, switchClub]);

    const validGameType: GameDisciplineId =
        gameType === "schocken" || gameType === "kegeln" || gameType === "kniffel"
            ? gameType
            : "kniffel";

    return (
        <ModularGameHub
            initialDiscipline={validGameType}
            initialSessionId={sessionId !== "active" ? sessionId : undefined}
        />
    );
}
