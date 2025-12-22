"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
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
            if (currentUser) {
                // Auto-create/update member profile
                const userRef = doc(db, "members", currentUser.uid);
                const userSnap = await getDoc(userRef);

                if (!userSnap.exists()) {
                    // Create new profile
                    await setDoc(userRef, {
                        uid: currentUser.uid,
                        email: currentUser.email,
                        name: currentUser.displayName || currentUser.email?.split('@')[0] || "New Member",
                        avatarUrl: currentUser.photoURL || null,
                        role: "FussVolk",
                        roles: [],
                        points: 0,
                        joinYear: new Date().getFullYear(),
                        createdAt: serverTimestamp(),
                    });
                } else {
                    // Update existing profile with latest auth info if needed
                    // Use merge to avoid overwriting existing custom data like roles/points
                    await setDoc(userRef, {
                        email: currentUser.email,
                        // Only update name/avatar if they are missing in Firestore or if we want to sync
                        // For now, let's strictly sync email and avoid overriding custom names
                    }, { merge: true });
                }
            }
            setUser(currentUser);
            setLoading(false);
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
            await signInWithPopup(auth, provider);
            router.push("/");
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
