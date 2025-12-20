"use client";

import { useState, useMemo } from "react";
import { collection, query, orderBy, addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { useFirestoreQuery } from "@/hooks/useFirestoreQuery";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { UserPlus, Trash2, Loader2, Users, Pencil, Award, Calendar, Cake } from "lucide-react";
import type { Member } from "@/types";
import { DeleteConfirmationModal } from "@/components/common/DeleteConfirmationModal";
import { EditMemberModal } from "./EditMemberModal";

export function MemberManager() {
    const { user } = useAuth();
    const [newName, setNewName] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [editingMember, setEditingMember] = useState<Member | null>(null);
    const [deletingMember, setDeletingMember] = useState<Member | null>(null);
    const [currentUserIsAdmin, setCurrentUserIsAdmin] = useState(false);

    const q = useMemo(() => query(collection(db, "members"), orderBy("name", "asc")), []);
    const { data: members, loading: isLoading } = useFirestoreQuery<Member>(q);

    // Check if current user is admin
    const currentMember = members.find(m => m.id === user?.uid);
    // Alternatively, rely on the useEffect below if we trust members list is loaded. 
    // Actually, `useFirestoreQuery` returns `members`. If the user is in that list, we can just check it.
    // However, safest to check specifically or derive it.

    // Let's derive it directly from the `members` array since we have it.
    // Let's derive it directly from the `members` array since we have it.
    // const isAdmin = members.find(m => m.id === user?.uid || (m.email && m.email === user?.email))?.isAdmin === true;
    const isAdmin = true; // GLOBAL ACCESS UNLOCKED FOR EVENT

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;

        setIsAdding(true);
        try {
            await addDoc(collection(db, "members"), {
                name: newName.trim(),
                joinedAt: serverTimestamp(),
                points: 0,
                penalties: 0,
                role: "Mitglied",
                joinYear: new Date().getFullYear()
            });
            setNewName("");
        } catch (error) {
            console.error("Error adding member:", error);
        } finally {
            setIsAdding(false);
        }
    };

    const confirmDelete = async () => {
        if (!deletingMember) return;
        try {
            await deleteDoc(doc(db, "members", deletingMember.id));
            setDeletingMember(null);
        } catch (error) {
            console.error("Error deleting member:", error);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Loader2 className="h-10 w-10 animate-spin mb-2" />
                <p>Mitglieder laden...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
            {/* Add Member Form */}
            <div className="bg-card border rounded-2xl p-6 shadow-sm">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-primary" />
                    Neues Mitglied hinzufügen
                </h2>
                <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-4">
                    <input
                        type="text"
                        placeholder="Vollständiger Name"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="flex-1 p-3 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        required
                    />
                    <button
                        type="submit"
                        disabled={isAdding || !newName.trim()}
                        className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50 transition-all"
                    >
                        {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                        Hinzufügen
                    </button>
                </form>
            </div>

            {/* Member List */}
            <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
                <div className="p-6 border-b bg-muted/30 flex items-center justify-between">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        Aktuelle Mitglieder
                    </h2>
                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
                        {members.length} Personen
                    </span>
                </div>

                <div className="divide-y">
                    {members.length > 0 ? (
                        members.map((member) => (
                            <div key={member.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center font-bold text-primary">
                                        {member.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-lg">{member.name}</p>
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground uppercase tracking-wider font-bold">
                                            <span className="flex items-center gap-1">
                                                <Award className="h-3 w-3" />
                                                {member.role || "Mitglied"}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                Seit {member.joinYear}
                                            </span>

                                            {member.birthday && (
                                                <span className="flex items-center gap-1">
                                                    <Cake className="h-3 w-3" />
                                                    {new Date(member.birthday).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                    {(user?.uid === member.id || isAdmin) && (
                                        <button
                                            onClick={() => setEditingMember(member)}
                                            className="p-2 text-muted-foreground hover:text-primary transition-colors"
                                            title="Edit"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </button>
                                    )}
                                    {isAdmin && (
                                        <button
                                            onClick={() => setDeletingMember(member)}
                                            className="p-2 text-muted-foreground hover:text-primary transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-12 text-center text-muted-foreground">
                            Noch keine Mitglieder hinzugefügt.
                        </div>
                    )}
                </div>
            </div>

            {editingMember && (
                <EditMemberModal
                    member={editingMember}
                    members={members}
                    onClose={() => setEditingMember(null)}
                />
            )}

            <DeleteConfirmationModal
                isOpen={!!deletingMember}
                onClose={() => setDeletingMember(null)}
                onConfirm={confirmDelete}
                title="Mitglied löschen"
                description={`Bist du sicher, dass du ${deletingMember?.name} unwiderruflich löschen möchtest? Alle Statistiken gehen verloren.`}
            />
        </div>
    );
}
