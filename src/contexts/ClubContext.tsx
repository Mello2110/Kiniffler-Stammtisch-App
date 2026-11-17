"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import {
    doc,
    getDoc,
    updateDoc,
    onSnapshot,
    collection,
    query,
    where,
    getDocs,
    CollectionReference,
    DocumentReference
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebase";
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

interface CreateClubParams {
    name: string;
    slug?: string;
    displayName?: string;
    primaryColor?: string;
    accentColor?: string;
    enabledGames?: GameDisciplineId[];
    paypalMeHandle?: string;
    treasuryEmail?: string;
    monthlyContributionEur?: number;
}

interface ClubContextType {
    clubId: string;
    club: ClubTenant | null;
    availableClubs: ClubTenant[];
    loading: boolean;
    switchClub: (targetClubIdOrSlug: string) => Promise<void>;
    createNewClub: (params: CreateClubParams) => Promise<{ clubId: string; inviteCode: string }>;
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
    createNewClub: async () => ({ clubId: DEFAULT_CLUB_ID, inviteCode: "" }),
    updateClubTheme: async () => {},
    updateClubGames: async () => {},
    updateClubPaymentConfig: async () => {},
    updateClubRuleset: async () => {},
    updateClubHallOfFameCategories: async () => {},
    clubCollection: (col, ...seg) => getClubCollection(DEFAULT_CLUB_ID, col, ...seg),
    clubDoc: (col, id, ...seg) => getClubDoc(DEFAULT_CLUB_ID, col, id, ...seg),
});

export function ClubProvider({ children }: { children: React.ReactNode }) {
    const { user, confirmMembership, refreshMembership } = useAuth();
    const [clubId, setClubId] = useState<string>("");
    const [club, setClub] = useState<ClubTenant | null>(DEFAULT_CLUB_FALLBACK);
    const [availableClubs, setAvailableClubs] = useState<ClubTenant[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        if (!user) {
            setClubId("");
            setAvailableClubs([]);
            setClub(DEFAULT_CLUB_FALLBACK);
            setLoading(false);
            return;
        }

        let isMounted = true;
        const loadUserClubs = async () => {
            setLoading(true);
            try {
                const storedClubId = typeof window !== "undefined" ? localStorage.getItem("kanpai_active_club_id") : null;
                const userProfileSnap = await getDoc(doc(db, "users", user.uid));

                let clubIds: string[] = [];
                let defaultId = "";

                if (userProfileSnap.exists()) {
                    const data = userProfileSnap.data() as GlobalUserProfile;
                    if (Array.isArray(data.clubIds) && data.clubIds.length > 0) {
                        clubIds = data.clubIds;
                    }
                    if (data.defaultClubId) {
                        defaultId = data.defaultClubId;
                    }
                } else {
                    try {
                        const legacyMemberSnap = await getDoc(doc(db, "members", user.uid));
                        if (legacyMemberSnap.exists()) {
                            clubIds = [DEFAULT_CLUB_ID];
                            defaultId = DEFAULT_CLUB_ID;
                        }
                    } catch {
                        // Expected permission-denied for non-legacy users
                    }

                    if (clubIds.length === 0) {
                        try {
                            const originalMemberSnap = await getDoc(doc(db, "clubs", DEFAULT_CLUB_ID, "members", user.uid));
                            if (originalMemberSnap.exists()) {
                                clubIds = [DEFAULT_CLUB_ID];
                                defaultId = DEFAULT_CLUB_ID;
                            }
                        } catch {
                            // Expected permission-denied for non-club_original users
                        }
                    }
                }

                if (clubIds.length === 0) {
                    if (isMounted) {
                        setAvailableClubs([]);
                        setClubId("");
                        setClub(DEFAULT_CLUB_FALLBACK);
                    }
                    return;
                }

                const clubSnaps = await Promise.all(
                    clubIds.map((cid) => getDoc(doc(db, "clubs", cid)))
                );
                const loadedClubs: ClubTenant[] = clubSnaps
                    .filter((cSnap) => cSnap.exists())
                    .map((cSnap) => ({ id: cSnap.id, ...cSnap.data() } as ClubTenant));

                if (isMounted) {
                    setAvailableClubs(loadedClubs);
                    const fallbackId = loadedClubs[0]?.id || clubIds[0];
                    const targetId = storedClubId && clubIds.includes(storedClubId)
                        ? storedClubId
                        : (defaultId && clubIds.includes(defaultId) ? defaultId : fallbackId);
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
        if (!user || !clubId) return;

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
            const loaded = { id: directSnap.id, ...directSnap.data() } as ClubTenant;
            setAvailableClubs((prev) => [...prev.filter((c) => c.id !== loaded.id), loaded]);
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
            const loaded = { id: foundDoc.id, ...foundDoc.data() } as ClubTenant;
            setAvailableClubs((prev) => [...prev.filter((c) => c.id !== loaded.id), loaded]);
            setClubId(foundDoc.id);
            if (typeof window !== "undefined") {
                localStorage.setItem("kanpai_active_club_id", foundDoc.id);
            }
        }
    }, [availableClubs]);

    const createNewClub = useCallback(async (params: CreateClubParams): Promise<{ clubId: string; inviteCode: string }> => {
        if (!user) throw new Error("Authentication required to create a club");

        const fn = httpsCallable<CreateClubParams, { success: boolean; clubId: string; slug: string; clubName: string; inviteCode: string }>(
            functions,
            "createClub"
        );
        const res = await fn(params);
        const { clubId: newClubId, inviteCode, slug, clubName } = res.data;

        confirmMembership();
        setClubId(newClubId);
        if (typeof window !== "undefined") {
            localStorage.setItem("kanpai_active_club_id", newClubId);
        }

        try {
            const clubSnap = await getDoc(doc(db, "clubs", newClubId));
            if (clubSnap.exists()) {
                const loadedClub = { id: clubSnap.id, ...clubSnap.data() } as ClubTenant;
                setAvailableClubs((prev) => {
                    const withoutDup = prev.filter((c) => c.id !== newClubId);
                    return [...withoutDup, loadedClub];
                });
            }
        } catch (err) {
            console.warn("Could not immediately fetch newly created club doc, onSnapshot will sync:", err);
            const fallbackTenant: ClubTenant = {
                ...DEFAULT_CLUB_FALLBACK,
                id: newClubId,
                slug: slug || params.slug || "club",
                name: clubName || params.name,
                creatorUid: user.uid,
            };
            setAvailableClubs((prev) => [...prev.filter((c) => c.id !== newClubId), fallbackTenant]);
        }

        refreshMembership().catch(() => {});

        return { clubId: newClubId, inviteCode };
    }, [user, confirmMembership, refreshMembership]);

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
        <T = any>(collectionName: string, ...segments: string[]) => getClubCollection<T>(clubId || DEFAULT_CLUB_ID, collectionName, ...segments),
        [clubId]
    );

    const clubDocHelper = useCallback(
        <T = any>(collectionName: string, docId: string, ...segments: string[]) => getClubDoc<T>(clubId || DEFAULT_CLUB_ID, collectionName, docId, ...segments),
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
