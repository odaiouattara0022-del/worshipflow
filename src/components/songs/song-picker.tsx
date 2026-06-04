"use client";

import { useState } from "react";
import { Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PickableSong {
  id: string;
  title: string;
  defaultKey: string;
}

interface SongPickerProps {
  songs: PickableSong[];
  value: string;                 // selected song id ("" = none)
  onChange: (songId: string) => void;
  allowNone?: boolean;           // show a "no song" choice
}

// A searchable, high-contrast song list. Selected row is filled with the primary
// colour and shows a check, so the current choice is obvious at a glance.
export function SongPicker({ songs, value, onChange, allowNone = false }: SongPickerProps) {
  const [q, setQ] = useState("");
  const filtered = songs.filter((s) => s.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher un chant…"
          className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="max-h-64 overflow-y-auto rounded-lg border border-border bg-card">
        {allowNone && (
          <button
            type="button"
            onClick={() => onChange("")}
            className={cn(
              "flex w-full items-center justify-between gap-2 border-b border-border px-3 py-2.5 text-sm transition-colors",
              value === "" ? "bg-primary text-primary-foreground" : "hover:bg-muted/60"
            )}
          >
            <span className="italic">Aucun chant</span>
            {value === "" && <Check className="h-4 w-4 shrink-0" />}
          </button>
        )}

        {filtered.length === 0 && (
          <p className="px-3 py-3 text-sm text-muted-foreground">Aucun chant trouvé.</p>
        )}

        {filtered.slice(0, 200).map((s) => {
          const selected = s.id === value;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onChange(s.id)}
              className={cn(
                "flex w-full items-center justify-between gap-2 border-b border-border px-3 py-2.5 text-sm transition-colors last:border-b-0",
                selected ? "bg-primary text-primary-foreground" : "hover:bg-muted/60"
              )}
            >
              <span className="truncate font-medium">{s.title}</span>
              <span className="flex items-center gap-2 shrink-0">
                <span className={cn("text-xs", selected ? "text-primary-foreground/80" : "text-muted-foreground")}>
                  {s.defaultKey}
                </span>
                {selected && <Check className="h-4 w-4" />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
