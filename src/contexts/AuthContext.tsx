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
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    hasClubMembership: false,
    loading: true,
    logout: async () => { },
    loginWithGoogle: async () => { },
    refreshMembership: async () => false,
});

export const useAuth = () => useContext(AuthContext);

async function checkUserMembership(currentUser: User): Promise<boolean> {
    const globalUserRef = doc(db, "users", currentUser.uid);
    const legacyUserRef = doc(db, "members", currentUser.uid);

    const [globalUserSnap, legacyUserSnap] = await Promise.all([
        getDoc(globalUserRef),
        getDoc(legacyUserRef),
    ]);

    if (legacyUserSnap.exists()) {
        if (legacyUserSnap.data()?.email !== currentUser.email) {
            setDoc(legacyUserRef, { email: currentUser.email }, { merge: true }).catch(() => {});
        }
        return true;
    }

    if (globalUserSnap.exists()) {
        const data = globalUserSnap.data();
        const clubIds: string[] = Array.isArray(data?.clubIds) ? data.clubIds : [];
        const targetClubId = data?.defaultClubId || clubIds[0];

        if (targetClubId) {
            const clubMemberRef = doc(db, "clubs", targetClubId, "members", currentUser.uid);
            const clubMemberSnap = await getDoc(clubMemberRef);
            if (clubMemberSnap.exists()) {
                if (clubMemberSnap.data()?.email !== currentUser.email) {
                    setDoc(clubMemberRef, { email: currentUser.email }, { merge: true }).catch(() => {});
                }
                return true;
            }
        }
        return clubIds.length > 0;
    }

    // Fallback check for legacy club_original members without /users doc
    const originalMemberRef = doc(db, "clubs", "club_original", "members", currentUser.uid);
    const originalMemberSnap = await getDoc(originalMemberRef);
    return originalMemberSnap.exists();
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [hasClubMembership, setHasClubMembership] = useState(false);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const refreshMembership = async (): Promise<boolean> => {
        if (!auth.currentUser) {
            setHasClubMembership(false);
            return false;
        }
        try {
            const hasMembership = await checkUserMembership(auth.currentUser);
            setHasClubMembership(hasMembership);
            return hasMembership;
        } catch (err) {
            console.error("Error refreshing membership:", err);
            return false;
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                setUser(null);
                setHasClubMembership(false);
                setLoading(false);
                return;
            }

            try {
                const hasMembership = await checkUserMembership(currentUser);
                setHasClubMembership(hasMembership);
                setUser(currentUser);
            } catch (error) {
                console.error("Error in auth state change:", error);
                setUser(currentUser);
                setHasClubMembership(false);
            } finally {
                setLoading(false);
            }
        });
        return () => unsubscribe();
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
        <AuthContext.Provider value={{ user, hasClubMembership, loading, logout, loginWithGoogle, refreshMembership }}>
            {children}
        </AuthContext.Provider>
    );
}
