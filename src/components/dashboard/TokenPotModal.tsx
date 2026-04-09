"use client";

import { useState } from "react";
import { X, Coins, Plus, Send, AlertCircle, Group } from "lucide-react";
import { Member, TokenType } from "@/types";
import { TokenService } from "@/lib/TokenService";
import { cn } from "@/lib/utils";

interface TokenPotModalProps {
    isOpen: boolean;
    onClose: () => void;
    members: Member[];
    currentUserId: string;
}

export function TokenPotModal({ isOpen, onClose, members, currentUserId }: TokenPotModalProps) {
    const [mode, setMode] = useState<'send' | 'pot'>('send');
    const [targetMemberId, setTargetMemberId] = useState("");
    const [amount, setAmount] = useState(1);
    const [reason, setReason] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    const currentUser = members.find(m => m.id === currentUserId);
    const availableTokens = currentUser?.tokenBalance || 0;

    const handleSend = async () => {
        if (!targetMemberId || amount <= 0 || !reason) {
            setError("Bitte alle Felder ausfüllen.");
            return;
        }

        if (amount > availableTokens) {
            setError("Nicht genügend Tokens vorhanden.");
            return;
        }

        setIsSubmitting(true);
        setError("");
        try {
            await TokenService.transferTokens(currentUserId, targetMemberId, amount, reason);
            onClose();
        } catch (err: any) {
            setError(err.message || "Fehler beim Senden.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md bg-secondary border border-primary/20 rounded-[2rem] shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="p-6 bg-primary/10 border-b border-primary/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/20">
                            <Coins className="h-6 w-6 text-primary" />
                        </div>
                        <h2 className="text-xl font-bold outfit">Token Interaktion</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex p-1 bg-background m-6 rounded-xl border border-primary/10">
                    <button
                        onClick={() => setMode('send')}
                        className={cn(
                            "flex-1 py-2 rounded-lg text-sm font-bold transition-all",
                            mode === 'send' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Direkt Senden
                    </button>
                    <button
                        onClick={() => setMode('pot')}
                        className={cn(
                            "flex-1 py-2 rounded-lg text-sm font-bold transition-all opacity-50 cursor-not-allowed",
                            mode === 'pot' ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                        )}
                        disabled
                    >
                        Gruppen-Topf (In Kürze)
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 pt-0 space-y-6">
                    <div className="space-y-4">
                        {/* Member Select */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1 text-primary">Empfänger</label>
                            <select 
                                value={targetMemberId}
                                onChange={(e) => setTargetMemberId(e.target.value)}
                                className="w-full p-4 rounded-2xl bg-background border border-primary/10 focus:border-primary/50 outline-none transition-colors"
                            >
                                <option value="">Spieler wählen...</option>
                                {members.filter(m => m.id !== currentUserId).map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Amount & Reason */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Anzahl</label>
                                <input 
                                    type="number" 
                                    min="1"
                                    max={availableTokens}
                                    value={amount}
                                    onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
                                    className="w-full p-4 rounded-2xl bg-background border border-primary/10 focus:border-primary/50 outline-none transition-colors"
                                />
                            </div>
                            <div className="col-span-2 space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Zweck (Wette / Deal)</label>
                                <input 
                                    type="text" 
                                    placeholder="z.B. Kniffel-Wette..."
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="w-full p-4 rounded-2xl bg-background border border-primary/10 focus:border-primary/50 outline-none transition-colors"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-sm flex items-center gap-2">
                                <AlertCircle className="h-4 w-4" />
                                {error}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-2">
                        <button
                            onClick={handleSend}
                            disabled={isSubmitting || availableTokens <= 0}
                            className={cn(
                                "w-full py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all shadow-lg",
                                isSubmitting || availableTokens <= 0
                                    ? "bg-muted text-muted-foreground opacity-50"
                                    : "bg-primary text-primary-foreground hover:scale-[1.02]"
                            )}
                        >
                            <Send className="h-5 w-5" />
                            {isSubmitting ? "Sende..." : "Tokens übertragen"}
                        </button>
                        <div className="text-center text-xs text-muted-foreground">
                            Dein Guthaben: <span className="font-bold text-primary">{availableTokens} Tokens</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
