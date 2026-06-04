"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { UserCheck, Bell, Info, Trash2, type LucideIcon } from "lucide-react";

interface NotificationItemProps {
  id: string;
  type: string;
  message: string;
  sentAt: string;
  readAt: string | null;
  onMarkRead: (id: string) => void;
  onDelete?: (id: string) => void;
}

const TYPE_INFO: Record<string, { label: string; icon: LucideIcon; cls: string }> = {
  ASSIGNMENT: { label: "Assignation", icon: UserCheck, cls: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  REMINDER: { label: "Rappel", icon: Bell, cls: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  UPDATE: { label: "Mise à jour", icon: Info, cls: "bg-muted text-muted-foreground" },
};

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "À l'instant";
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`;
  return `Il y a ${Math.floor(diff / 86400)}j`;
}

export function NotificationItem({ id, type, message, sentAt, readAt, onMarkRead, onDelete }: NotificationItemProps) {
  const info = TYPE_INFO[type] || TYPE_INFO.UPDATE;
  const Icon = info.icon;
  const isUnread = !readAt;

  return (
    <div
      className={cn(
        "group flex items-start gap-3 p-3 rounded-lg transition-colors",
        isUnread ? "bg-accent/50 cursor-pointer" : "hover:bg-accent/30"
      )}
      onClick={() => isUnread && onMarkRead(id)}
    >
      <span className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border", info.cls)}>
        <Icon className="h-3.5 w-3.5" />
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className={cn("text-[10px]", info.cls)}>{info.label}</Badge>
          {isUnread && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
          <span className="text-xs text-muted-foreground">{timeAgo(sentAt)}</span>
        </div>
        <p className="text-sm">{message}</p>
      </div>

      {onDelete && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(id); }}
          title="Supprimer"
          aria-label="Supprimer la notification"
          className="shrink-0 rounded-md p-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
