"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";

interface AuthContextType {
    user: User | null;
    loading: boolean;
    logout: () => Promise<void>;
    loginWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    logout: async () => { },
    loginWithGoogle: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                setUser(null);
                setLoading(false);
                return;
            }

            try {
                const globalUserRef = doc(db, "users", currentUser.uid);
                const legacyUserRef = doc(db, "members", currentUser.uid);

                // Parallel fetch instead of sequential waterfall
                const [globalUserSnap, legacyUserSnap] = await Promise.all([
                    getDoc(globalUserRef),
                    getDoc(legacyUserRef),
                ]);

                let targetClubId = "club_original";
                if (globalUserSnap.exists() && globalUserSnap.data().defaultClubId) {
                    targetClubId = globalUserSnap.data().defaultClubId;
                }

                const clubMemberRef = doc(db, "clubs", targetClubId, "members", currentUser.uid);
                const clubMemberSnap = await getDoc(clubMemberRef);

                const isInviteFlow =
                    typeof window !== "undefined" &&
                    (window.location.pathname.startsWith("/join") ||
                        (window.location.pathname === "/login" && window.location.search.includes("join")));

                if (!clubMemberSnap.exists() && !legacyUserSnap.exists() && !isInviteFlow) {
                    console.warn("Unauthorized login rejected - user not in club members:", currentUser.uid);
                    await signOut(auth);
                    setUser(null);
                    setLoading(false);
                    return;
                }

                // Only sync email in background if it actually changed (no blocking writes on reload)
                if (clubMemberSnap.exists() && clubMemberSnap.data()?.email !== currentUser.email) {
                    setDoc(clubMemberRef, { email: currentUser.email }, { merge: true }).catch(() => {});
                }
                if (legacyUserSnap.exists() && legacyUserSnap.data()?.email !== currentUser.email) {
                    setDoc(legacyUserRef, { email: currentUser.email }, { merge: true }).catch(() => {});
                }

                setUser(currentUser);
            } catch (error) {
                console.error("Error in auth state change:", error);
                setUser(null);
            } finally {
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    const logout = async () => {
        try {
            await signOut(auth);
            router.push("/login");
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    const loginWithGoogle = async () => {
        try {
            const provider = new GoogleAuthProvider();
            const res = await signInWithPopup(auth, provider);

            // Double check member document (multi-tenant or legacy)
            const globalUserSnap = await getDoc(doc(db, "users", res.user.uid));
            const targetClubId = globalUserSnap.exists() ? (globalUserSnap.data().defaultClubId || "club_original") : "club_original";
            const clubMemberSnap = await getDoc(doc(db, "clubs", targetClubId, "members", res.user.uid));
            const userSnap = await getDoc(doc(db, "members", res.user.uid));

            const isInviteFlow =
                typeof window !== "undefined" &&
                (window.location.pathname.startsWith("/join") ||
                    window.location.search.includes("join"));

            if (!clubMemberSnap.exists() && !userSnap.exists() && !isInviteFlow) {
                await signOut(auth);
                throw new Error("NOT_REGISTERED");
            }

            if (isInviteFlow && typeof window !== "undefined") {
                const params = new URLSearchParams(window.location.search);
                const redirectTarget = params.get("redirect");
                if (redirectTarget && redirectTarget.startsWith("/join")) {
                    router.push(redirectTarget);
                    return;
                }
            }

            router.push("/dashboard");
        } catch (error) {
            console.error("Google login failed", error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, logout, loginWithGoogle }}>
            {children}
        </AuthContext.Provider>
    );
}
