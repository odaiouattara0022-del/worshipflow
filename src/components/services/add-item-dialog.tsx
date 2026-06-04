"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Combobox } from "@/components/ui/combobox";

const ITEM_TYPES = [
  { value: "SONG", label: "Chant", icon: "🎵" },
  { value: "PRAYER", label: "Prière", icon: "🙏" },
  { value: "SERMON", label: "Prédication", icon: "📖" },
  { value: "OFFERING", label: "Offrande", icon: "💝" },
  { value: "ANNOUNCEMENT", label: "Annonce", icon: "📢" },
  { value: "VIDEO", label: "Vidéo", icon: "🎬" },
  { value: "COUNTDOWN", label: "Compte à rebours", icon: "⏱" },
  { value: "CUSTOM", label: "Personnalisé", icon: "✏️" },
] as const;

interface SongOption { id: string; title: string; defaultKey: string }

interface AddItemDialogProps {
  serviceId: string;
  songs: SongOption[];
  onItemAdded: (item: Record<string, unknown>) => void;
}

export function AddItemDialog({ serviceId, songs, onItemAdded }: AddItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("");
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("5");
  const [songId, setSongId] = useState("");
  const [loading, setLoading] = useState(false);

  function reset() {
    setSelectedType("");
    setTitle("");
    setDuration("5");
    setSongId("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedType) return;

    const chosenSong = selectedType === "SONG" ? songs.find((s) => s.id === songId) : undefined;
    const finalTitle =
      chosenSong?.title ||
      title ||
      ITEM_TYPES.find((t) => t.value === selectedType)?.label ||
      selectedType;

    setLoading(true);
    const res = await fetch(`/api/services/${serviceId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: selectedType,
        title: finalTitle,
        duration: parseInt(duration) || 5,
        ...(chosenSong ? { songId: chosenSong.id } : {}),
      }),
    });

    if (res.ok) {
      const item = await res.json();
      onItemAdded(item);
      reset();
      setOpen(false);
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" className="w-full border-dashed" />}>
        + Ajouter un élément
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un élément</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {ITEM_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                className={cn(
                  "flex items-center gap-2 rounded-lg border p-3 text-sm transition-colors text-left",
                  selectedType === type.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                )}
                onClick={() => setSelectedType(type.value)}
              >
                <span>{type.icon}</span>
                <span>{type.label}</span>
              </button>
            ))}
          </div>

          {selectedType === "SONG" && (
            <div className="space-y-2">
              <Label>Choisir le chant</Label>
              <Combobox
                options={songs.map((s) => ({ value: s.id, label: s.title, hint: s.defaultKey }))}
                value={songId}
                onChange={setSongId}
                placeholder="Choisir un chant…"
                searchPlaceholder="Rechercher un chant…"
              />
              <p className="text-[11px] text-muted-foreground">
                Optionnel — vous pourrez aussi choisir/changer le chant plus tard.
              </p>
            </div>
          )}

          {selectedType && selectedType !== "SONG" && (
            <div className="space-y-2">
              <Label>Titre</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={ITEM_TYPES.find((t) => t.value === selectedType)?.label}
              />
            </div>
          )}

          {selectedType && (
            <>
              <div className="space-y-2">
                <Label>Durée (minutes)</Label>
                <Input
                  type="number"
                  min={1}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Ajout..." : "Ajouter"}
              </Button>
            </>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
