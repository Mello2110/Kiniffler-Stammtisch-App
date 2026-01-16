"use client";

import { useEffect, useState } from "react";
import { CheckCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToastProps {
    message: string;
    isVisible: boolean;
    onClose: () => void;
    duration?: number;
}

export function Toast({ message, isVisible, onClose, duration = 3000 }: ToastProps) {
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (isVisible) {
            setIsAnimating(true);
            const timer = setTimeout(() => {
                setIsAnimating(false);
                setTimeout(onClose, 300); // Wait for fade-out animation
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [isVisible, duration, onClose]);

    if (!isVisible && !isAnimating) return null;

    return (
        <div
            className={cn(
                "fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl transition-all duration-300",
                "bg-green-500/90 text-white backdrop-blur-sm",
                isAnimating ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
            )}
            role="alert"
            aria-live="polite"
        >
            <CheckCircle className="h-5 w-5 shrink-0" />
            <span className="font-medium text-sm">{message}</span>
            <button
                onClick={() => {
                    setIsAnimating(false);
                    setTimeout(onClose, 300);
                }}
                className="p-1 hover:bg-white/20 rounded transition-colors"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}

// Hook for easy toast management
export function useToast() {
    const [toast, setToast] = useState<{ message: string; visible: boolean }>({
        message: "",
        visible: false
    });

    const showToast = (message: string) => {
        setToast({ message, visible: true });
    };

    const hideToast = () => {
        setToast(prev => ({ ...prev, visible: false }));
    };

    return { toast, showToast, hideToast };
}
