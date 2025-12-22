"use client";

import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

interface UseAdminResult {
    isAdmin: boolean;
    loading: boolean;
}

export function useAdmin(): UseAdminResult {
    const { user } = useAuth();
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAdmin = async () => {
            if (!user?.uid) {
                setIsAdmin(false);
                setLoading(false);
                return;
            }

            try {
                const docRef = doc(db, "members", user.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    // Check both isAdmin flag and role === "Admin" for compatibility
                    setIsAdmin(!!data.isAdmin || data.role === "Admin");
                } else {
                    setIsAdmin(false);
                }
            } catch (error) {
                console.error("Error checking admin status:", error);
                setIsAdmin(false);
            } finally {
                setLoading(false);
            }
        };

        checkAdmin();
    }, [user?.uid]);

    return { isAdmin, loading };
}
