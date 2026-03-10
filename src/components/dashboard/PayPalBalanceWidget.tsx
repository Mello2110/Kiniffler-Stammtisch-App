"use client";

import { useEffect, useState } from "react";
import { getPayPalBalance } from "@/lib/firebase";
import { Wallet, RefreshCw, AlertCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export function PayPalBalanceWidget() {
    const { dict } = useLanguage();
    const [balance, setBalance] = useState<{ amount: number; currency: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchBalance = async (silent = false) => {
        if (!silent) setLoading(true);
        else setIsRefreshing(true);

        setError(null);
        try {
            const result: any = await getPayPalBalance();
            if (result.data.success) {
                setBalance(result.data.balance);
            } else {
                setError("Failed to fetch balance");
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || "PayPal Error");
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchBalance();
    }, []);

    // Placeholder if still loading
    if (loading) {
        return (
            <div className="rounded-3xl border bg-card p-6 h-full flex flex-col justify-between animate-pulse">
                <div className="h-4 w-24 bg-muted rounded mb-4" />
                <div className="h-8 w-32 bg-muted rounded" />
            </div>
        );
    }

    return (
        <div className="rounded-3xl border bg-card p-6 h-full flex flex-col justify-between hover:border-primary/50 transition-colors group relative overflow-hidden">
            <div className="flex justify-between items-start relative z-10">
                <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60 flex items-center gap-2">
                        <Wallet className="h-3 w-3" />
                        PayPal Balance
                    </p>
                    {error ? (
                        <div className="flex items-center gap-2 text-red-500 text-sm font-medium">
                            <AlertCircle className="h-4 w-4" />
                            <span>{error}</span>
                        </div>
                    ) : (
                        <h3 className="text-2xl font-black tracking-tight outfit">
                            {balance ? `${balance.amount.toFixed(2)} ${balance.currency}` : "€0.00"}
                        </h3>
                    )}
                </div>

                <button
                    onClick={() => fetchBalance(true)}
                    disabled={isRefreshing}
                    className="p-2 rounded-xl bg-primary/5 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                    title="Refresh Balance"
                >
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <p className="text-[10px] text-muted-foreground mt-4 relative z-10">
                {error ? "Check PayPal credentials in Firebase" : "Live data from PayPal REST API"}
            </p>

            {/* Decorative Icon */}
            <Wallet className="absolute -bottom-4 -right-4 h-24 w-24 text-primary/5 rotate-12 group-hover:rotate-0 transition-transform duration-500" />
        </div>
    );
}
