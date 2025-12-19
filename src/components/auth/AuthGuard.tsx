"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading) {
            // Allow "/" to be public (Landing Page)
            const isPublicPath = pathname === "/login" || pathname === "/";

            if (!user && !isPublicPath) {
                // If trying to access protected route (like /dashboard), go to login
                router.push("/login");
            } else if (user && pathname === "/login") {
                // If logged in and on login, go to dashboard
                router.push("/dashboard");
            }
        }
    }, [user, loading, pathname, router]);

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

    // While redirecting, better to render nothing or the loader to avoid flashing content
    // But allow public paths to render immediately
    const isPublicPath = pathname === "/login" || pathname === "/";
    if (!user && !isPublicPath) {
        return null;
    }

    return <>{children}</>;
}
