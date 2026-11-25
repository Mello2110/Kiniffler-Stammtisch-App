import YearPageClient from "./YearPageClient";

export async function generateStaticParams() {
    // Cover a wide range of founding years (1950..2035) for static export
    const maxYear = 2035;
    const minYear = 1950;
    const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => (maxYear - i).toString());
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
