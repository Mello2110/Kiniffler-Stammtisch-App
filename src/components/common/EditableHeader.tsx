"use client";

import { useAdmin } from "@/hooks/useAdmin";
import { useEditableHeader } from "@/hooks/useEditableHeader";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

interface EditableHeaderProps {
    pageId: string;
    headerId: string;
    defaultText: string;
    as?: "h1" | "h2" | "h3" | "h4" | "span" | "p";
    className?: string;
    inputClassName?: string;
}

export function EditableHeader({
    pageId,
    headerId,
    defaultText,
    as: Component = "h2",
    className = "",
    inputClassName = ""
}: EditableHeaderProps) {
    const { isAdmin } = useAdmin();
    const {
        text,
        isEditing,
        editValue,
        setIsEditing,
        setEditValue,
        handleSave,
        handleCancel
    } = useEditableHeader(pageId, headerId, defaultText);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSave();
        } else if (e.key === "Escape") {
            handleCancel();
        }
    };

    if (isEditing) {
        return (
            <input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                autoFocus
                className={cn(
                    "bg-background/50 border border-primary rounded px-2 py-1 outline-none text-foreground",
                    inputClassName || className
                )}
            />
        );
    }

    return (
        <div className="inline-flex items-center gap-2 group/header">
            <Component className={className}>
                {text}
            </Component>
            {isAdmin && (
                <button
                    onClick={() => setIsEditing(true)}
                    className="p-1 rounded-md hover:bg-primary/20 transition-all opacity-60 hover:opacity-100"
                    aria-label="Edit header"
                    title="Click to edit"
                >
                    <Pencil className="h-4 w-4 text-primary transition-transform hover:scale-110" />
                </button>
            )}
        </div>
    );
}
