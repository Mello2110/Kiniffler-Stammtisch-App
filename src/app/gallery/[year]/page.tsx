import YearPageClient from "./YearPageClient";

export async function generateStaticParams() {
    const years = ["2023", "2024", "2025", "2026"];
    return years.map((year) => ({
        year: year,
    }));
}

interface PageProps {
    params: Promise<{ year: string }>;
}

export default async function Page({ params }: PageProps) {
    const { year } = await params;
    return <YearPageClient year={year} />;
}
