import { Vote, Upload, UserPlus, Dice5 } from "lucide-react";
import Link from "next/link";

export function QuickActions() {
    const actions = [
        { label: "Spielrunde starten", icon: Dice5, color: "text-primary", bg: "bg-primary/15 border-primary/25", href: "/kniffel" },
        { label: "Termin abstimmen", icon: Vote, color: "text-accent", bg: "bg-accent/15 border-accent/25", href: "/events" },
        { label: "Foto hochladen", icon: Upload, color: "text-primary", bg: "bg-primary/15 border-primary/25", href: "/gallery" },
        { label: "Mitglieder & Rollen", icon: UserPlus, color: "text-accent", bg: "bg-accent/15 border-accent/25", href: "/members" },
    ];

    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {actions.map((action, i) => (
                <Link
                    key={i}
                    href={action.href}
                    className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-card/70 px-4 py-3.5 text-card-foreground transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary/10 hover:border-primary/40 hover:shadow-lg"
                >
                    <div className={`rounded-xl p-2.5 border transition-transform duration-300 group-hover:scale-110 shrink-0 ${action.bg} ${action.color}`}>
                        <action.icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs sm:text-sm font-bold leading-tight">{action.label}</span>
                </Link>
            ))}
        </div>
    );
}
