"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { WORSHIP_THEMES, parseTags, serializeTags } from "@/lib/themes";
import { cn } from "@/lib/utils";
import {
  Heart, Music2, Flame, Sparkles, Shield, Anchor, Sunrise,
  RefreshCw, Circle, Radio, Globe, Star, Sun, Leaf, Home, ThumbsUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Heart, Music2, Flame, Sparkles, Shield, Anchor, Sunrise,
  RefreshCw, Circle, Radio, Globe, Star, Sun, Leaf, Home, ThumbsUp,
};
function TIcon({ name, className }: { name: string; className?: string }) {
  const I = ICON_MAP[name]; return I ? <I className={className} /> : null;
}

const KEYS = ["Do", "Do#", "Ré", "Ré#", "Mi", "Fa", "Fa#", "Sol", "Sol#", "La", "La#", "Si"];

interface SongFormProps {
  trigger: React.ReactElement;
  song?: {
    id: string;
    title: string;
    author: string | null;
    lyrics: string;
    defaultKey: string;
    tempo: number | null;
    tags: string;
    ccliNumber: string | null;
    publisher: string | null;
    copyrightYear: number | null;
    artistCredits: string | null;
    album: string | null;
    copyrightDisplay: boolean;
  };
}

export function SongForm({ trigger, song }: SongFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCcli, setShowCcli] = useState(!!song?.ccliNumber);
  const [form, setForm] = useState({
    title: song?.title || "",
    author: song?.author || "",
    lyrics: song?.lyrics || "",
    defaultKey: song?.defaultKey || "Do",
    tempo: song?.tempo?.toString() || "",
    tags: song?.tags || "",
    ccliNumber: song?.ccliNumber || "",
    publisher: song?.publisher || "",
    copyrightYear: song?.copyrightYear?.toString() || "",
    artistCredits: song?.artistCredits || "",
    album: song?.album || "",
    copyrightDisplay: song?.copyrightDisplay ?? true,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const url = song ? `/api/songs/${song.id}` : "/api/songs";
    const method = song ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      setOpen(false);
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{song ? "Modifier le chant" : "Nouveau chant"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Titre *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Auteur</Label>
              <Input
                value={form.author}
                onChange={(e) => setForm({ ...form, author: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Tonalit&eacute;</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                value={form.defaultKey}
                onChange={(e) => setForm({ ...form, defaultKey: e.target.value })}
              >
                {KEYS.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tempo (BPM)</Label>
              <Input
                type="number"
                value={form.tempo}
                onChange={(e) => setForm({ ...form, tempo: e.target.value })}
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Thèmes</Label>
              <div className="flex flex-wrap gap-1.5">
                {WORSHIP_THEMES.map((theme) => {
                  const selected = parseTags(form.tags).includes(theme.slug);
                  return (
                    <button
                      key={theme.slug}
                      type="button"
                      onClick={() => {
                        const current = parseTags(form.tags);
                        const next = selected
                          ? current.filter((t) => t !== theme.slug)
                          : [...current, theme.slug];
                        setForm({ ...form, tags: serializeTags(next) });
                      }}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium border transition-colors",
                        selected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                      )}
                    >
                      <TIcon name={theme.icon} className="h-3 w-3" />
                      {theme.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Paroles</Label>
            <Textarea
              rows={8}
              value={form.lyrics}
              onChange={(e) => setForm({ ...form, lyrics: e.target.value })}
              placeholder={"[Couplet 1]\nParoles ici...\n\n[Refrain]\nParoles du refrain..."}
            />
          </div>

          {/* CCLI / Copyright section */}
          <div className="border-t pt-3">
            <button
              type="button"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowCcli(!showCcli)}
            >
              <span className="text-xs">{showCcli ? "▼" : "▶"}</span>
              Copyright / CCLI
              {form.ccliNumber && <span className="text-xs text-primary">({form.ccliNumber})</span>}
            </button>

            {showCcli && (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>N° CCLI</Label>
                    <Input
                      value={form.ccliNumber}
                      onChange={(e) => setForm({ ...form, ccliNumber: e.target.value })}
                      placeholder="ex: 6428767"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ann&eacute;e de copyright</Label>
                    <Input
                      type="number"
                      value={form.copyrightYear}
                      onChange={(e) => setForm({ ...form, copyrightYear: e.target.value })}
                      placeholder="ex: 2013"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>&Eacute;diteur</Label>
                    <Input
                      value={form.publisher}
                      onChange={(e) => setForm({ ...form, publisher: e.target.value })}
                      placeholder="ex: Hillsong Publishing"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Artiste / Interpr&egrave;te</Label>
                    <Input
                      value={form.artistCredits}
                      onChange={(e) => setForm({ ...form, artistCredits: e.target.value })}
                      placeholder="ex: Hillsong Worship"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Album</Label>
                  <Input
                    value={form.album}
                    onChange={(e) => setForm({ ...form, album: e.target.value })}
                    placeholder="ex: Glorious Ruins"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.copyrightDisplay}
                    onChange={(e) => setForm({ ...form, copyrightDisplay: e.target.checked })}
                    className="rounded border-input"
                  />
                  Afficher le copyright sur les diapos
                </label>
              </div>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Enregistrement..." : song ? "Modifier" : "Créer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
