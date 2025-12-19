"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { TitleProvider } from "@/contexts/TitleContext";
import { useAuth } from "@/contexts/AuthContext";

export function ClientLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { user, loading } = useAuth();

    // Pages that should have the full dashboard layout
    const isLoginPage = pathname === "/login";
    // Landing page is always simple layout, regardless of auth
    const isLandingPage = pathname === "/";

    // Combine conditions for simple layout
    const showSimpleLayout = isLoginPage || isLandingPage;

    return (
        <AuthGuard>
            <TitleProvider>
                {/* --- GLOBAL BACKGROUND DECOR (Advanced Lighting & Gradients) --- */}
                <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden bg-background">
                    {/* 1. Primary Light Source (Purple - Top Center) */}
                    <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/20 blur-[130px] rounded-full opacity-60 mix-blend-screen animate-pulse duration-[4000ms]" />

                    {/* 2. Secondary Light Source (Indigo/Blue - Bottom Right Offset) - Creates Farbverlauf */}
                    <div className="absolute top-[20%] right-[-10%] w-[800px] h-[600px] bg-indigo-500/10 blur-[120px] rounded-full opacity-40 mix-blend-screen" />

                    {/* 3. Central Spotlight (Lighting Effect) */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.03)_0%,transparent_70%)]" />

                    {/* 4. Subtle Grid Pattern */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-80" />
                </div>

                {showSimpleLayout ? (
                    <main className="min-h-screen bg-transparent animate-in fade-in duration-500">
                        {children}
                    </main>
                ) : (
                    <div className="flex min-h-screen">
                        <Sidebar className="hidden lg:flex fixed inset-y-0 z-50 w-64" />
                        <div className="flex flex-1 flex-col lg:pl-64 transition-all duration-300">
                            <Navbar />
                            <main className="flex-1 p-4 sm:p-6 lg:p-8 animate-in fade-in duration-500">
                                {children}
                            </main>
                            <Footer />
                        </div>
                    </div>
                )}
            </TitleProvider>
        </AuthGuard>
    );
}
