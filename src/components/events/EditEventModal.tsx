"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { SetEvent, Member } from "@/types";
import { EventForm } from "./EventForm";

interface EditEventModalProps {
    event: SetEvent;
    onClose: () => void;
    members: Member[];
}

export function EditEventModal({ event, onClose, members = [] }: EditEventModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (data: any) => {
        setIsSubmitting(true);
        try {
            const ref = doc(db, "set_events", event.id);
            await updateDoc(ref, {
                title: data.title,
                description: data.description,
                time: data.time,
                location: data.location,
                hostId: data.hostId
            });
            onClose();
        } catch (error) {
            console.error("Error updating event:", error);
            alert("Failed to update event.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
            <div className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg animate-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-muted"
                >
                    <X className="h-4 w-4" />
                </button>

                <div className="mb-6">
                    <h2 className="text-xl font-bold">Edit Event</h2>
                    <p className="text-sm text-muted-foreground">Update event details.</p>
                </div>

                <EventForm
                    initialData={{
                        title: event.title,
                        description: event.description || "",
                        time: event.time || "19:00",
                        location: event.location || "",
                        hostId: event.hostId || "neutral"
                    }}
                    members={members}
                    onSubmit={handleSubmit}
                    onCancel={onClose}
                    isSubmitting={isSubmitting}
                    submitLabel="Update Event"
                />
            </div>
        </div>
    );
}
