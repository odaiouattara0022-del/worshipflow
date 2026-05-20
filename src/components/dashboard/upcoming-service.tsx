import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface UpcomingServiceProps {
  id: string;
  title: string;
  date: string;
  status: string;
  itemCount: number;
  assignmentCount: number;
}

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  DRAFT: { label: "Brouillon", variant: "secondary" },
  READY: { label: "Prêt", variant: "default" },
  DONE: { label: "Terminé", variant: "outline" },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function UpcomingService({
  id,
  title,
  date,
  status,
  itemCount,
  assignmentCount,
}: UpcomingServiceProps) {
  const statusInfo = STATUS_MAP[status] || STATUS_MAP.DRAFT;

  return (
    <Link href={`/services/${id}`}>
      <Card className="p-4 hover:bg-accent/50 transition-colors cursor-pointer">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-sm">{title}</h3>
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
        </div>
        <p className="text-xs text-muted-foreground capitalize">{formatDate(date)}</p>
        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
          <span>{itemCount} élément{itemCount !== 1 ? "s" : ""}</span>
          <span>{assignmentCount} assigné{assignmentCount !== 1 ? "s" : ""}</span>
        </div>
      </Card>
    </Link>
  );
}
