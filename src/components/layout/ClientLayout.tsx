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
                {/* --- GLOBAL BACKGROUND DECOR (HERO EFFECT) --- */}
                <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden select-none">
                    {/* 1. Base Gradient (Subtle Dark Shift) */}
                    <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background" />

                    {/* 2. TOP SPOTLIGHT (The "Lighting" Effect) */}
                    <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[120%] h-[600px] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/20 via-primary/5 to-transparent blur-[80px]" />

                    {/* 3. PRIMARY BLOB (Top Left - Purple) */}
                    <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-purple-600/20 blur-[130px] rounded-full mix-blend-screen opacity-60 animate-in fade-in duration-1000" />

                    {/* 4. SECONDARY BLOB (Bottom Right - Cyan/Blue for Farbverlauf) */}
                    <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-600/10 blur-[130px] rounded-full mix-blend-screen opacity-40 animate-in fade-in duration-1000 delay-300" />

                    {/* 5. TEXTURE (Refined Grid) */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,#000_70%,transparent_100%)] opacity-50" />

                    {/* 6. NOISE OVERLAY (Optional for more texture, subtle) */}
                    <div className="absolute inset-0 bg-noise opacity-[0.02]" />
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
