"use client";

import { X } from "lucide-react";
import { FeedbackForm, FeedbackData, FeedbackType, Category, Platform } from "@/components/feedback/FeedbackForm";

interface EditFeedbackModalProps {
    type: FeedbackType;
    initialData: FeedbackData;
    onClose: () => void;
    onSubmit: (data: FeedbackData) => Promise<void>;
}

export function EditFeedbackModal({ type, initialData, onClose, onSubmit }: EditFeedbackModalProps) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-background w-full max-w-lg rounded-2xl shadow-2xl relative animate-in zoom-in-95 duration-300 overflow-hidden">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 hover:bg-muted rounded-full transition-colors z-10"
                >
                    <X className="h-5 w-5 text-muted-foreground" />
                </button>

                <div className="p-6">
                    <h2 className="text-xl font-bold mb-4">Eintrag bearbeiten</h2>

                    {/* We reuse the FeedbackForm but need to pre-fill it. 
                        However, FeedbackForm currently manages its own state and doesn't accept initial values prop.
                        NOTE: I need to refactor FeedbackForm to accept initialValues or controlled state 
                        OR I just copy the form logic here for now to avoid breaking the create flow.
                        
                        Wait, better approach: Modify FeedbackForm to accept `initialValues`.
                        But I am in the middle of this file creation.
                        Let's verify FeedbackForm first. It does NOT accept initialValues.
                        
                        I will make a Wrapper here that manually renders the inputs for now, 
                        OR I implement a quick "dumb" version here to save time and avoid touching shared components riskily.
                        Actually, user said "100% Kanpai style", reusing would be best.
                        
                        Let's Modify FeedbackForm first? No, I'll stick to creating this file, but make it a full form implementation 
                        matching the design, initialized with data.
                    */}

                    <EditFormContent initialData={initialData} type={type} onSubmit={onSubmit} onClose={onClose} />
                </div>
            </div>
        </div>
    );
}

// Internal component to handle state for edit mode
import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

function EditFormContent({ initialData, type, onSubmit, onClose }: { initialData: FeedbackData, type: FeedbackType, onSubmit: (d: FeedbackData) => Promise<void>, onClose: () => void }) {
    const { dict } = useLanguage();
    const [heading, setHeading] = useState(initialData.heading);
    const [description, setDescription] = useState(initialData.description);
    const [category, setCategory] = useState<Category>(initialData.category);
    // Platform might be undefined, default to mobile if so, but it won't be used if type is other
    const [platform, setPlatform] = useState<Platform>(initialData.platform || "mobile");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const submitData: FeedbackData = {
                heading,
                description,
                category
            };

            if (type !== "other") {
                submitData.platform = platform;
            }

            await onSubmit(submitData);
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                    {dict.feedback.form.heading}
                </label>
                <input
                    type="text"
                    value={heading}
                    onChange={(e) => setHeading(e.target.value)}
                    className="w-full p-3 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium"
                    required
                />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                        {dict.feedback.form.category}
                    </label>
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as Category)}
                        className="w-full p-3 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all appearance-none cursor-pointer"
                    >
                        {type === "other" ? (
                            <>
                                <option value="Plattform/App">Plattform/App</option>
                                <option value="Veranstaltungen">Veranstaltungen</option>
                                <option value="Termine">Termine</option>
                                <option value="Ausflüge">Ausflüge</option>
                                <option value="Sonstiges">Sonstiges</option>
                            </>
                        ) : (
                            <>
                                <option value="design">{dict.feedback.form.categories.design}</option>
                                <option value="function">{dict.feedback.form.categories.function}</option>
                                <option value="other">{dict.feedback.form.categories.other}</option>
                            </>
                        )}
                    </select>
                </div>

                {type !== "other" && (
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                            {dict.feedback.form.platform}
                        </label>
                        <select
                            value={platform}
                            onChange={(e) => setPlatform(e.target.value as Platform)}
                            className="w-full p-3 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all appearance-none cursor-pointer"
                        >
                            <option value="mobile">Mobile</option>
                            <option value="web">Web</option>
                            <option value="both">Both (Web & Mobile)</option>
                        </select>
                    </div>
                )}
            </div>

            <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                    {dict.feedback.form.description}
                </label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={5}
                    className="w-full p-3 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                    required
                />
            </div>

            <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground p-3 rounded-xl font-bold hover:opacity-90 transition-opacity"
            >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Speichern"}
            </button>
        </form>
    );
}
