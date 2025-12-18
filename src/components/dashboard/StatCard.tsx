import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
    title: string;
    value: string | number;
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
        <div className={cn("rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6", className)}>
            <div className="flex items-center justify-between pb-2">
                <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex flex-col gap-1">
                <div className="text-2xl font-bold">{value}</div>
                {(description || trend) && (
                    <p className="text-xs text-muted-foreground">
                        {trend && (
                            <span className={cn("font-medium", trend.positive ? "text-green-500" : "text-red-500")}>
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
