"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SongTabsProps {
  lyricsContent: ReactNode;
  chordsContent: ReactNode;
}

export function SongTabs({ lyricsContent, chordsContent }: SongTabsProps) {
  const [tab, setTab] = useState<"lyrics" | "chords">("lyrics");

  return (
    <div>
      <div className="flex border-b border-border mb-4">
        {([
          { key: "lyrics", label: "Paroles & Slides" },
          { key: "chords", label: "Grille d'accords" },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "lyrics" ? lyricsContent : chordsContent}
    </div>
  );
}
