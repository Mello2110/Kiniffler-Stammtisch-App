"use client";

import { useState } from "react";
import { X, Loader2, Award, Calendar } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Member } from "@/types";

interface EditMemberModalProps {
    member: Member;
    onClose: () => void;
}

export function EditMemberModal({ member, onClose }: EditMemberModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [name, setName] = useState(member.name);
    const [role, setRole] = useState(member.role || "");
    const [joinYear, setJoinYear] = useState(member.joinYear?.toString() || new Date().getFullYear().toString());

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setIsSubmitting(true);
        try {
            const ref = doc(db, "members", member.id);
            await updateDoc(ref, {
                name: name.trim(),
                role: role.trim(),
                joinYear: parseInt(joinYear)
            });
            onClose();
        } catch (error) {
            console.error("Error updating member:", error);
            alert("Fehler beim Aktualisieren des Mitglieds.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-card border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Award className="h-5 w-5 text-primary" />
                        Mitglied bearbeiten
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-muted rounded-full transition-colors"
                        disabled={isSubmitting}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                            Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full p-3 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all font-semibold"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                            Rolle/Titel
                        </label>
                        <div className="relative">
                            <Award className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                placeholder="z.B. Gründer, Kassenwart, Mitglied..."
                                className="w-full pl-10 pr-4 py-3 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                            Eintrittsjahr
                        </label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <input
                                type="number"
                                value={joinYear}
                                onChange={(e) => setJoinYear(e.target.value)}
                                min="1990"
                                max={new Date().getFullYear()}
                                className="w-full pl-10 pr-4 py-3 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                required
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-3 rounded-xl border bg-background hover:bg-muted font-bold transition-all disabled:opacity-50"
                        >
                            Abbrechen
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Speichern...
                                </>
                            ) : (
                                "Speichern"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
