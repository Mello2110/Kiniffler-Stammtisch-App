"use client";

import { useState, useMemo } from "react";
import { MessageSquarePlus, AlertTriangle, Lightbulb, MessageCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { FeedbackForm, FeedbackType, FeedbackData } from "@/components/feedback/FeedbackForm";
import { FeedbackList } from "@/components/feedback/FeedbackList";
import { EditFeedbackModal } from "@/components/feedback/EditFeedbackModal";
import { addDoc, collection, serverTimestamp, doc, updateDoc, deleteDoc, query, orderBy, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { useFirestoreQuery } from "@/hooks/useFirestoreQuery";
import { Member } from "@/types";

export default function FeedbackPage() {
    const { dict } = useLanguage();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<FeedbackType>("problem");

    // Modal State
    const [editingItem, setEditingItem] = useState<{ id: string, data: FeedbackData } | null>(null);

    // Queries
    // Fetch all feedback (client-side filtering for simplicity as volume is low, 
    // or use compound queries if indexes allow. For now, separate collections were avoided, so we filter by 'type')
    const feedbackQuery = useMemo(() => query(collection(db, "feedback"), orderBy("createdAt", "desc")), []);
    const { data: allFeedback } = useFirestoreQuery<FeedbackData & { id: string, completed: boolean, userId: string, type: string }>(feedbackQuery, { idField: "id" });

    // Filter by active tab
    const filteredFeedback = useMemo(() => {
        return allFeedback.filter(f => f.type === activeTab);
    }, [allFeedback, activeTab]);

    // Fetch members for avatars
    const membersQuery = useMemo(() => collection(db, "members"), []);
    const { data: members } = useFirestoreQuery<Member>(membersQuery, { idField: "id" });


    const handleFeedbackSubmit = async (type: FeedbackType, data: FeedbackData) => {
        try {
            await addDoc(collection(db, "feedback"), {
                ...data,
                type,
                userId: user?.uid || "anonymous",
                userEmail: user?.email || "anonymous",
                completed: false,
                status: "new",
                createdAt: serverTimestamp(),
                likes: 0,
                dislikes: 0,
                votes: {}
            });
        } catch (error) {
            console.error("Error submitting feedback:", error);
            throw error;
        }
    };

    const handleToggleComplete = async (id: string, currentStatus: boolean) => {
        try {
            await updateDoc(doc(db, "feedback", id), {
                completed: !currentStatus
            });
        } catch (error) {
            console.error("Error toggling complete:", error);
        }
    };

    const handleVote = async (id: string, type: "like" | "dislike") => {
        if (!user) return; // Only logged in users can vote

        try {
            const docRef = doc(db, "feedback", id);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) return;

            const data = docSnap.data();
            const currentVotes = data.votes || {};
            const previousVote = currentVotes[user.uid];

            let likes = data.likes || 0;
            let dislikes = data.dislikes || 0;
            const newVotes = { ...currentVotes };

            // Logic:
            // If clicking same vote type -> remove vote (toggle off)
            // If clicking different vote type -> switch vote
            // If no previous vote -> add vote

            if (previousVote === type) {
                // Remove vote
                delete newVotes[user.uid];
                if (type === "like") likes--;
                else dislikes--;
            } else {
                // Add new vote
                newVotes[user.uid] = type;
                if (type === "like") likes++;
                else dislikes++;

                // If switching, remove old vote effect (neutralize previous)
                if (previousVote) {
                    if (previousVote === "like") likes--;
                    else dislikes--;
                }
            }

            // Safety check for negative counts
            if (likes < 0) likes = 0;
            if (dislikes < 0) dislikes = 0;

            await updateDoc(docRef, {
                votes: newVotes,
                likes,
                dislikes
            });

        } catch (error) {
            console.error("Error voting:", error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Wirklich löschen?")) return;
        try {
            await deleteDoc(doc(db, "feedback", id));
        } catch (error) {
            console.error("Error deleting feedback:", error);
        }
    };

    const handleUpdate = async (data: FeedbackData) => {
        if (!editingItem) return;
        try {
            await updateDoc(doc(db, "feedback", editingItem.id), {
                ...data
            });
            setEditingItem(null);
        } catch (error) {
            console.error("Error updating feedback:", error);
            throw error; // Let modal handle error display if needed (though our modal is simple)
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
                                "text-muted-foreground hover:bg-background/50 hover:text-foreground",
                                isActive && "bg-background shadow-md text-foreground scale-[1.02]"
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

                {/* List View */}
                <FeedbackList
                    items={filteredFeedback}
                    members={members}
                    currentUserId={user?.uid || ""}
                    onToggleComplete={handleToggleComplete}
                    onDelete={handleDelete}
                    onEdit={(id, data) => setEditingItem({ id, data })}
                    onVote={handleVote}
                />
            </div>

            {/* Edit Modal */}
            {editingItem && (
                <EditFeedbackModal
                    type={activeTab} // Using activeTab here, strictly assuming we edit items of current tab view, which is safe enough as list is filtered
                    initialData={editingItem.data}
                    onClose={() => setEditingItem(null)}
                    onSubmit={handleUpdate}
                />
            )}
        </div>
    );
}
