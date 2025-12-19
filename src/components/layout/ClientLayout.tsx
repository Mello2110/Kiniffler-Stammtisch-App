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
                {showSimpleLayout ? (
                    <main className="min-h-screen bg-background animate-in fade-in duration-500">
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
