"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";

interface AuthContextType {
    user: User | null;
    hasClubMembership: boolean;
    loading: boolean;
    logout: () => Promise<void>;
    loginWithGoogle: (redirectTo?: string) => Promise<void>;
    refreshMembership: () => Promise<boolean>;
    confirmMembership: () => void;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    hasClubMembership: false,
    loading: true,
    logout: async () => { },
    loginWithGoogle: async () => { },
    refreshMembership: async () => false,
    confirmMembership: () => { },
});

export const useAuth = () => useContext(AuthContext);

async function checkUserMembership(currentUser: User): Promise<boolean> {
    const globalUserRef = doc(db, "users", currentUser.uid);
    const globalUserSnap = await getDoc(globalUserRef);

    if (globalUserSnap.exists()) {
        const data = globalUserSnap.data();
        const clubIds: string[] = Array.isArray(data?.clubIds) ? data.clubIds : [];
        const targetClubId = data?.defaultClubId || clubIds[0];

        if (targetClubId) {
            try {
                const clubMemberRef = doc(db, "clubs", targetClubId, "members", currentUser.uid);
                const clubMemberSnap = await getDoc(clubMemberRef);
                if (clubMemberSnap.exists()) {
                    if (clubMemberSnap.data()?.email !== currentUser.email) {
                        setDoc(clubMemberRef, { email: currentUser.email }, { merge: true }).catch(() => {});
                    }
                    return true;
                }
            } catch {
                // Ignore transient permission errors if rules haven't propagated yet
            }
        }
        return clubIds.length > 0;
    }

    // Legacy fallback ONLY when /users/{uid} does not exist yet
    try {
        const legacyUserRef = doc(db, "members", currentUser.uid);
        const legacyUserSnap = await getDoc(legacyUserRef);
        if (legacyUserSnap.exists()) {
            if (legacyUserSnap.data()?.email !== currentUser.email) {
                setDoc(legacyUserRef, { email: currentUser.email }, { merge: true }).catch(() => {});
            }
            return true;
        }
    } catch {
        // Expected permission-denied for non-legacy users
    }

    try {
        const originalMemberRef = doc(db, "clubs", "club_original", "members", currentUser.uid);
        const originalMemberSnap = await getDoc(originalMemberRef);
        return originalMemberSnap.exists();
    } catch {
        // Expected permission-denied for non-club_original users
        return false;
    }
}

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
        return await Promise.race([
            promise,
            new Promise<T>((resolve) => {
                timer = setTimeout(() => resolve(fallback), ms);
            }),
        ]);
    } finally {
        if (timer) clearTimeout(timer);
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [hasClubMembership, setHasClubMembership] = useState(false);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const confirmMembership = () => {
        setHasClubMembership(true);
    };

    const refreshMembership = async (): Promise<boolean> => {
        if (!auth.currentUser) {
            setHasClubMembership(false);
            return false;
        }
        try {
            const hasMembership = await withTimeout(checkUserMembership(auth.currentUser), 6000, false);
            setHasClubMembership(hasMembership);
            if (typeof window !== "undefined") {
                localStorage.setItem(`kanpai_member_${auth.currentUser.uid}`, hasMembership ? "1" : "0");
            }
            return hasMembership;
        } catch (err) {
            console.error("Error refreshing membership:", err);
            return false;
        }
    };

    useEffect(() => {
        let settled = false;
        const safetyTimer = setTimeout(() => {
            if (!settled) {
                console.warn("[AuthProvider] Auth initialization timed out, releasing loading lock.");
                setLoading(false);
            }
        }, 8000);

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                settled = true;
                clearTimeout(safetyTimer);
                setUser(null);
                setHasClubMembership(false);
                setLoading(false);
                return;
            }

            const cachedMembership =
                typeof window !== "undefined" &&
                localStorage.getItem(`kanpai_member_${currentUser.uid}`) === "1";

            try {
                const hasMembership = await withTimeout(
                    checkUserMembership(currentUser),
                    6000,
                    cachedMembership
                );
                if (typeof window !== "undefined") {
                    localStorage.setItem(`kanpai_member_${currentUser.uid}`, hasMembership ? "1" : "0");
                }
                setHasClubMembership(hasMembership);
                setUser(currentUser);
            } catch (error) {
                console.error("Error in auth state change:", error);
                setUser(currentUser);
                setHasClubMembership(cachedMembership);
            } finally {
                settled = true;
                clearTimeout(safetyTimer);
                setLoading(false);
            }
        });
        return () => {
            clearTimeout(safetyTimer);
            unsubscribe();
        };
    }, []);

    const logout = async () => {
        try {
            await signOut(auth);
            setHasClubMembership(false);
            router.push("/login");
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    const loginWithGoogle = async (redirectTo?: string) => {
        try {
            const provider = new GoogleAuthProvider();
            const res = await signInWithPopup(auth, provider);
            const hasMembership = await checkUserMembership(res.user);
            setHasClubMembership(hasMembership);

            const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
            const queryRedirect = params?.get("redirect");
            const target = redirectTo || (queryRedirect && (queryRedirect.startsWith("/join") || queryRedirect.startsWith("/onboarding")) ? queryRedirect : null);

            if (target) {
                router.push(target);
                return;
            }

            if (!hasMembership) {
                router.push("/onboarding");
                return;
            }

            router.push("/dashboard");
        } catch (error) {
            console.error("Google login failed", error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{ user, hasClubMembership, loading, logout, loginWithGoogle, refreshMembership, confirmMembership }}>
            {children}
        </AuthContext.Provider>
    );
}
