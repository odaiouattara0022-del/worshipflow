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
  };
}

export function SongForm({ trigger, song }: SongFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: song?.title || "",
    author: song?.author || "",
    lyrics: song?.lyrics || "",
    defaultKey: song?.defaultKey || "Do",
    tempo: song?.tempo?.toString() || "",
    tags: song?.tags || "",
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
            <div className="space-y-2">
              <Label>Tags (virgule)</Label>
              <Input
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="louange, adoration"
              />
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
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Enregistrement..." : song ? "Modifier" : "Créer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
