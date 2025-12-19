import { Calendar, MapPin, Clock, Copy, Check } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";

interface NextEventWidgetProps {
    event?: {
        title: string;
        date: string;
        location?: string;
        time?: string;
        type: 'set' | 'vote';
    } | null;
}

export function NextEventWidget({ event }: NextEventWidgetProps) {
    if (!event) {
        return (
            <div className="rounded-xl border border-border bg-gradient-to-br from-primary/10 to-purple-500/10 p-6 shadow-sm h-full flex flex-col justify-center">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg text-foreground">Next Meetup</h3>
                </div>
                <div className="text-center text-muted-foreground py-4">
                    No upcoming events scheduled.
                </div>
                <Link href="/events" className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors text-center block mt-auto">
                    Go to Calendar
                </Link>
            </div>
        );
    }

    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (!event?.location) return;
        navigator.clipboard.writeText(event.location);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="rounded-xl border border-border bg-gradient-to-br from-primary/10 to-purple-500/10 p-6 shadow-sm h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg text-foreground">Next Meetup</h3>
                <span className="rounded-full bg-primary/20 px-3 py-1 text-xs font-medium text-primary">
                    {event.type === 'vote' ? 'Projected' : 'Confirmed'}
                </span>
            </div>

            <div className="space-y-4 flex-1">
                <div>
                    <h4 className="text-2xl font-bold text-primary">{format(parseISO(event.date), "EEEE, MMM d")}</h4>
                    <p className="text-muted-foreground">{event.title}</p>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{event.time || "19:00"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground group">
                        <MapPin className="h-4 w-4" />
                        <span>{event.location || "TBD"}</span>
                        {event.location && (
                            <button
                                onClick={handleCopy}
                                className="ml-2 p-1 rounded-md hover:bg-primary/20 text-primary transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                title="Copy Location"
                            >
                                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <Link href="/events" className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors text-center block mt-4">
                View Details
            </Link>
        </div>
    );
}

