"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface NotificationItemProps {
  id: string;
  type: string;
  message: string;
  sentAt: string;
  readAt: string | null;
  onMarkRead: (id: string) => void;
}

const TYPE_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  ASSIGNMENT: { label: "Assignation", variant: "default" },
  REMINDER: { label: "Rappel", variant: "secondary" },
  UPDATE: { label: "Mise à jour", variant: "outline" },
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return "À l'instant";
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`;
  return `Il y a ${Math.floor(diff / 86400)}j`;
}

export function NotificationItem({
  id,
  type,
  message,
  sentAt,
  readAt,
  onMarkRead,
}: NotificationItemProps) {
  const typeInfo = TYPE_LABELS[type] || TYPE_LABELS.UPDATE;
  const isUnread = !readAt;

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg transition-colors cursor-pointer",
        isUnread ? "bg-accent/50" : "hover:bg-accent/30"
      )}
      onClick={() => isUnread && onMarkRead(id)}
    >
      {isUnread && (
        <div className="mt-1.5 w-2 h-2 rounded-full bg-primary shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant={typeInfo.variant}>{typeInfo.label}</Badge>
          <span className="text-xs text-muted-foreground">{timeAgo(sentAt)}</span>
        </div>
        <p className="text-sm">{message}</p>
      </div>
    </div>
  );
}
