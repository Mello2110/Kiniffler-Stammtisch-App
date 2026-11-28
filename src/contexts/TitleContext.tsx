"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { onSnapshot, setDoc, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useClub } from "@/contexts/ClubContext";

type TitleContextType = {
    title: string;
    setTitle: (title: string) => void;
};

const TitleContext = createContext<TitleContextType | undefined>(undefined);

export function TitleProvider({ children }: { children: React.ReactNode }) {
    const { clubId, club, clubDoc } = useClub();
    const [title, setTitleState] = useState(club?.name || "Stammtisch");

    useEffect(() => {
        if (club?.name) {
            setTitleState(club.name);
        }
    }, [club?.name]);

    useEffect(() => {
        if (!clubId) return;
        // Subscribe to club-specific settings/general
        const ref = clubDoc("settings", "general");
        const unsubscribe = onSnapshot(
            ref,
            (snap) => {
                if (snap.exists()) {
                    const data = snap.data();
                    if (data?.title) {
                        setTitleState(data.title);
                    }
                }
            },
            () => {
                // Ignore transient permission errors during auth/club transitions
            }
        );

        return () => unsubscribe();
    }, [clubId, clubDoc]);

    const setTitle = async (newTitle: string) => {
        setTitleState(newTitle);
        try {
            const ref = clubDoc("settings", "general");
            await setDoc(ref, { title: newTitle }, { merge: true });
            await updateDoc(doc(db, "clubs", clubId), { name: newTitle });
            if (clubId === "club_original") {
                await setDoc(doc(db, "settings", "general"), { title: newTitle }, { merge: true });
            }
        } catch (error) {
            console.error("Error setting title:", error);
        }
    };

    return (
        <TitleContext.Provider value={{ title, setTitle }}>
            {children}
        </TitleContext.Provider>
    );
}

export function useTitle() {
    const context = useContext(TitleContext);
    if (context === undefined) {
        throw new Error("useTitle must be used within a TitleProvider");
    }
    return context;
}
