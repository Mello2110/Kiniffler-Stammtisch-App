"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

export type FeedbackType = "problem" | "suggestion" | "other";
export type Category =
    | "design"
    | "function"
    | "other"
    // New categories for Other Topics
    | "Plattform/App"
    | "Veranstaltungen"
    | "Termine"
    | "Ausflüge"
    | "Sonstiges";

export type Platform = "mobile" | "web" | "both";

export interface FeedbackData {
    heading: string;
    description: string;
    category: Category;
    platform?: Platform; // Made optional
}

interface FeedbackFormProps {
    type: FeedbackType;
    onSubmit: (data: FeedbackData) => Promise<void>;
    className?: string;
}

export function FeedbackForm({ type, onSubmit, className }: FeedbackFormProps) {
    const { dict } = useLanguage();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // Form State
    const [heading, setHeading] = useState("");
    const [description, setDescription] = useState("");
    // Default category depends on type
    const [category, setCategory] = useState<Category>(type === "other" ? "Sonstiges" : "function");
    const [platform, setPlatform] = useState<Platform>("mobile");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!heading.trim() || !description.trim()) return;

        setIsSubmitting(true);
        try {
            const submitData: FeedbackData = {
                heading: heading.trim(),
                description: description.trim(),
                category,
            };

            // Only include platform if NOT "other" type
            if (type !== "other") {
                submitData.platform = platform;
            }

            await onSubmit(submitData);
            setIsSuccess(true);
            // Reset form after delay
            setTimeout(() => {
                setHeading("");
                setDescription("");
                setCategory(type === "other" ? "Sonstiges" : "function");
                setPlatform("mobile");
                setIsSuccess(false);
            }, 3000);
        } catch (error) {
            console.error("Error submitting feedback:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className={cn("flex flex-col items-center justify-center p-8 text-center bg-card border rounded-2xl shadow-sm animate-in fade-in zoom-in duration-300 h-full", className)}>
                <div className="h-16 w-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                </div>
                <h3 className="text-xl font-bold mb-2">{dict.feedback.form.success}</h3>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className={cn("space-y-4 bg-card border rounded-2xl p-6 shadow-sm", className)}>
            <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                    {dict.feedback.form.heading}
                </label>
                <input
                    type="text"
                    value={heading}
                    onChange={(e) => setHeading(e.target.value)}
                    placeholder={dict.feedback.form.headingPlaceholder}
                    className="w-full p-3 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium"
                    required
                    disabled={isSubmitting}
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
                        disabled={isSubmitting}
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
                            disabled={isSubmitting}
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
                    placeholder={dict.feedback.form.descriptionPlaceholder}
                    rows={5}
                    className="w-full p-3 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                    required
                    disabled={isSubmitting}
                />
            </div>

            <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground p-3 rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
                {isSubmitting ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {dict.feedback.form.submitting}
                    </>
                ) : (
                    <>
                        <Send className="h-4 w-4" />
                        {dict.feedback.form.submit}
                    </>
                )}
            </button>
        </form>
    );
}
