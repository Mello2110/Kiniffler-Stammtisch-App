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
                // Verify user is an authorized member
                const userRef = doc(db, "members", currentUser.uid);
                const userSnap = await getDoc(userRef);

                if (!userSnap.exists()) {
                    // Registration paused: Unauthorized users are immediately signed out
                    console.warn("Unauthorized login rejected - user not in members:", currentUser.uid);
                    await signOut(auth);
                    setUser(null);
                    setLoading(false);
                    return;
                }

                // Update existing profile with latest auth info if needed
                await setDoc(userRef, {
                    email: currentUser.email,
                }, { merge: true });

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

            // Double check member document
            const userRef = doc(db, "members", res.user.uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                await signOut(auth);
                throw new Error("NOT_REGISTERED");
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
