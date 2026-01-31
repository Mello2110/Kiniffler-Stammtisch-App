"use client";

import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PlayerSelectionModal } from "./PlayerSelectionModal";
import type { Member, KniffelScores, GuestPlayer } from "@/types";

interface AddSheetModalProps {
    isOpen: boolean;
    onClose: () => void;
    members: Member[];
    selectedYear: number;
    selectedMonth: number;
}

export function AddSheetModal({
    isOpen,
    onClose,
    members,
    selectedYear,
    selectedMonth
}: AddSheetModalProps) {
    const handleCreateGame = async (data: { selectedPlayerIds: string[]; guests: GuestPlayer[] }) => {
        const { selectedPlayerIds, guests } = data;

        try {
            // Create empty scores object for each field
            const emptyScores: KniffelScores = {
                ones: null,
                twos: null,
                threes: null,
                fours: null,
                fives: null,
                sixes: null,
                threeOfAKind: null,
                fourOfAKind: null,
                fullHouse: null,
                smallStraight: null,
                largeStraight: null,
                kniffel: null,
                chance: null
            };

            // Build scores object with selected players (members + guests)
            const scores = selectedPlayerIds.reduce((acc, playerId) => {
                acc[playerId] = { ...emptyScores };
                return acc;
            }, {} as Record<string, KniffelScores>);

            // Filter out guest IDs to get only member IDs
            const memberIds = selectedPlayerIds.filter(id => !id.startsWith('guest_'));

            // Create the game sheet in Firestore
            await addDoc(collection(db, "kniffelSheets"), {
                year: selectedYear,
                month: selectedMonth,
                memberSnapshot: memberIds, // Only member IDs
                playerOrder: selectedPlayerIds, // All player IDs (members + guests) in selection order
                guests: guests, // Guest player data
                scores,
                createdAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Error creating game sheet:", error);
        }
    };

    return (
        <PlayerSelectionModal
            isOpen={isOpen}
            onClose={onClose}
            members={members}
            onCreateGame={handleCreateGame}
        />
    );
}
