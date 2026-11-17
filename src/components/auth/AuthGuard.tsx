"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const { user, hasClubMembership, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading) {
            const isPublicPath = pathname === "/login" || pathname === "/" || pathname.startsWith("/join");

            if (!user) {
                if (pathname.startsWith("/onboarding")) {
                    router.push("/login?mode=register&redirect=/onboarding");
                } else if (!isPublicPath) {
                    router.push("/login");
                }
            } else {
                const isAllowedWithoutClub =
                    pathname === "/" ||
                    pathname.startsWith("/join") ||
                    pathname.startsWith("/onboarding");

                if (!hasClubMembership && !isAllowedWithoutClub) {
                    router.push("/onboarding");
                } else if (hasClubMembership && pathname === "/login") {
                    router.push("/dashboard");
                }
            }
        }
    }, [user, hasClubMembership, loading, pathname, router]);

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="text-muted-foreground animate-pulse">Lade Stammtisch...</p>
                </div>
            </div>
        );
    }

    const isPublicPath = pathname === "/login" || pathname === "/" || pathname.startsWith("/join");
    if (!user && !isPublicPath) {
        return null;
    }

    const isAllowedWithoutClub =
        pathname === "/" ||
        pathname.startsWith("/join") ||
        pathname.startsWith("/onboarding");
    if (user && !hasClubMembership && !isAllowedWithoutClub) {
        return null;
    }

    return <>{children}</>;
}
