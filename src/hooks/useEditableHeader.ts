"use client";

import { useState, useEffect, useCallback } from "react";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

interface UseEditableHeaderResult {
    text: string;
    isEditing: boolean;
    editValue: string;
    setIsEditing: (editing: boolean) => void;
    setEditValue: (value: string) => void;
    handleSave: () => Promise<void>;
    handleCancel: () => void;
}

export function useEditableHeader(
    pageId: string,
    headerId: string,
    defaultText: string
): UseEditableHeaderResult {
    const { user } = useAuth();
    const [text, setText] = useState(defaultText);
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(defaultText);

    // Subscribe to Firestore for real-time updates
    useEffect(() => {
        const docRef = doc(db, "customizations", pageId, "headers", headerId);

        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const customText = docSnap.data().text;
                if (customText) {
                    setText(customText);
                    if (!isEditing) {
                        setEditValue(customText);
                    }
                }
            } else {
                setText(defaultText);
                if (!isEditing) {
                    setEditValue(defaultText);
                }
            }
        }, (error) => {
            console.error("Error listening to header customization:", error);
        });

        return () => unsubscribe();
    }, [pageId, headerId, defaultText, isEditing]);

    const handleSave = useCallback(async () => {
        const trimmedValue = editValue.trim();
        if (!trimmedValue) {
            setEditValue(text);
            setIsEditing(false);
            return;
        }

        try {
            const docRef = doc(db, "customizations", pageId, "headers", headerId);
            await setDoc(docRef, {
                text: trimmedValue,
                updatedBy: user?.uid || "anonymous",
                updatedAt: serverTimestamp()
            });
            setIsEditing(false);
        } catch (error) {
            console.error("Error saving header customization:", error);
            setEditValue(text);
            setIsEditing(false);
        }
    }, [editValue, pageId, headerId, user?.uid, text]);

    const handleCancel = useCallback(() => {
        setEditValue(text);
        setIsEditing(false);
    }, [text]);

    return {
        text,
        isEditing,
        editValue,
        setIsEditing,
        setEditValue,
        handleSave,
        handleCancel
    };
}
