import { format } from "date-fns";
import { MapPin, Calendar, Clock, ChevronRight } from "lucide-react";
import type { Event } from "@/types";

interface EventListProps {
    events: Event[];
}

export function EventList({ events }: EventListProps) {
    if (events.length === 0) {
        return <div className="p-8 text-center text-muted-foreground">No upcoming events found.</div>;
    }

    return (
        <div className="flex flex-col gap-4">
            {events.map((event) => (
                <div
                    key={event.id}
                    className="group flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/50 sm:flex-row sm:items-center sm:justify-between"
                >
                    <div className="flex items-start gap-4">
                        <div className="flex h-16 w-16 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <span className="text-xs font-bold uppercase">{format(new Date(event.date), "MMM")}</span>
                            <span className="text-xl font-bold">{format(new Date(event.date), "d")}</span>
                        </div>

                        <div className="flex flex-col gap-1">
                            <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">{event.title}</h3>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <Clock className="h-3.5 w-3.5" />
                                    {format(new Date(event.date), "HH:mm")}
                                </span>
                                <span className="flex items-center gap-1">
                                    <MapPin className="h-3.5 w-3.5" />
                                    {event.location}
                                </span>
                            </div>
                            {event.description && <p className="text-sm text-muted-foreground line-clamp-1">{event.description}</p>}
                        </div>
                    </div>

                    <button className="flex items-center justify-center rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 sm:w-auto w-full mt-2 sm:mt-0">
                        Details
                        <ChevronRight className="ml-2 h-4 w-4" />
                    </button>
                </div>
            ))}
        </div>
    );
}
