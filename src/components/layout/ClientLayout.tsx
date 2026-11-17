"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { TitleProvider } from "@/contexts/TitleContext";
import { useAuth } from "@/contexts/AuthContext";
import { useClub } from "@/contexts/ClubContext";
import { generateClubThemeTokens } from "@/lib/oklchTheme";
import { DEFAULT_PRIMARY_HEX, DEFAULT_ACCENT_HEX } from "@/lib/defaultRuleset";

export function ClientLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { user, loading } = useAuth();
    const { club } = useClub();

    // Phase 6 V2: Apply 2-color OKLCH theme variables in real-time
    useEffect(() => {
        if (typeof document === "undefined") return;
        const primaryHex = club?.theme?.primaryColor || DEFAULT_PRIMARY_HEX;
        const accentHex = club?.theme?.accentColor || DEFAULT_ACCENT_HEX;
        const { cssVariables } = generateClubThemeTokens(primaryHex, accentHex);
        const root = document.documentElement;
        for (const [prop, val] of Object.entries(cssVariables)) {
            root.style.setProperty(prop, val);
        }
    }, [club?.theme?.primaryColor, club?.theme?.accentColor]);

    useEffect(() => {
        if (typeof window !== "undefined" && "serviceWorker" in navigator) {
            navigator.serviceWorker
                .register("/sw.js")
                .catch((err) => console.log("SW registration failed: ", err));
        }
    }, []);

    const isLoginPage = pathname === "/login";
    const isLandingPage = pathname === "/";
    const showSimpleLayout = isLoginPage || isLandingPage;

    return (
        <AuthGuard>
            <TitleProvider>
                {/* --- GLOBAL DYNAMIC BACKGROUND DECOR (Zero GPU Blur Overhead) --- */}
                <div
                    className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden bg-background"
                    style={{
                        backgroundImage: `
                            radial-gradient(ellipse 65% 45% at 22% 0%, color-mix(in oklab, hsl(var(--primary)) 18%, transparent) 0%, transparent 70%),
                            radial-gradient(ellipse 55% 40% at 85% 92%, color-mix(in oklab, hsl(var(--primary)) 10%, transparent) 0%, transparent 70%)
                        `
                    }}
                >
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:28px_28px] [mask-image:radial-gradient(ellipse_70%_55%_at_50%_0%,#000_70%,transparent_100%)] opacity-60" />
                </div>

                {showSimpleLayout ? (
                    <main className="min-h-screen w-full max-w-full overflow-x-hidden bg-transparent">
                        {children}
                    </main>
                ) : (
                    <div className="flex min-h-screen w-full max-w-full overflow-x-hidden">
                        <Sidebar className="hidden lg:flex fixed inset-y-0 z-50 w-64" />
                        <div className="flex flex-1 flex-col min-w-0 max-w-full lg:pl-64 transition-all duration-300">
                            <Navbar />
                            <main className="flex-1 w-full max-w-7xl mx-auto p-3 sm:p-5 lg:p-8 pb-24 lg:pb-10 min-w-0 overflow-x-hidden">
                                {children}
                            </main>
                            <div className="hidden lg:block">
                                <Footer />
                            </div>
                            <MobileBottomNav />
                        </div>
                    </div>
                )}
            </TitleProvider>
        </AuthGuard>
    );
}
