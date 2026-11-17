import GameRunnerClient from "./GameRunnerClient";

export async function generateStaticParams() {
    return [
        { clubSlug: "stammtisch", gameType: "kniffel", sessionId: "active" },
        { clubSlug: "stammtisch", gameType: "schocken", sessionId: "active" },
        { clubSlug: "stammtisch", gameType: "kegeln", sessionId: "active" },
        { clubSlug: "club_original", gameType: "kniffel", sessionId: "active" },
        { clubSlug: "club_original", gameType: "schocken", sessionId: "active" },
        { clubSlug: "club_original", gameType: "kegeln", sessionId: "active" },
    ];
}

interface PageProps {
    params: Promise<{
        clubSlug: string;
        gameType: string;
        sessionId: string;
    }>;
}

export default async function ClubGameSessionPage({ params }: PageProps) {
    const resolved = await params;
    return (
        <GameRunnerClient
            clubSlug={resolved.clubSlug}
            gameType={resolved.gameType}
            sessionId={resolved.sessionId}
        />
    );
}
