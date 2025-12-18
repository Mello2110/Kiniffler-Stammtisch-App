"use client";

import { useState } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StammtischVote, SetEvent } from "@/types";

interface CalendarViewProps {
    votes: StammtischVote[];
    setEvents: SetEvent[];
    onDateClick: (date: Date) => void;
    currentMonth: Date;
    onMonthChange: (date: Date) => void;
}

export function CalendarView({ votes, setEvents, onDateClick, currentMonth, onMonthChange }: CalendarViewProps) {
    const firstDayOfMonth = startOfMonth(currentMonth);
    const lastDayOfMonth = endOfMonth(currentMonth);
    const startDate = startOfWeek(firstDayOfMonth, { weekStartsOn: 1 }); // Monday start
    const endDate = endOfWeek(lastDayOfMonth, { weekStartsOn: 1 });

    const dateFormat = "d";
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const nextMonth = () => onMonthChange(addMonths(currentMonth, 1));
    const prevMonth = () => onMonthChange(subMonths(currentMonth, 1));

    const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    return (
        <div className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold font-heading">
                    {format(currentMonth, "MMMM yyyy")}
                </h2>
                <div className="flex gap-2">
                    <button onClick={prevMonth} className="p-2 rounded-full hover:bg-muted transition-colors">
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button onClick={nextMonth} className="p-2 rounded-full hover:bg-muted transition-colors">
                        <ChevronRight className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden select-none">
                {/* Week Days */}
                <div className="grid grid-cols-7 border-b border-border bg-muted/30">
                    {weekDays.map(day => (
                        <div key={day} className="py-3 text-center text-sm font-semibold text-muted-foreground">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Days */}
                <div className="grid grid-cols-7 auto-rows-[minmax(100px,auto)] text-sm">
                    {days.map((day, dayIdx) => {
                        const dateStr = format(day, "yyyy-MM-dd");

                        // Filter data for this day
                        const dayVotes = votes.filter(v => v.date === dateStr);
                        const dayEvents = setEvents.filter(e => e.date === dateStr);

                        const isCurrentMonth = isSameMonth(day, firstDayOfMonth);
                        const isToday = isSameDay(day, new Date());

                        return (
                            <div
                                key={day.toString()}
                                onClick={() => onDateClick(day)}
                                className={cn(
                                    "min-h-[100px] border-b border-r border-border p-2 transition-all hover:bg-muted/20 flex flex-col gap-1 cursor-pointer relative",
                                    !isCurrentMonth && "bg-muted/10 text-muted-foreground opacity-50",
                                    (dayIdx + 1) % 7 === 0 && "border-r-0"
                                )}
                            >
                                <div className="flex justify-between items-start">
                                    <span className={cn(
                                        "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium",
                                        isToday && "bg-primary text-primary-foreground"
                                    )}>
                                        {format(day, dateFormat)}
                                    </span>
                                    {dayVotes.length > 0 && (
                                        <div className="flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-0.5 text-[10px] font-bold text-yellow-600 dark:text-yellow-400">
                                            {dayVotes.length} {dayVotes.length === 1 ? 'vote' : 'votes'}
                                        </div>
                                    )}
                                </div>


                                {/* Event Indicators */}
                                <div className="mt-1 flex flex-col gap-1">
                                    {dayEvents.map(event => (
                                        <div key={event.id} className="rounded-sm bg-purple-500/10 px-1.5 py-0.5 text-[10px] text-purple-600 dark:text-purple-300 font-medium truncate border border-purple-500/20">
                                            {event.title}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

