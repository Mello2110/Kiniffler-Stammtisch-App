"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationPreferences } from "@/types";
import { Bell, Mail, Smartphone, Calendar, Vote, CalendarDays, TestTube, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { requestNotificationPermission, subscribeToPush, unsubscribeFromPush, sendTestNotification } from "@/lib/notifications";

const DEFAULT_PREFERENCES: NotificationPreferences = {
    emailEnabled: false,
    pushEnabled: false,
    eventReminder7Days: true,
    eventReminder1Day: true,
    votingReminder: true,
    monthlyOverview: true
};

export default function NotificationSettings() {
    const { user } = useAuth();
    const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pushPermissionStatus, setPushPermissionStatus] = useState<NotificationPermission>("default");

    useEffect(() => {
        if (!user) return;

        if (typeof window !== "undefined" && "Notification" in window) {
            setPushPermissionStatus(Notification.permission);
        }

        const fetchPreferences = async () => {
            try {
                const docRef = doc(db, "members", user.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data.notificationPreferences) {
                        setPreferences({ ...DEFAULT_PREFERENCES, ...data.notificationPreferences });
                    }
                }
            } catch (err) {
                console.error("Error fetching notification preferences:", err);
                setError("Fehler beim Laden der Einstellungen.");
            } finally {
                setLoading(false);
            }
        };

        fetchPreferences();
    }, [user]);

    const updatePreferences = async (newPrefs: Partial<NotificationPreferences>) => {
        if (!user) return;

        // Optimistic update
        setPreferences(prev => ({ ...prev, ...newPrefs }));

        try {
            const docRef = doc(db, "members", user.uid);
            await updateDoc(docRef, {
                notificationPreferences: { ...preferences, ...newPrefs }
            });
        } catch (err) {
            console.error("Error updating preferences:", err);
            setError("Fehler beim Speichern der Einstellungen.");
            // Revert on error could be implemented here
        }
    };

    const handlePushToggle = async (checked: boolean) => {
        console.log("Toggle clicked. Checked:", checked);
        if (checked) {
            console.log("Requesting permission...");
            try {
                const token = await requestNotificationPermission();
                console.log("Permission result token:", token);

                if (token) {
                    setPushPermissionStatus("granted");
                    await subscribeToPush(user!.uid, token);
                    updatePreferences({ pushEnabled: true, fcmToken: token });
                    console.log("Push enabled successfully.");
                } else {
                    console.warn("Token was null.");
                    setPushPermissionStatus("denied");
                    // Don't enable toggle if permission denied
                    alert("Push-Benachrichtigungen wurden blockiert. Bitte aktiviere sie in deinen Browsereinstellungen.");
                }
            } catch (error) {
                console.error("Error in handlePushToggle:", error);
                alert("Ein Fehler ist aufgetreten: " + error);
            }
        } else {
            console.log("Unsubscribing...");
            await unsubscribeFromPush(user!.uid);
            updatePreferences({ pushEnabled: false, fcmToken: undefined });
            console.log("Unsubscribed.");
        }
    };

    const handleTestPush = async () => {
        await sendTestNotification();
    };

    const handleTestEmail = async () => {
        alert("Test-Email Funktion ist noch nicht implementiert (Server-Side).");
    };

    if (loading) return <div className="p-4 text-muted-foreground">Lade Einstellungen...</div>;

    return (
        <div className="bg-card/50 backdrop-blur-sm border border-border p-6 rounded-3xl space-y-6 h-full shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 text-xl font-bold">
                <Bell className="w-6 h-6 text-primary" />
                Benachrichtigungen
            </div>

            {error && (
                <div className="bg-red-500/10 text-red-500 p-4 rounded-xl flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    {error}
                </div>
            )}

            {/* Kanäle */}
            <div className="space-y-4">
                <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-2">
                    Benachrichtigungskanäle
                </div>

                {/* Email */}
                <div className="bg-card border border-border p-4 rounded-xl flex items-center justify-between">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <Mail className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="font-bold">E-Mail Benachrichtigungen</div>
                            <div className="text-sm text-muted-foreground">Erhalte Benachrichtigungen per E-Mail</div>
                        </div>
                    </div>
                    <Switch
                        checked={preferences.emailEnabled}
                        onChange={(val) => updatePreferences({ emailEnabled: val })}
                    />
                </div>

                {/* Push */}
                <div className="bg-card border border-border p-4 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <Smartphone className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="font-bold">Push Benachrichtigungen</div>
                                <div className="text-sm text-muted-foreground">Erhalte Benachrichtigungen auf diesem Gerät</div>
                            </div>
                        </div>
                        <Switch
                            checked={preferences.pushEnabled}
                            onChange={handlePushToggle}
                        />
                    </div>

                    {preferences.pushEnabled && pushPermissionStatus !== "granted" && (
                        <div className="bg-yellow-500/10 text-yellow-500 p-3 rounded-lg text-sm flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            Push-Benachrichtigungen erfordern deine Erlaubnis.
                            <button
                                onClick={() => handlePushToggle(true)}
                                className="underline font-bold hover:text-yellow-400"
                            >
                                Erlaubnis erteilen
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Timing / Types */}
            {(preferences.emailEnabled || preferences.pushEnabled) && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                    <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-2 pt-4">
                        Wann möchtest du benachrichtigt werden?
                    </div>

                    {/* Event Reminders */}
                    <div className="bg-card border border-border p-4 rounded-xl space-y-3">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <Calendar className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="font-bold">Event-Erinnerungen</div>
                                <div className="text-sm text-muted-foreground">Stammtisch, Geburtstage und andere Events</div>
                            </div>
                        </div>
                        <div className="pl-12 space-y-2">
                            <Checkbox
                                label="Eine Woche vorher"
                                checked={preferences.eventReminder7Days}
                                onChange={(val) => updatePreferences({ eventReminder7Days: val })}
                            />
                            <Checkbox
                                label="Einen Tag vorher"
                                checked={preferences.eventReminder1Day}
                                onChange={(val) => updatePreferences({ eventReminder1Day: val })}
                            />
                        </div>
                    </div>

                    {/* Voting Reminder */}
                    <div className="bg-card border border-border p-4 rounded-xl flex items-center justify-between">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <Vote className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="font-bold">Abstimmungs-Erinnerung</div>
                                <div className="text-sm text-muted-foreground max-w-[250px] sm:max-w-md">
                                    Erinnerung am 24. des Monats, falls du noch nicht abgestimmt hast
                                </div>
                            </div>
                        </div>
                        <Switch
                            checked={preferences.votingReminder}
                            onChange={(val) => updatePreferences({ votingReminder: val })}
                        />
                    </div>

                    {/* Monthly Overview */}
                    <div className="bg-card border border-border p-4 rounded-xl flex items-center justify-between">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <CalendarDays className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="font-bold">Monatsübersicht</div>
                                <div className="text-sm text-muted-foreground max-w-[250px] sm:max-w-md">
                                    Erhalte am 1. jeden Monats eine Übersicht
                                </div>
                            </div>
                        </div>
                        <Switch
                            checked={preferences.monthlyOverview}
                            onChange={(val) => updatePreferences({ monthlyOverview: val })}
                        />
                    </div>

                    {/* Test Buttons */}
                    <div className="bg-card border border-border p-4 rounded-xl flex flex-col gap-3">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <TestTube className="w-5 h-5" />
                            </div>
                            <div className="font-bold self-center">Test-Benachrichtigung senden</div>
                        </div>
                        <div className="flex gap-4 pl-12">
                            <button
                                onClick={handleTestEmail}
                                disabled={!preferences.emailEnabled}
                                className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm font-medium disabled:opacity-50"
                            >
                                Test E-Mail
                            </button>
                            <button
                                onClick={handleTestPush}
                                disabled={!preferences.pushEnabled}
                                className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm font-medium disabled:opacity-50"
                            >
                                Test Push
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Simple internal UI components to match style
function Switch({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
    return (
        <button
            onClick={() => onChange(!checked)}
            className={cn(
                "relative h-7 w-12 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary",
                checked ? "bg-primary" : "bg-muted"
            )}
        >
            <span
                className={cn(
                    "absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition-transform",
                    checked ? "translate-x-5" : "translate-x-0"
                )}
            />
        </button>
    );
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
    return (
        <label className="flex items-center gap-3 cursor-pointer group">
            <div
                onClick={() => onChange(!checked)}
                className={cn(
                    "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                    checked ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30 group-hover:border-primary/50"
                )}
            >
                {checked && <div className="w-2.5 h-2.5 bg-current rounded-sm" />}
            </div>
            <span className="text-sm font-medium">{label}</span>
        </label>
    );
}
