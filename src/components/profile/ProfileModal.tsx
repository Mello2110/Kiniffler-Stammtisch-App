"use client";

import { useState, useEffect } from "react";
import { X, Loader2, User, Save, KeyRound, ChevronDown, ChevronUp } from "lucide-react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { reauthenticateWithCredential, EmailAuthProvider, updatePassword } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { Member } from "@/types";
import { MemberAvatar } from "@/components/common/MemberAvatar";
import { AvatarPicker } from "./AvatarPicker";

// ============================================
// TYPES & INTERFACES
// ============================================

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// ============================================
// COMPONENT
// ============================================

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
    const { user } = useAuth();

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

        if (isOpen) {
            setIsLoading(true);
            setError(null);
            setSuccessMessage(null);
            fetchMemberData();
        }
    }, [user, isOpen]);

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
            }

            setSuccessMessage("Profil erfolgreich aktualisiert");
            setTimeout(() => {
                onClose();
            }, 1000);
        } catch (err: unknown) {
            console.error("Error updating profile:", err);

            // Handle Firebase auth errors
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

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget && !isSubmitting) {
            onClose();
        }
    };

    // --- Render ---
    if (!isOpen) return null;

    return (
        <>
            <div
                className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={handleBackdropClick}
            >
                <div className="bg-card border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b shrink-0">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <User className="h-5 w-5 text-primary" />
                            Mein Profil
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-muted rounded-full transition-colors"
                            disabled={isSubmitting}
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Content */}
                    {isLoading ? (
                        <div className="p-12 flex flex-col items-center justify-center text-muted-foreground">
                            <Loader2 className="h-8 w-8 animate-spin mb-2" />
                            <p>Profil laden...</p>
                        </div>
                    ) : error && !member ? (
                        <div className="p-12 text-center text-red-500">
                            {error}
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
                            {/* Avatar Section */}
                            <div className="flex flex-col items-center gap-3">
                                <MemberAvatar
                                    member={{ avatar: { icon: avatarIcon, bgColor: avatarColor }, name }}
                                    size="lg"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowAvatarPicker(true)}
                                    className="text-sm text-primary hover:underline font-medium"
                                >
                                    Ändern
                                </button>
                            </div>

                            {/* Name Field */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                                    Name
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full p-3 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all font-semibold"
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
                                <div className="w-full p-3 rounded-xl border bg-muted/50 text-sm text-muted-foreground">
                                    {user?.email || "—"}
                                </div>
                            </div>

                            {/* Password Change Section */}
                            <div className="space-y-3">
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
                                    <div className="space-y-3 p-4 rounded-xl bg-muted/30 border">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                                Aktuelles Passwort
                                            </label>
                                            <input
                                                type="password"
                                                value={currentPassword}
                                                onChange={(e) => setCurrentPassword(e.target.value)}
                                                className="w-full p-3 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                                Neues Passwort
                                            </label>
                                            <input
                                                type="password"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className="w-full p-3 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                                placeholder="Mindestens 6 Zeichen"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                                Passwort bestätigen
                                            </label>
                                            <input
                                                type="password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="w-full p-3 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                                placeholder="Passwort wiederholen"
                                            />
                                        </div>
                                        {passwordError && (
                                            <div className="p-2 rounded-lg bg-red-500/10 text-red-500 text-xs">
                                                {passwordError}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Error/Success Display */}
                            {error && (
                                <div className="p-3 rounded-xl bg-red-500/10 text-red-500 text-sm">
                                    {error}
                                </div>
                            )}
                            {successMessage && (
                                <div className="p-3 rounded-xl bg-green-500/10 text-green-500 text-sm">
                                    {successMessage}
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="pt-2 flex gap-3">
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
                                    disabled={isSubmitting || !name.trim()}
                                    className="flex-1 px-4 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Speichern...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="h-4 w-4" />
                                            Speichern
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
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
        </>
    );
}
