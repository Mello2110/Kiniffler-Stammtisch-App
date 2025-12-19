"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

type TitleContextType = {
    title: string;
    setTitle: (title: string) => void;
};

const TitleContext = createContext<TitleContextType | undefined>(undefined);

export function TitleProvider({ children }: { children: React.ReactNode }) {
    const [title, setTitleState] = useState("Stammtisch");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Subscribe to global settings
        const ref = doc(db, "settings", "general");
        const unsubscribe = onSnapshot(ref, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                if (data.title) {
                    setTitleState(data.title);
                }
            } else {
                // If doc doesn't exist, create default
                setDoc(ref, { title: "Stammtisch" }, { merge: true });
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const setTitle = async (newTitle: string) => {
        // Optimistic update
        setTitleState(newTitle);
        // Write to firestore
        try {
            const ref = doc(db, "settings", "general");
            await setDoc(ref, { title: newTitle }, { merge: true });
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
