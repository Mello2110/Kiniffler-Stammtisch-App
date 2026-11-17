import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
    title: string;
    value: string | number | React.ReactNode;
    icon: LucideIcon;
    description?: string;
    trend?: {
        value: number;
        label: string;
        positive?: boolean;
    };
    className?: string;
}

export function StatCard({ title, value, icon: Icon, description, trend, className }: StatCardProps) {
    return (
        <div
            className={cn(
                "group relative overflow-hidden rounded-2xl border border-[#F5F0EB]/10 bg-card/85 text-card-foreground shadow-md hover:shadow-lg hover:border-primary/40 transition-all duration-300 p-3.5 sm:p-4",
                className
            )}
        >
            {/* Subtle top-right Duotone Shimmer */}
            <div
                className="pointer-events-none absolute -top-12 -right-12 w-28 h-28 rounded-full blur-2xl opacity-25 group-hover:opacity-45 transition-opacity"
                style={{ backgroundColor: "color-mix(in oklab, hsl(var(--primary)) 38%, transparent)" }}
            />

            <div className="relative z-10 flex items-center justify-between pb-2">
                <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-foreground/90 transition-colors">
                    {title}
                </h3>
                <div className="p-2 rounded-xl bg-primary/15 text-primary border border-primary/20 group-hover:scale-110 transition-transform">
                    <Icon className="h-4 w-4" />
                </div>
            </div>

            <div className="relative z-10 flex flex-col gap-0.5">
                <div className="text-lg sm:text-xl font-bold text-[#F5F0EB] outfit tracking-tight">{value}</div>
                {(description || trend) && (
                    <p className="text-xs text-muted-foreground line-clamp-1">
                        {trend && (
                            <span className={cn("font-medium", trend.positive ? "text-emerald-400" : "text-red-400")}>
                                {trend.positive ? "+" : ""}{trend.value}%
                                <span className="text-muted-foreground ml-1">{trend.label}</span>
                            </span>
                        )}
                        {!trend && description}
                    </p>
                )}
            </div>
        </div>
    );
}
