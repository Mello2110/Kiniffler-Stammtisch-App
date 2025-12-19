"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type TitleContextType = {
    title: string;
    setTitle: (title: string) => void;
};

const TitleContext = createContext<TitleContextType | undefined>(undefined);

export function TitleProvider({ children }: { children: React.ReactNode }) {
    const [title, setTitleState] = useState("Stammtisch");

    useEffect(() => {
        const stored = localStorage.getItem("sidebarTitle");
        if (stored) {
            setTitleState(stored);
        }
    }, []);

    const setTitle = (newTitle: string) => {
        setTitleState(newTitle);
        localStorage.setItem("sidebarTitle", newTitle);
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
