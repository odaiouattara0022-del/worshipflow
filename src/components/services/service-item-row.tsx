"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TYPE_COLORS: Record<string, string> = {
  SONG: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  PRAYER: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  SERMON: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  OFFERING: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  ANNOUNCEMENT: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  VIDEO: "bg-pink-500/10 text-pink-600 border-pink-500/20",
  COUNTDOWN: "bg-red-500/10 text-red-600 border-red-500/20",
  CUSTOM: "bg-gray-500/10 text-gray-600 border-gray-500/20",
};

interface ServiceItemRowProps {
  item: {
    id: string;
    type: string;
    title: string;
    duration: number;
    songId: string | null;
    song: { title: string; defaultKey: string } | null;
    assignee: { id: string; name: string } | null;
  };
  isSelected: boolean;
  onClick: () => void;
  time?: string;
}

export function ServiceItemRow({ item, isSelected, onClick, time }: ServiceItemRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const displayTitle =
    item.type === "SONG" && item.song
      ? `${item.song.title} (${item.song.defaultKey})`
      : item.title;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={cn(
        "flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors cursor-pointer",
        isSelected
          ? "border-primary bg-primary/5"
          : "border-border hover:bg-muted/50",
        isDragging && "opacity-50 shadow-lg"
      )}
      onClick={onClick}
    >
      <button
        ref={setActivatorNodeRef}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
        aria-label="Réorganiser"
      >
        ⠿
      </button>

      {time && (
        <span className="text-xs font-mono text-muted-foreground shrink-0 w-11 tabular-nums">
          {time}
        </span>
      )}

      <Badge className={cn("text-[10px] shrink-0", TYPE_COLORS[item.type] ?? TYPE_COLORS.CUSTOM)}>
        {item.type}
      </Badge>

      <span className="flex-1 text-sm truncate">{displayTitle}</span>

      <span className="text-xs text-muted-foreground shrink-0">
        {item.duration} min
      </span>

      {item.assignee && (
        <span className="text-xs text-muted-foreground shrink-0 max-w-24 truncate">
          {item.assignee.name}
        </span>
      )}
    </div>
  );
}
