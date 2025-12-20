import { Vote, Upload, UserPlus } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

export function QuickActions() {
    const { dict } = useLanguage();

    const actions = [
        {
            label: dict.headers.events.title, // "Vote for Date" roughly maps to events title or could be hardcoded if no direct translation
            // Actually, looking at the original file, it had hardcoded labels "Vote for Date" etc. 
            // But I should probably check if there are better dictionary keys, or just keep the hardcoded ones if that's what was there.
            // Wait, I see dictionaries.ts has "quickActions" section but maybe not specific action labels?
            // Let's re-read dictionaries.ts to see if there are better matches, 
            // OR I can just stick to what the user had or improve it to use the dictionary if obvious.
            // The user had: "Vote for Date", "Upload Photo", "Invite Member".
            // dictionaries.ts has:
            // events.modal.vote.title: "Vote for Stammtisch" / "Für Termin stimmen"
            // generic "Upload" isn't there but Gallery header is.
            // "Invite Member" isn't explicitly there but "registerDesc" is "Join..."

            // To be safe and quick (since user just wants visual update), I will stick to the hardcoded labels 
            // OR finding the closest match if I want to be "smart".
            // The user didn't ask for localization support specifically, just "hover effect".
            // However, the original code had hardcoded strings: "Vote for Date", "Upload Photo", "Invite Member".
            // My previous attempt (which they liked but lost) used those hardcoded strings.
            // I should stick to exactly what I wrote before to be safe.
            // Wait, looking at my previous write... I didn't use useLanguage.
            // I will stick to the exact previous code I generated which was correct.

            label: "Vote for Date",
            icon: Vote,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
            hoverExample: "group-hover:bg-blue-500 group-hover:text-white",
            borderColor: "hover:border-blue-500/50",
            shadow: "hover:shadow-blue-500/10",
            href: "/events"
        },
        {
            label: "Upload Photo",
            icon: Upload,
            color: "text-purple-500",
            bg: "bg-purple-500/10",
            hoverExample: "group-hover:bg-purple-500 group-hover:text-white",
            borderColor: "hover:border-purple-500/50",
            shadow: "hover:shadow-purple-500/10",
            href: "/gallery"
        },
        {
            label: "Invite Member",
            icon: UserPlus,
            color: "text-green-500",
            bg: "bg-green-500/10",
            hoverExample: "group-hover:bg-green-500 group-hover:text-white",
            borderColor: "hover:border-green-500/50",
            shadow: "hover:shadow-green-500/10",
            href: "/members"
        },
    ];

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {actions.map((action, i) => (
                <Link
                    key={i}
                    href={action.href}
                    className={`group relative flex flex-col items-center justify-center gap-4 rounded-3xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${action.borderColor} ${action.shadow}`}
                >
                    {/* Background Subtle Gradient */}
                    <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-transparent via-transparent to-primary/5 pointer-events-none" />

                    {/* Icon Container */}
                    <div className={`relative z-10 rounded-2xl p-4 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-lg ${action.bg} ${action.color} ${action.hoverExample}`}>
                        <action.icon className="h-8 w-8" />
                    </div>

                    {/* Label */}
                    <span className="relative z-10 text-base font-bold text-muted-foreground transition-colors duration-300 group-hover:text-foreground">
                        {action.label}
                    </span>
                </Link>
            ))}
        </div>
    );
}
