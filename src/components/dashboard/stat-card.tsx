import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  sublabel?: string;
  trend?: "up" | "neutral" | "down";
}

export function StatCard({ label, value, icon: Icon, sublabel, trend }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        <div className="rounded-md bg-muted p-1.5">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      </div>
      <div className="text-2xl font-semibold tabular-nums tracking-tight">{value}</div>
      {sublabel && (
        <p className={cn(
          "text-xs mt-1.5",
          trend === "up" ? "text-green-600 dark:text-green-400" :
          trend === "down" ? "text-red-500" :
          "text-muted-foreground"
        )}>
          {sublabel}
        </p>
      )}
    </div>
  );
}
