import YearPageClient from "./YearPageClient";

export async function generateStaticParams() {
    // Generate years from 2015 to 2026
    const years = Array.from({ length: 2026 - 2015 + 1 }, (_, i) => (2026 - i).toString());
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
