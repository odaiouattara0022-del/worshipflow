"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { WORSHIP_THEMES, parseTags, type Theme } from "@/lib/themes";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, Search, ChevronRight,
  Heart, Music2, Flame, Sparkles, Shield, Anchor, Sunrise,
  RefreshCw, Circle, Radio, Globe, Star, Sun, Leaf, Home, ThumbsUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Heart, Music2, Flame, Sparkles, Shield, Anchor, Sunrise,
  RefreshCw, Circle, Radio, Globe, Star, Sun, Leaf, Home, ThumbsUp,
};

interface Song {
  id: string;
  title: string;
  author: string | null;
  tags: string | null;
  defaultKey: string | null;
}

function ThemeIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name];
  return Icon ? <Icon className={className} /> : null;
}

export default function ThemesPage() {
  const router = useRouter();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTheme, setActiveTheme] = useState<Theme | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/songs")
      .then((r) => r.json())
      .then((d) => { setSongs(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const countByTheme = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of songs)
      for (const t of parseTags(s.tags))
        map.set(t, (map.get(t) ?? 0) + 1);
    return map;
  }, [songs]);

  const themeSongs = useMemo(() =>
    activeTheme ? songs.filter((s) => parseTags(s.tags).includes(activeTheme.slug)) : [],
    [songs, activeTheme]);

  const filteredSongs = useMemo(() => {
    if (!search.trim()) return themeSongs;
    const q = search.toLowerCase();
    return themeSongs.filter((s) =>
      s.title.toLowerCase().includes(q) || s.author?.toLowerCase().includes(q)
    );
  }, [themeSongs, search]);

  /* ─── Theme browser ─── */
  if (!activeTheme) {
    return (
      <div>
        {/* Page header */}
        <div className="mb-8 border-b border-border pb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Thèmes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? "Chargement…" : `${songs.length} chants · ${WORSHIP_THEMES.length} catégories`}
          </p>
        </div>

        {/* Theme grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px bg-border rounded-lg overflow-hidden border border-border">
          {WORSHIP_THEMES.map((theme) => {
            const count = countByTheme.get(theme.slug) ?? 0;
            return (
              <button
                key={theme.slug}
                onClick={() => { setActiveTheme(theme); setSearch(""); }}
                className="group flex flex-col gap-3 bg-card p-5 text-left hover:bg-accent transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="rounded-md bg-muted p-2">
                    <ThemeIcon name={theme.icon} className="h-4 w-4 text-foreground" />
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{theme.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{theme.description}</p>
                </div>
                <p className="text-xs text-muted-foreground font-medium">
                  {count} {count === 1 ? "chant" : "chants"}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  /* ─── Song list ─── */
  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start gap-4">
        <button
          onClick={() => setActiveTheme(null)}
          className="mt-1 rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <div className="rounded-md bg-muted p-2 shrink-0">
              <ThemeIcon name={activeTheme.icon} className="h-4 w-4 text-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{activeTheme.label}</h1>
              <p className="text-sm text-muted-foreground">{activeTheme.description}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Rechercher…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-9 rounded-md border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Count */}
      <p className="text-xs text-muted-foreground mb-3">
        {filteredSongs.length} {filteredSongs.length === 1 ? "chant" : "chants"}
        {search && ` pour « ${search} »`}
      </p>

      {/* Song table */}
      {filteredSongs.length === 0 ? (
        <div className="rounded-lg border border-border bg-card py-16 text-center text-muted-foreground">
          <Music2 className="h-8 w-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">
            {search ? "Aucun résultat" : "Aucun chant dans ce thème"}
          </p>
          {!search && (
            <p className="text-xs mt-1 opacity-70">
              Ouvrez un chant et ajoutez-lui le thème « {activeTheme.label} »
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[2rem_1fr_auto_auto] gap-4 bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border">
            <span>#</span>
            <span>Titre</span>
            <span className="hidden md:block">Autres thèmes</span>
            <span>Ton.</span>
          </div>

          {/* Rows */}
          {filteredSongs.map((song, idx) => {
            const otherThemes = parseTags(song.tags)
              .filter((t) => t !== activeTheme.slug)
              .map((t) => WORSHIP_THEMES.find((x) => x.slug === t))
              .filter(Boolean) as Theme[];

            return (
              <button
                key={song.id}
                onClick={() => router.push(`/songs/${song.id}`)}
                className={cn(
                  "group w-full grid grid-cols-[2rem_1fr_auto_auto] gap-4 items-center px-4 py-3 text-left transition-colors hover:bg-accent/50",
                  idx !== filteredSongs.length - 1 && "border-b border-border/50"
                )}
              >
                <span className="text-xs text-muted-foreground tabular-nums group-hover:hidden">{idx + 1}</span>
                <ChevronRight className="hidden group-hover:block h-3.5 w-3.5 text-muted-foreground" />

                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{song.title}</p>
                  {song.author && (
                    <p className="text-xs text-muted-foreground truncate">{song.author}</p>
                  )}
                </div>

                <div className="hidden md:flex gap-1 items-center">
                  {otherThemes.slice(0, 2).map((t) => (
                    <span key={t.slug} className="inline-flex items-center gap-1 text-xs text-muted-foreground border border-border rounded px-1.5 py-0.5">
                      <ThemeIcon name={t.icon} className="h-3 w-3" />
                      {t.label}
                    </span>
                  ))}
                  {otherThemes.length > 2 && (
                    <span className="text-xs text-muted-foreground">+{otherThemes.length - 2}</span>
                  )}
                </div>

                <span className="text-xs font-mono text-muted-foreground">
                  {song.defaultKey ?? "—"}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
