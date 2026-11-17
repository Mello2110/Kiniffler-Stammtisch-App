"use client";

import { useState, useMemo } from "react";
import { query, orderBy } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { useFirestoreQuery } from "@/hooks/useFirestoreQuery";
import { useAuth } from "@/contexts/AuthContext";
import { useClub } from "@/contexts/ClubContext";
import { useAdmin } from "@/hooks/useAdmin";
import { functions } from "@/lib/firebase";
import { Loader2, Users, Pencil, Award, Calendar, Cake, UserMinus, ShieldCheck } from "lucide-react";
import type { Member } from "@/types";
import { DeleteConfirmationModal } from "@/components/common/DeleteConfirmationModal";
import { EditMemberModal } from "./EditMemberModal";
import { EditableHeader } from "@/components/common/EditableHeader";
import { MemberAvatar } from "@/components/common/MemberAvatar";
import { ClubInviteManager } from "@/components/settings/ClubInviteManager";

export function MemberManager() {
    const { user } = useAuth();
    const { clubId, clubCollection } = useClub();
    const { isAdmin } = useAdmin();
    const [editingMember, setEditingMember] = useState<Member | null>(null);
    const [deletingMember, setDeletingMember] = useState<Member | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    const q = useMemo(() => query(clubCollection("members"), orderBy("name", "asc")), [clubId, clubCollection]);
    const { data: members, loading: isLoading } = useFirestoreQuery<Member>(q);

    const confirmRemoveFromClub = async () => {
        if (!deletingMember || !isAdmin || !clubId) return;
        setActionError(null);

        const isDeletingAdmin =
            deletingMember.isAdmin === true ||
            deletingMember.roles?.includes("Admin") ||
            deletingMember.role === "Admin";
        const otherAdmins = members.filter(
            (m) => m.id !== deletingMember.id && (m.isAdmin === true || m.roles?.includes("Admin") || m.role === "Admin")
        );
        if (isDeletingAdmin && otherAdmins.length === 0) {
            setActionError("Der letzte Admin kann nicht entfernt werden. Bitte übertrage die Admin-Rechte zuerst auf ein anderes Mitglied.");
            setDeletingMember(null);
            return;
        }

        try {
            const fn = httpsCallable<{ clubId: string; targetMemberId: string }, { success: boolean }>(
                functions,
                "removeClubMember"
            );
            await fn({ clubId, targetMemberId: deletingMember.id });
            setDeletingMember(null);
        } catch (error: any) {
            console.error("Error removing member from club:", error);
            setActionError(error?.message || "Mitglied konnte nicht aus dem Verein entfernt werden.");
            setDeletingMember(null);
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
            {/* Invite Links (Admin only) */}
            {isAdmin ? (
                <ClubInviteManager />
            ) : (
                <div className="rounded-2xl border border-white/10 bg-card/60 p-4 sm:p-5 flex items-center gap-3 text-xs sm:text-sm text-muted-foreground">
                    <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
                    <span>
                        Neue Mitglieder treten über einen Vereins-Einladungslink bei. Nur Vereins-Admins können Einladungslinks erstellen oder Mitglieder entfernen.
                    </span>
                </div>
            )}

            {actionError && (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-sm text-red-400">
                    {actionError}
                </div>
            )}

            {/* Member List */}
            <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
                <div className="p-6 border-b bg-muted/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        <EditableHeader
                            pageId="members"
                            headerId="current-members-title"
                            defaultText="Aktuelle Mitglieder"
                            as="h2"
                            className="text-xl font-bold"
                        />
                    </div>
                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
                        {members.length} Personen
                    </span>
                </div>

                <div className="divide-y">
                    {members.length > 0 ? (
                        members.map((member) => (
                            <div key={member.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <MemberAvatar member={member} size="md" />
                                    <div>
                                        <p className="font-semibold text-lg">{member.name}</p>
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground uppercase tracking-wider font-bold">
                                            <span className="flex items-center gap-1">
                                                <Award className="h-3 w-3" />
                                                {(() => {
                                                    const displayRoles = member.roles && member.roles.length > 0 ? member.roles : [member.role || "Mitglied"];
                                                    return displayRoles.map(r => (
                                                        <span key={r} className="bg-primary/10 px-2 py-0.5 rounded text-[10px] font-bold">
                                                            {r}
                                                        </span>
                                                    ));
                                                })()}
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
                                <div className="flex items-center gap-1 transition-all">
                                    {(user?.uid === member.id || isAdmin) && (
                                        <button
                                            onClick={() => setEditingMember(member)}
                                            className="p-2 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                                            title="Bearbeiten"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </button>
                                    )}
                                    {isAdmin && user?.uid !== member.id && (
                                        <button
                                            onClick={() => setDeletingMember(member)}
                                            className="p-2 text-muted-foreground hover:text-red-400 transition-colors cursor-pointer"
                                            title="Aus Verein entfernen"
                                        >
                                            <UserMinus className="h-4 w-4" />
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
                onConfirm={confirmRemoveFromClub}
                title="Mitglied aus Verein entfernen"
                description={`Möchtest du ${deletingMember?.name} wirklich aus diesem Verein entfernen? Der eigene KANPAI-Account der Person bleibt dabei bestehen.`}
            />
        </div>
    );
}
