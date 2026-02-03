"use client";

import { useState } from "react";
import { X, Loader2, Award, Calendar, Cake } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Member } from "@/types";
import { manageBirthdayEvents } from "@/lib/eventUtils";

interface EditMemberModalProps {
    member: Member;
    members: Member[];
    onClose: () => void;
}

const ROLES = [
    "Admin",
    "Gast",
    "Geschäftsführung",
    "Fußvolk",
    "Kassenwart",
    "Musikwart",
    "Organisationswart",
    "Präsident",
    "Social-Media-Wart",
    "Zeugwart"
] as const;

export function EditMemberModal({ member, members = [], onClose }: EditMemberModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [name, setName] = useState(member.name);

    // Initialize roles from member.roles if available, else fallback to member.role
    const initialRoles = member.roles && member.roles.length > 0
        ? member.roles
        : (member.role ? [member.role] : ["Fußvolk"]);

    const [selectedRoles, setSelectedRoles] = useState<string[]>(initialRoles);
    const [joinYear, setJoinYear] = useState(member.joinYear?.toString() || new Date().getFullYear().toString());
    const [birthday, setBirthday] = useState(member.birthday || "");

    // Toggle Role
    const toggleRole = (roleToCheck: string) => {
        if (roleToCheck === "Admin") {
            // Admin check: Only check if TAKEN by OTHERS.
            const isAdminTaken = members.some(m => m.id !== member.id && (m.roles?.includes("Admin") || m.role === "Admin"));
            if (isAdminTaken && !selectedRoles.includes("Admin")) {
                alert("Es gibt bereits einen Admin. Die Rolle kann nur einmal vergeben werden.");
                return;
            }
        }

        setSelectedRoles(prev =>
            prev.includes(roleToCheck)
                ? prev.filter(r => r !== roleToCheck)
                : [...prev, roleToCheck]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setIsSubmitting(true);
        try {
            const ref = doc(db, "members", member.id);
            await updateDoc(ref, {
                // Name is read-only in UI, so we don't update it to avoid accidents
                role: selectedRoles[0] || "Fußvolk", // Primary role for legacy compatibility
                roles: selectedRoles,
                joinYear: parseInt(joinYear),
                birthday: birthday,
                isAdmin: selectedRoles.includes("Admin")
            });

            // Sync calendar events
            await manageBirthdayEvents(member.id, name.trim(), birthday);

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
                            readOnly
                            className="w-full p-3 rounded-xl border bg-muted text-muted-foreground text-sm outline-none cursor-not-allowed font-semibold"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Name kann nicht geändert werden.</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                            Rolle/Titel
                        </label>
                        <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto px-1 py-2 custom-scrollbar">
                            {ROLES.map((r) => {
                                const isSelected = selectedRoles.includes(r);
                                const isTakenAdmin = r === "Admin" && members.some(m => m.id !== member.id && (m.roles?.includes("Admin") || m.role === "Admin"));

                                return (
                                    <button
                                        key={r}
                                        type="button"
                                        onClick={() => !isTakenAdmin && toggleRole(r)}
                                        disabled={isTakenAdmin}
                                        className={`group relative flex items-center justify-between p-3 rounded-xl border transition-all duration-200 ${isSelected
                                                ? "bg-primary/10 border-primary shadow-sm"
                                                : "bg-card border-border hover:border-primary/50 hover:bg-muted/50"
                                            } ${isTakenAdmin ? "opacity-50 cursor-not-allowed bg-muted/30 grayscale" : ""}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`h-5 w-5 rounded-md flex items-center justify-center border transition-colors ${isSelected
                                                    ? "bg-primary border-primary text-primary-foreground"
                                                    : "border-muted-foreground/30 bg-background group-hover:border-primary/50"
                                                }`}>
                                                {isSelected && <Award className="h-3 w-3" />}
                                            </div>
                                            <span className={`text-sm font-semibold transition-colors ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                                                {r}
                                            </span>
                                        </div>

                                        {isTakenAdmin && (
                                            <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded-full uppercase tracking-wider">
                                                Vergeben
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
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

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                            Geburtstag
                        </label>
                        <div className="relative">
                            <Cake className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <input
                                type="date"
                                value={birthday}
                                onChange={(e) => setBirthday(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
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
