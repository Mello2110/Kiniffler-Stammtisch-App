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

            {/* Calendar Grid - Tiled Look */}
            <div className="rounded-xl border border-white/20 bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-xl shadow-2xl overflow-hidden select-none ring-1 ring-white/5">
                {/* Week Days */}
                <div className="grid grid-cols-7 border-b border-white/20 bg-primary/10">
                    {weekDays.map((day, idx) => (
                        <div key={day} className={cn(
                            "py-3 text-center text-sm font-bold text-primary tracking-wide border-r border-white/20 last:border-r-0"
                        )}>
                            {day}
                        </div>
                    ))}
                </div>

                {/* Days */}
                <div className="grid grid-cols-7 auto-rows-[minmax(100px,auto)] text-sm bg-transparent">
                    {days.map((day, dayIdx) => {
                        const dateStr = format(day, "yyyy-MM-dd");

                        // Filter data for this day
                        const dayVotes = votes.filter(v => v.date === dateStr);
                        const dayEvents = setEvents.filter(e => e.date === dateStr);

                        const isCurrentMonth = isSameMonth(day, firstDayOfMonth);
                        const isToday = isSameDay(day, new Date());

                        // Check if it's the last in a row (mod 7) for border handling
                        const isLastInRow = (dayIdx + 1) % 7 === 0;

                        return (
                            <div
                                key={day.toString()}
                                onClick={() => onDateClick(day)}
                                className={cn(
                                    "min-h-[100px] border-b border-r border-white/20 p-2 transition-all hover:bg-white/10 flex flex-col gap-1 cursor-pointer relative",
                                    !isCurrentMonth && "bg-black/20 text-muted-foreground opacity-50",
                                    isLastInRow && "border-r-0"
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

