"use client";

import React, { useState, useMemo } from "react";
import { useClub } from "@/contexts/ClubContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLedger } from "@/hooks/useLedger";
import { buildSmartPaymentDetails } from "@/lib/paymentUtils";
import { triggerHaptic } from "@/lib/haptics";
import { addDoc, serverTimestamp } from "firebase/firestore";
import {
    QrCode,
    Copy,
    Check,
    ExternalLink,
    Sparkles,
    ShieldCheck,
    Send
} from "lucide-react";

export function SmartPayDepositCard() {
    const { user } = useAuth();
    const { clubId, club, clubCollection } = useClub();
    const { balance } = useLedger(user?.uid);
    const syncMode = club?.paymentConfig?.paymentSyncMode || (clubId === "club_original" ? "imap_legacy" : "manual_confirm");

    // Wenn der Nutzer im Minus ist, schlagen wir automatisch den exakten Ausgleichsbetrag vor, sonst 15 €
    const suggestedAmount = balance < 0 ? Math.ceil(Math.abs(balance)) : 15;
    const [amount, setAmount] = useState<number>(suggestedAmount);
    const [copied, setCopied] = useState(false);
    const [showQr, setShowQr] = useState(false);
    const [reporting, setReporting] = useState(false);
    const [reported, setReported] = useState(false);

    const handleReportDeposit = async () => {
        if (!user || reporting) return;
        setReporting(true);
        triggerHaptic("success");
        try {
            await addDoc(clubCollection("pending_deposits"), {
                userId: user.uid,
                memberName: user.displayName || user.email?.split("@")[0] || "Mitglied",
                amount,
                referenceToken: paymentDetails.referenceCode,
                status: "pending",
                createdAt: serverTimestamp(),
            });
            setReported(true);
            setTimeout(() => setReported(false), 4000);
        } finally {
            setReporting(false);
        }
    };

    const paymentDetails = useMemo(() => {
        return buildSmartPaymentDetails({
            clubId,
            clubSlug: club?.slug || "stammtisch",
            userId: user?.uid || "guest",
            amountEur: amount,
            paypalMeHandle: club?.paymentConfig?.paypalMeHandle || "",
        });
    }, [clubId, club?.slug, club?.paymentConfig?.paypalMeHandle, user?.uid, amount]);

    const handleCopyReference = async () => {
        try {
            await navigator.clipboard.writeText(paymentDetails.referenceCode);
            triggerHaptic("success");
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            // fallback
        }
    };

    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(paymentDetails.paypalUrl)}`;

    return (
        <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card/80 to-background p-6 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2 max-w-xl">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
                        <Sparkles className="h-3.5 w-3.5" />
                        Self-Service Smart Deposit
                    </div>
                    <h3 className="text-2xl font-black outfit">
                        Schnell-Einzahlung in die Vereinskasse
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Kopiere deinen persönlichen Verwendungszweck-Code in die PayPal-Notiz. Dadurch wird deine Zahlung vollautomatisch und sekundenschnell deinem Konto in <strong>{club?.name || "Stammtisch"}</strong> gutgeschrieben.
                    </p>
                </div>

                {/* Betrags-Auswahl & PayPal Action */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-background/80 border border-white/10 rounded-2xl p-1.5">
                        {[15, 30, 50].map(preset => (
                            <button
                                key={preset}
                                onClick={() => {
                                    triggerHaptic("tap");
                                    setAmount(preset);
                                }}
                                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                    amount === preset
                                        ? "bg-primary text-primary-foreground shadow"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                {preset}€
                            </button>
                        ))}
                        <input
                            type="number"
                            min={1}
                            step={1}
                            value={amount}
                            onChange={e => setAmount(Math.max(1, Number(e.target.value) || 15))}
                            className="w-20 text-center font-bold text-sm bg-transparent border-l border-white/10 px-2 py-1 focus:outline-none"
                        />
                    </div>

                    <button
                        onClick={() => setShowQr(!showQr)}
                        className="px-4 py-3 rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                        <QrCode className="h-4 w-4 text-primary" />
                        {showQr ? "QR ausblenden" : "QR-Code"}
                    </button>

                    <a
                        href={paymentDetails.paypalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => handleCopyReference()}
                        className="px-5 py-3 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-primary/25 transition-all"
                    >
                        <span>Via PayPal zahlen ({amount.toFixed(2)}€)</span>
                        <ExternalLink className="h-4 w-4" />
                    </a>

                    {syncMode !== "imap_legacy" && user && (
                        <button
                            type="button"
                            onClick={handleReportDeposit}
                            disabled={reporting || reported}
                            className="px-4 py-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-70"
                        >
                            {reported ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                            <span>{reported ? "Gemeldet!" : reporting ? "Sende..." : "Zahlung gesendet"}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Intelligenter Verwendungszweck-Balken + Optionaler QR-Code */}
            <div className="mt-5 pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <ShieldCheck className="h-4 w-4 text-emerald-400" />
                        Dein persönlicher Verwendungszweck:
                    </span>
                    <button
                        onClick={handleCopyReference}
                        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-background border border-primary/40 font-mono text-xs font-bold text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                    >
                        <span>{paymentDetails.referenceCode}</span>
                        {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                    {copied && (
                        <span className="text-xs text-emerald-400 font-semibold">
                            In Zwischenablage kopiert!
                        </span>
                    )}
                </div>

                {club?.paymentConfig?.treasuryEmail && (
                    <div className="text-xs text-muted-foreground">
                        Kassen-Konto: <strong className="text-foreground">{club.paymentConfig.treasuryEmail}</strong>
                    </div>
                )}
            </div>

            {showQr && (
                <div className="mt-4 p-4 rounded-2xl bg-background/90 border border-white/10 flex flex-col sm:flex-row items-center gap-6 animate-in fade-in duration-200">
                    <div className="bg-white p-2.5 rounded-2xl shadow-md shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={qrImageUrl}
                            alt="PayPal QR Code"
                            width={150}
                            height={150}
                            className="rounded-lg"
                        />
                    </div>
                    <div className="space-y-2 text-xs text-muted-foreground">
                        <div className="font-bold text-foreground text-sm">
                            Scannen & mit Verwendungszweck absenden
                        </div>
                        <p>
                            1. Scanne den QR-Code mit deiner Smartphone-Kamera.<br />
                            2. Füge den kopierten Code <code className="text-primary font-bold">{paymentDetails.referenceCode}</code> ins PayPal-Mitteilungsfeld ein.<br />
                            3. Nach dem Senden wird dein Saldo automatisch ausgeglichen.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
