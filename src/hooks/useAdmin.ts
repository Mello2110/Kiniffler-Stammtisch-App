"use client";

import { useState, useEffect } from "react";
import { getDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useClub } from "@/contexts/ClubContext";

interface UseAdminResult {
    isAdmin: boolean;
    loading: boolean;
}

export function useAdmin(): UseAdminResult {
    const { user } = useAuth();
    const { clubId, clubDoc } = useClub();
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
                const docRef = clubDoc("members", user.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
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
    }, [user?.uid, clubId, clubDoc]);

    return { isAdmin, loading };
}
