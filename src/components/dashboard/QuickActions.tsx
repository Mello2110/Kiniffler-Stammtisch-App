import { Vote, Upload, UserPlus } from "lucide-react";
import Link from "next/link";

export function QuickActions() {
    const actions = [
        { label: "Vote for Date", icon: Vote, color: "text-blue-500", bg: "bg-blue-500/10", href: "/events" },
        { label: "Upload Photo", icon: Upload, color: "text-purple-500", bg: "bg-purple-500/10", href: "/gallery" },
        { label: "Invite Member", icon: UserPlus, color: "text-green-500", bg: "bg-green-500/10", href: "/members" },
    ];

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {actions.map((action, i) => (
                <Link
                    key={i}
                    href={action.href}
                    // Changed hover effects as requested:
                    // - Added duration-200 for smooth transition
                    // - Changed hover:bg-accent to hover:bg-accent/40 for subtler effect
                    // - Added hover:shadow-lg for soft shadow
                    // - Added hover:-translate-y-0.5 for subtle 2px lift
                    // - Reduced border opacity slightly for subtlety
                    className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card p-4 text-card-foreground transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent/40 hover:border-primary/40 hover:shadow-lg"
                >
                    <div className={`rounded-full p-3 ${action.bg} ${action.color}`}>
                        <action.icon className="h-6 w-6" />
                    </div>
                    <span className="text-sm font-medium">{action.label}</span>
                </Link>
            ))}
        </div>
    );
}
