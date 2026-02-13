"use client";

import { useState } from "react";
import { Clock, MapPin } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Member } from "@/types";

interface EventFormData {
    title: string;
    description: string;
    date: string;
    time: string;
    location: string;
    hostId: string;
}

interface EventFormProps {
    initialData?: Partial<EventFormData>;
    members: Member[];
    onSubmit: (data: EventFormData) => Promise<void>;
    onCancel: () => void;
    isSubmitting: boolean;
    submitLabel?: string;
}

export function EventForm({ initialData, members, onSubmit, onCancel, isSubmitting, submitLabel }: EventFormProps) {
    const { dict } = useLanguage();

    // Default values if initialData is missing
    const [title, setTitle] = useState(initialData?.title || "");
    const [description, setDescription] = useState(initialData?.description || "");
    const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState(initialData?.time || "19:00");
    const [location, setLocation] = useState(initialData?.location || "");
    const [hostId, setHostId] = useState(initialData?.hostId || "neutral");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSubmit({
            title,
            description,
            date,
            time,
            location,
            hostId
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <label className="text-sm font-medium">{dict.events.modal.form.title}</label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={dict.events.modal.form.placeholder}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    required
                    autoFocus
                />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">{dict.events.modal.form.host}</label>
                <select
                    value={hostId}
                    onChange={(e) => setHostId(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <option value="neutral">{dict.events.modal.form.neutral}</option>
                    {members.map(member => (
                        <option key={member.id} value={member.id}>
                            {member.name}
                        </option>
                    ))}
                </select>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Date</label>
                <div className="relative">
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        required
                    />
                </div>
            </div>

            <div className="grid grid-cols-[2fr_3fr] md:grid-cols-2 gap-2 md:gap-4">
                <div className="min-w-0 overflow-hidden space-y-2">
                    <label className="text-sm font-medium">{dict.events.modal.form.time}</label>
                    <div className="relative">
                        <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className="w-full rounded-md border border-input bg-background pl-9 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                    </div>
                </div>
                <div className="min-w-0 overflow-hidden space-y-2">
                    <label className="text-sm font-medium">{dict.events.modal.form.location}</label>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder={dict.events.modal.form.venuePlaceholder}
                            className="w-full rounded-md border border-input bg-background pl-9 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">{dict.events.modal.form.desc}</label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={dict.events.modal.form.descPlaceholder}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[80px]"
                />
            </div>

            <div className="flex gap-2 pt-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 rounded-md border border-input bg-background py-2 text-sm font-medium hover:bg-muted"
                >
                    {dict.events.modal.form.back}
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting || !title.trim()}
                    className="flex-1 rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                    {isSubmitting ? dict.events.modal.form.saving : (submitLabel || dict.events.modal.form.create)}
                </button>
            </div>
        </form>
    );
}
