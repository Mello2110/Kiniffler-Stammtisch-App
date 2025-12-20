"use client";

import { useState } from "react";
import { MessageSquarePlus, AlertTriangle, Lightbulb, MessageCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { FeedbackForm, FeedbackType, FeedbackData } from "@/components/feedback/FeedbackForm";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";

export default function FeedbackPage() {
    const { dict } = useLanguage();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<FeedbackType>("problem");

    const handleFeedbackSubmit = async (type: FeedbackType, data: FeedbackData) => {
        try {
            await addDoc(collection(db, "feedback"), {
                ...data,
                type,
                userId: user?.uid || "anonymous",
                userEmail: user?.email || "anonymous",
                status: "new",
                createdAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Error submitting feedback:", error);
            throw error; // Re-throw for form to handle error state if needed
        }
    };

    const tabs: { id: FeedbackType; label: string; icon: any; color: string }[] = [
        {
            id: "problem",
            label: dict.feedback.tabs.problem,
            icon: AlertTriangle,
            color: "text-red-500"
        },
        {
            id: "suggestion",
            label: dict.feedback.tabs.suggestion,
            icon: Lightbulb,
            color: "text-yellow-500"
        },
        {
            id: "other",
            label: dict.feedback.tabs.other,
            icon: MessageCircle,
            color: "text-blue-500"
        }
    ];

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-20">
            {/* Header */}
            <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-bold font-heading flex items-center gap-3">
                    <MessageSquarePlus className="h-8 w-8 text-primary" />
                    {dict.headers.feedback.title}
                </h2>
                <p className="text-muted-foreground">
                    {dict.headers.feedback.subtext}
                </p>
            </div>

            {/* Tabs Navigation */}
            <div className="grid grid-cols-3 gap-2 bg-secondary/30 p-1 rounded-2xl">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex flex-col sm:flex-row items-center justify-center gap-2 p-3 rounded-xl transition-all duration-300 font-bold text-sm sm:text-base",
                                isActive
                                    ? "bg-background shadow-md text-foreground scale-[1.02]"
                                    : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                            )}
                        >
                            <Icon className={cn("h-5 w-5", isActive ? tab.color : "opacity-70")} />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Content Area */}
            <div className="mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {activeTab === "problem" && (
                    <FeedbackForm
                        type="problem"
                        onSubmit={(data) => handleFeedbackSubmit("problem", data)}
                        className="border-red-500/10 shadow-red-500/5"
                    />
                )}
                {activeTab === "suggestion" && (
                    <FeedbackForm
                        type="suggestion"
                        onSubmit={(data) => handleFeedbackSubmit("suggestion", data)}
                        className="border-yellow-500/10 shadow-yellow-500/5"
                    />
                )}
                {activeTab === "other" && (
                    <FeedbackForm
                        type="other"
                        onSubmit={(data) => handleFeedbackSubmit("other", data)}
                        className="border-blue-500/10 shadow-blue-500/5"
                    />
                )}
            </div>
        </div>
    );
}
