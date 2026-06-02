import Link from "next/link";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface UpcomingServiceProps {
  id: string;
  title: string;
  date: string;
  status: string;
  itemCount: number;
  assignmentCount: number;
}

const STATUS: Record<string, { dot: string; label: string }> = {
  DRAFT:  { dot: "bg-amber-400",   label: "Brouillon" },
  READY:  { dot: "bg-emerald-500", label: "Prêt" },
  DONE:   { dot: "bg-muted-foreground/40", label: "Terminé" },
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const dayName = d.toLocaleDateString("fr-FR", { weekday: "long" });
  const dayNum  = d.getDate();
  const month   = d.toLocaleDateString("fr-FR", { month: "long" });
  return { day: `${dayName.charAt(0).toUpperCase()}${dayName.slice(1)} ${dayNum}`, month };
}

export function UpcomingService({ id, title, date, status, itemCount, assignmentCount }: UpcomingServiceProps) {
  const s = STATUS[status] ?? STATUS.DRAFT;
  const { day, month } = formatDate(date);

  return (
    <Link
      href={`/services/${id}`}
      className="group flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-3 hover:bg-accent/50 transition-colors"
    >
      {/* Date block */}
      <div className="shrink-0 text-center w-10">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide leading-none">{month.slice(0,3)}</p>
        <p className="text-lg font-semibold tabular-nums leading-tight">{day.split(" ")[1]}</p>
      </div>

      <div className="w-px h-8 bg-border shrink-0" />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{day.split(" ")[0]} · {itemCount} élément{itemCount !== 1 ? "s" : ""} · {assignmentCount} personne{assignmentCount !== 1 ? "s" : ""}</p>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <div className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
          <span className="text-xs text-muted-foreground">{s.label}</span>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  );
}
