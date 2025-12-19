"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { dictionaries, Language } from '@/lib/dictionaries';

type LanguageContextType = {
    language: Language;
    setLanguage: (lang: Language) => void;
    dict: typeof dictionaries['en'];
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    // Default to German if strictly requested, but English is safer default. User asked for German/English/Polish.
    // Using 'de' as default since existing text was German mix.
    const [language, setLanguageState] = useState<Language>('de');

    useEffect(() => {
        const stored = localStorage.getItem('stammtisch-lang') as Language;
        if (stored && ['en', 'de', 'pl'].includes(stored)) {
            setLanguageState(stored);
        }
    }, []);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('stammtisch-lang', lang);
    };

    const value = {
        language,
        setLanguage,
        dict: dictionaries[language]
    };

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
