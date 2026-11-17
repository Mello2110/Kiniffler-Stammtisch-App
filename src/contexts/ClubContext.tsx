"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    onSnapshot,
    collection,
    query,
    where,
    getDocs,
    serverTimestamp,
    CollectionReference,
    DocumentReference
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { DEFAULT_CLUB_ID, getClubCollection, getClubDoc } from "@/lib/clubPaths";
import { DEFAULT_CLUB_RULESET, DEFAULT_HALL_OF_FAME_CATEGORIES, DEFAULT_PRIMARY_HEX, DEFAULT_ACCENT_HEX } from "@/lib/defaultRuleset";
import type {
    ClubTenant,
    ClubThemeConfig,
    ClubPaymentConfig,
    ClubRulesetConfig,
    GameDisciplineId,
    GlobalUserProfile,
    HallOfFameCategoryId
} from "@/types";

interface ClubContextType {
    clubId: string;
    club: ClubTenant | null;
    availableClubs: ClubTenant[];
    loading: boolean;
    switchClub: (targetClubIdOrSlug: string) => Promise<void>;
    createNewClub: (params: {
        name: string;
        slug: string;
        primaryColor?: string;
        accentColor?: string;
        enabledGames?: GameDisciplineId[];
        paypalMeHandle?: string;
        treasuryEmail?: string;
    }) => Promise<string>;
    updateClubTheme: (theme: ClubThemeConfig) => Promise<void>;
    updateClubGames: (enabledGames: GameDisciplineId[], defaultGame?: GameDisciplineId) => Promise<void>;
    updateClubPaymentConfig: (paymentConfig: Partial<ClubPaymentConfig>) => Promise<void>;
    updateClubRuleset: (ruleset: ClubRulesetConfig) => Promise<void>;
    updateClubHallOfFameCategories: (categories: HallOfFameCategoryId[]) => Promise<void>;
    clubCollection: <T = any>(collectionName: string, ...segments: string[]) => CollectionReference<T>;
    clubDoc: <T = any>(collectionName: string, docId: string, ...segments: string[]) => DocumentReference<T>;
}

const DEFAULT_CLUB_FALLBACK: ClubTenant = {
    id: DEFAULT_CLUB_ID,
    slug: "stammtisch",
    name: "Stammtisch",
    subtitle: "The Original Kniffel & Stammtisch Crew",
    creatorUid: "",
    enabledGames: ["kniffel", "schocken", "kegeln"],
    defaultGame: "kniffel",
    theme: {
        primaryColor: DEFAULT_PRIMARY_HEX,
        accentColor: DEFAULT_ACCENT_HEX,
        mode: "dark"
    },
    paymentConfig: {
        paypalMeHandle: "",
        treasuryEmail: "thekiniffler@icloud.com",
        monthlyContributionEur: 15,
        defaultPenaltyEur: 1,
        currency: "EUR",
        paymentSyncMode: "imap_legacy"
    },
    cashConfig: {
        startingBalance: 714.65
    },
    ruleset: DEFAULT_CLUB_RULESET
};

const ClubContext = createContext<ClubContextType>({
    clubId: DEFAULT_CLUB_ID,
    club: DEFAULT_CLUB_FALLBACK,
    availableClubs: [DEFAULT_CLUB_FALLBACK],
    loading: true,
    switchClub: async () => {},
    createNewClub: async () => DEFAULT_CLUB_ID,
    updateClubTheme: async () => {},
    updateClubGames: async () => {},
    updateClubPaymentConfig: async () => {},
    updateClubRuleset: async () => {},
    updateClubHallOfFameCategories: async () => {},
    clubCollection: (col, ...seg) => getClubCollection(DEFAULT_CLUB_ID, col, ...seg),
    clubDoc: (col, id, ...seg) => getClubDoc(DEFAULT_CLUB_ID, col, id, ...seg),
});

export function ClubProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [clubId, setClubId] = useState<string>(DEFAULT_CLUB_ID);
    const [club, setClub] = useState<ClubTenant | null>(DEFAULT_CLUB_FALLBACK);
    const [availableClubs, setAvailableClubs] = useState<ClubTenant[]>([DEFAULT_CLUB_FALLBACK]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        if (!user) {
            setClubId(DEFAULT_CLUB_ID);
            setLoading(false);
            return;
        }

        let isMounted = true;
        const loadUserClubs = async () => {
            try {
                const storedClubId = typeof window !== "undefined" ? localStorage.getItem("kanpai_active_club_id") : null;
                const userProfileRef = doc(db, "users", user.uid);
                const userProfileSnap = await getDoc(userProfileRef);

                let clubIds: string[] = [DEFAULT_CLUB_ID];
                let defaultId = DEFAULT_CLUB_ID;

                if (userProfileSnap.exists()) {
                    const data = userProfileSnap.data() as GlobalUserProfile;
                    if (Array.isArray(data.clubIds) && data.clubIds.length > 0) {
                        clubIds = data.clubIds;
                    }
                    if (data.defaultClubId) {
                        defaultId = data.defaultClubId;
                    }
                }

                const clubSnaps = await Promise.all(
                    clubIds.map((cid) => getDoc(doc(db, "clubs", cid)))
                );
                const loadedClubs: ClubTenant[] = clubSnaps
                    .filter((cSnap) => cSnap.exists())
                    .map((cSnap) => ({ id: cSnap.id, ...cSnap.data() } as ClubTenant));

                if (isMounted) {
                    if (loadedClubs.length > 0) {
                        setAvailableClubs(loadedClubs);
                    }
                    const targetId = storedClubId && clubIds.includes(storedClubId) ? storedClubId : defaultId;
                    setClubId(targetId);
                }
            } catch (err) {
                console.error("Error loading user clubs:", err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadUserClubs();
        return () => { isMounted = false; };
    }, [user]);

    useEffect(() => {
        if (!clubId) return;

        const clubRef = doc(db, "clubs", clubId);
        const unsubscribe = onSnapshot(
            clubRef,
            (snap) => {
                if (snap.exists()) {
                    const data = snap.data();
                    // Wenn noch die alte lila Default-Farbe (#8B5CF6) in Firestore stand, nutzen wir #854d59 & #578d8e
                    const rawPrimary = data.theme?.primaryColor;
                    const rawAccent = data.theme?.accentColor;
                    const resolvedPrimary = (!rawPrimary || rawPrimary.toUpperCase() === "#8B5CF6")
                        ? DEFAULT_PRIMARY_HEX
                        : rawPrimary;
                    const resolvedAccent = (!rawAccent || (rawPrimary?.toUpperCase() === "#8B5CF6" && rawAccent.toUpperCase() === "#F59E0B"))
                        ? DEFAULT_ACCENT_HEX
                        : rawAccent;

                    setClub({
                        ...DEFAULT_CLUB_FALLBACK,
                        ...data,
                        id: snap.id,
                        theme: {
                            ...DEFAULT_CLUB_FALLBACK.theme,
                            ...(data.theme || {}),
                            primaryColor: resolvedPrimary,
                            accentColor: resolvedAccent
                        },
                        paymentConfig: {
                            ...DEFAULT_CLUB_FALLBACK.paymentConfig,
                            ...(data.paymentConfig || {})
                        },
                        cashConfig: {
                            ...DEFAULT_CLUB_FALLBACK.cashConfig,
                            ...(data.cashConfig || {})
                        },
                        ruleset: {
                            kniffel: { ...DEFAULT_CLUB_RULESET.kniffel, ...(data.ruleset?.kniffel || {}) },
                            schocken: { ...DEFAULT_CLUB_RULESET.schocken, ...(data.ruleset?.schocken || {}) },
                            kegeln: { ...DEFAULT_CLUB_RULESET.kegeln, ...(data.ruleset?.kegeln || {}) },
                            customPenaltyCatalog: data.ruleset?.customPenaltyCatalog || DEFAULT_CLUB_RULESET.customPenaltyCatalog
                        },
                        hallOfFameCategories: Array.isArray(data.hallOfFameCategories)
                            ? data.hallOfFameCategories
                            : DEFAULT_HALL_OF_FAME_CATEGORIES
                    } as ClubTenant);
                } else if (clubId === DEFAULT_CLUB_ID) {
                    setClub(DEFAULT_CLUB_FALLBACK);
                }
            },
            (err) => {
                console.error(`Error subscribing to club ${clubId}:`, err);
            }
        );

        return () => unsubscribe();
    }, [clubId]);

    const switchClub = useCallback(async (targetClubIdOrSlug: string) => {
        const matched = availableClubs.find(
            c => c.id === targetClubIdOrSlug || c.slug === targetClubIdOrSlug
        );
        if (matched) {
            setClubId(matched.id);
            if (typeof window !== "undefined") {
                localStorage.setItem("kanpai_active_club_id", matched.id);
            }
            return;
        }

        const directSnap = await getDoc(doc(db, "clubs", targetClubIdOrSlug));
        if (directSnap.exists()) {
            setClubId(directSnap.id);
            if (typeof window !== "undefined") {
                localStorage.setItem("kanpai_active_club_id", directSnap.id);
            }
            return;
        }

        const slugQ = query(collection(db, "clubs"), where("slug", "==", targetClubIdOrSlug));
        const slugSnap = await getDocs(slugQ);
        if (!slugSnap.empty) {
            const foundDoc = slugSnap.docs[0];
            setClubId(foundDoc.id);
            if (typeof window !== "undefined") {
                localStorage.setItem("kanpai_active_club_id", foundDoc.id);
            }
        }
    }, [availableClubs]);

    const createNewClub = useCallback(async (params: {
        name: string;
        slug: string;
        primaryColor?: string;
        accentColor?: string;
        enabledGames?: GameDisciplineId[];
        paypalMeHandle?: string;
        treasuryEmail?: string;
    }): Promise<string> => {
        if (!user) throw new Error("Authentication required to create a club");

        const cleanSlug = params.slug
            .toLowerCase()
            .replace(/[^a-z0-9-_]/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "") || `club-${Date.now()}`;

        const newClubId = `club_${cleanSlug}_${Math.random().toString(36).slice(2, 7)}`;
        const enabledGames: GameDisciplineId[] = params.enabledGames?.length
            ? params.enabledGames
            : ["kniffel", "schocken", "kegeln"];

        const newClubData: ClubTenant = {
            id: newClubId,
            slug: cleanSlug,
            name: params.name.trim() || "Neuer Verein",
            subtitle: "KANPAI Club Workspace",
            creatorUid: user.uid,
            enabledGames,
            defaultGame: enabledGames[0],
            theme: {
                primaryColor: params.primaryColor || DEFAULT_PRIMARY_HEX,
                accentColor: params.accentColor || DEFAULT_ACCENT_HEX,
                mode: "dark"
            },
            paymentConfig: {
                paypalMeHandle: params.paypalMeHandle || "",
                treasuryEmail: params.treasuryEmail || user.email || "",
                monthlyContributionEur: 15,
                defaultPenaltyEur: 1,
                currency: "EUR",
                paymentSyncMode: "manual_confirm"
            },
            cashConfig: {
                startingBalance: 0
            },
            ruleset: DEFAULT_CLUB_RULESET,
            createdAt: serverTimestamp()
        };

        await setDoc(doc(db, "clubs", newClubId), newClubData);

        await setDoc(doc(db, "clubs", newClubId, "members", user.uid), {
            id: user.uid,
            name: user.displayName || user.email?.split("@")[0] || "Admin",
            email: user.email || "",
            role: "Admin",
            roles: ["Admin"],
            isAdmin: true,
            points: 0,
            tokenBalance: 5,
            tokenShinyBalance: 0,
            joinYear: new Date().getFullYear(),
            createdAt: serverTimestamp()
        });

        await setDoc(doc(db, "clubs", newClubId, "config", "cash"), { startingBalance: 0 });
        await setDoc(doc(db, "clubs", newClubId, "settings", "general"), { title: newClubData.name });

        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        const existingClubs = userSnap.exists() ? (userSnap.data().clubIds || [DEFAULT_CLUB_ID]) : [DEFAULT_CLUB_ID];
        const nextClubs = Array.from(new Set([...existingClubs, newClubId]));
        await setDoc(userRef, {
            uid: user.uid,
            email: user.email || "",
            clubIds: nextClubs,
            defaultClubId: newClubId,
            updatedAt: serverTimestamp()
        }, { merge: true });

        setAvailableClubs(prev => [...prev, newClubData]);
        setClubId(newClubId);
        if (typeof window !== "undefined") {
            localStorage.setItem("kanpai_active_club_id", newClubId);
        }

        return newClubId;
    }, [user]);

    const updateClubTheme = useCallback(async (theme: ClubThemeConfig) => {
        if (!clubId) return;
        await updateDoc(doc(db, "clubs", clubId), {
            theme
        });
    }, [clubId]);

    const updateClubGames = useCallback(async (enabledGames: GameDisciplineId[], defaultGame?: GameDisciplineId) => {
        if (!clubId || enabledGames.length === 0) return;
        await updateDoc(doc(db, "clubs", clubId), {
            enabledGames,
            defaultGame: defaultGame || enabledGames[0]
        });
    }, [clubId]);

    const updateClubPaymentConfig = useCallback(async (paymentConfig: Partial<ClubPaymentConfig>) => {
        if (!clubId || !club) return;
        const merged: ClubPaymentConfig = {
            ...club.paymentConfig,
            ...paymentConfig
        };
        await updateDoc(doc(db, "clubs", clubId), {
            paymentConfig: merged
        });
    }, [clubId, club]);

    const updateClubRuleset = useCallback(async (ruleset: ClubRulesetConfig) => {
        if (!clubId) return;
        await updateDoc(doc(db, "clubs", clubId), {
            ruleset
        });
    }, [clubId]);

    const updateClubHallOfFameCategories = useCallback(async (hallOfFameCategories: HallOfFameCategoryId[]) => {
        if (!clubId) return;
        await updateDoc(doc(db, "clubs", clubId), {
            hallOfFameCategories
        });
    }, [clubId]);

    const clubCollectionHelper = useCallback(
        <T = any>(collectionName: string, ...segments: string[]) => getClubCollection<T>(clubId, collectionName, ...segments),
        [clubId]
    );

    const clubDocHelper = useCallback(
        <T = any>(collectionName: string, docId: string, ...segments: string[]) => getClubDoc<T>(clubId, collectionName, docId, ...segments),
        [clubId]
    );

    const value = useMemo(() => ({
        clubId,
        club,
        availableClubs,
        loading,
        switchClub,
        createNewClub,
        updateClubTheme,
        updateClubGames,
        updateClubPaymentConfig,
        updateClubRuleset,
        updateClubHallOfFameCategories,
        clubCollection: clubCollectionHelper,
        clubDoc: clubDocHelper
    }), [
        clubId,
        club,
        availableClubs,
        loading,
        switchClub,
        createNewClub,
        updateClubTheme,
        updateClubGames,
        updateClubPaymentConfig,
        updateClubRuleset,
        updateClubHallOfFameCategories,
        clubCollectionHelper,
        clubDocHelper
    ]);

    return (
        <ClubContext.Provider value={value}>
            {children}
        </ClubContext.Provider>
    );
}

export function useClub() {
    return useContext(ClubContext);
}
