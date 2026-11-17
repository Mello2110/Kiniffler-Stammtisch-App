import ClubPageClient from "./ClubPageClient";

export async function generateStaticParams() {
    return [
        { clubSlug: "stammtisch" },
        { clubSlug: "club_original" },
    ];
}

interface PageProps {
    params: Promise<{ clubSlug: string }>;
}

export default async function ClubTenantPage({ params }: PageProps) {
    const { clubSlug } = await params;
    return <ClubPageClient clubSlug={clubSlug} />;
}
