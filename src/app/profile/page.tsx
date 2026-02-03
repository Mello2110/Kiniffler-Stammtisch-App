"use client";

import { useState, useEffect } from "react";
import { Loader2, User, Save, KeyRound, ChevronDown, ChevronUp, ArrowLeft } from "lucide-react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { reauthenticateWithCredential, EmailAuthProvider, updatePassword } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import type { Member } from "@/types";
import { MemberAvatar } from "@/components/common/MemberAvatar";
import { AvatarPicker } from "@/components/profile/AvatarPicker";
import { AuthGuard } from "@/components/auth/AuthGuard";

// ============================================
// COMPONENT
// ============================================

function ProfilePageContent() {
    const { user } = useAuth();
    const router = useRouter();

    // --- State ---
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [member, setMember] = useState<Member | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // --- Form State ---
    const [name, setName] = useState("");
    const [avatarIcon, setAvatarIcon] = useState("User");
    const [avatarColor, setAvatarColor] = useState("bg-primary");
    const [showAvatarPicker, setShowAvatarPicker] = useState(false);

    // --- Password State ---
    const [showPasswordSection, setShowPasswordSection] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordError, setPasswordError] = useState<string | null>(null);

    // --- Fetch member data on mount ---
    useEffect(() => {
        const fetchMemberData = async () => {
            if (!user?.uid) {
                setError("Nicht eingeloggt");
                setIsLoading(false);
                return;
            }

            try {
                const docRef = doc(db, "members", user.uid);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data() as Member;
                    setMember({ ...data, id: docSnap.id });
                    setName(data.name || "");
                    setAvatarIcon(data.avatar?.icon || "User");
                    setAvatarColor(data.avatar?.bgColor || "bg-primary");
                } else {
                    setError("Profil nicht gefunden");
                }
            } catch (err) {
                console.error("Error fetching member data:", err);
                setError("Fehler beim Laden des Profils");
            } finally {
                setIsLoading(false);
            }
        };

        fetchMemberData();
    }, [user]);

    // --- Handlers ---
    const handleAvatarSelect = (icon: string, bgColor: string) => {
        setAvatarIcon(icon);
        setAvatarColor(bgColor);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user?.uid || !member) return;

        // Validation
        if (name.trim().length < 2) {
            setError("Name muss mindestens 2 Zeichen haben");
            return;
        }

        // Password validation if user wants to change password
        if (showPasswordSection && (currentPassword || newPassword || confirmPassword)) {
            if (!currentPassword) {
                setPasswordError("Aktuelles Passwort erforderlich");
                return;
            }
            if (newPassword.length < 6) {
                setPasswordError("Neues Passwort muss mindestens 6 Zeichen haben");
                return;
            }
            if (newPassword !== confirmPassword) {
                setPasswordError("Passwörter stimmen nicht überein");
                return;
            }
        }

        setIsSubmitting(true);
        setError(null);
        setPasswordError(null);

        try {
            // Update Firestore document
            const ref = doc(db, "members", user.uid);
            await updateDoc(ref, {
                name: name.trim(),
                avatar: {
                    icon: avatarIcon,
                    bgColor: avatarColor,
                },
            });

            // Handle password change if requested
            if (showPasswordSection && currentPassword && newPassword) {
                const currentUser = auth.currentUser;
                if (currentUser && currentUser.email) {
                    const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
                    await reauthenticateWithCredential(currentUser, credential);
                    await updatePassword(currentUser, newPassword);
                }
                // Clear password fields on success
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
                setShowPasswordSection(false);
            }

            setSuccessMessage("Profil erfolgreich aktualisiert");
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: unknown) {
            console.error("Error updating profile:", err);

            if (err instanceof Error) {
                if (err.message.includes("wrong-password") || err.message.includes("invalid-credential")) {
                    setPasswordError("Aktuelles Passwort ist falsch");
                } else if (err.message.includes("requires-recent-login")) {
                    setPasswordError("Bitte melde dich erneut an und versuche es noch einmal");
                } else {
                    setError("Fehler beim Speichern: " + err.message);
                }
            } else {
                setError("Fehler beim Speichern");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Render ---
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Loader2 className="h-10 w-10 animate-spin mb-2" />
                <p>Profil laden...</p>
            </div>
        );
    }

    if (error && !member) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="p-6 rounded-2xl bg-red-500/10 text-red-500 text-center">
                    <p className="font-bold mb-2">Fehler</p>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-700">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="p-2 hover:bg-muted rounded-xl transition-colors"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <User className="h-6 w-6 text-primary" />
                        Mein Profil
                    </h1>
                    <p className="text-sm text-muted-foreground">Bearbeite deine persönlichen Daten</p>
                </div>
            </div>

            {/* Main Content Card */}
            <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
                <form onSubmit={handleSubmit}>
                    {/* Avatar Section */}
                    <div className="p-8 border-b bg-gradient-to-br from-primary/5 to-transparent">
                        <div className="flex flex-col sm:flex-row items-center gap-6">
                            <MemberAvatar
                                member={{ avatar: { icon: avatarIcon, bgColor: avatarColor }, name }}
                                size="lg"
                                className="h-24 w-24 text-4xl"
                            />
                            <div className="text-center sm:text-left">
                                <h2 className="text-xl font-bold">{name || "Dein Name"}</h2>
                                <p className="text-sm text-muted-foreground mb-3">{user?.email}</p>
                                <button
                                    type="button"
                                    onClick={() => setShowAvatarPicker(true)}
                                    className="px-4 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 font-medium text-sm transition-colors"
                                >
                                    Avatar ändern
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Form Fields */}
                    <div className="p-6 sm:p-8 space-y-6">
                        {/* Name Field */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                                Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full p-4 rounded-xl border bg-background text-base focus:ring-2 focus:ring-primary/20 outline-none transition-all font-semibold"
                                placeholder="Dein Name"
                                required
                                minLength={2}
                            />
                        </div>

                        {/* Email Display (read-only) */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                                E-Mail
                            </label>
                            <div className="w-full p-4 rounded-xl border bg-muted/50 text-base text-muted-foreground">
                                {user?.email || "—"}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Die E-Mail-Adresse ist mit deinem Login verknüpft und kann hier nicht geändert werden.
                            </p>
                        </div>

                        {/* Password Change Section */}
                        <div className="space-y-4">
                            <button
                                type="button"
                                onClick={() => setShowPasswordSection(!showPasswordSection)}
                                className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <KeyRound className="h-4 w-4" />
                                Passwort ändern
                                {showPasswordSection ? (
                                    <ChevronUp className="h-4 w-4" />
                                ) : (
                                    <ChevronDown className="h-4 w-4" />
                                )}
                            </button>

                            {showPasswordSection && (
                                <div className="space-y-4 p-6 rounded-xl bg-muted/30 border">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                                            Aktuelles Passwort
                                        </label>
                                        <input
                                            type="password"
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            className="w-full p-4 rounded-xl border bg-background text-base focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                                                Neues Passwort
                                            </label>
                                            <input
                                                type="password"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className="w-full p-4 rounded-xl border bg-background text-base focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                                placeholder="Min. 6 Zeichen"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                                                Passwort bestätigen
                                            </label>
                                            <input
                                                type="password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="w-full p-4 rounded-xl border bg-background text-base focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                                placeholder="Wiederholen"
                                            />
                                        </div>
                                    </div>
                                    {passwordError && (
                                        <div className="p-3 rounded-xl bg-red-500/10 text-red-500 text-sm">
                                            {passwordError}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Error/Success Display */}
                        {error && (
                            <div className="p-4 rounded-xl bg-red-500/10 text-red-500">
                                {error}
                            </div>
                        )}
                        {successMessage && (
                            <div className="p-4 rounded-xl bg-green-500/10 text-green-500 font-medium">
                                ✓ {successMessage}
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="p-6 sm:p-8 border-t bg-muted/20 flex flex-col sm:flex-row gap-3">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            disabled={isSubmitting}
                            className="flex-1 px-6 py-4 rounded-xl border bg-background hover:bg-muted font-bold transition-all disabled:opacity-50"
                        >
                            Abbrechen
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !name.trim()}
                            className="flex-1 px-6 py-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Speichern...
                                </>
                            ) : (
                                <>
                                    <Save className="h-5 w-5" />
                                    Änderungen speichern
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {/* Avatar Picker Modal */}
            {showAvatarPicker && (
                <AvatarPicker
                    currentIcon={avatarIcon}
                    currentColor={avatarColor}
                    onSelect={handleAvatarSelect}
                    onClose={() => setShowAvatarPicker(false)}
                />
            )}
        </div>
    );
}

export default function ProfilePage() {
    return (
        <AuthGuard>
            <ProfilePageContent />
        </AuthGuard>
    );
}
