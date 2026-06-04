"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";

interface Song {
  id: string;
  title: string;
  defaultKey: string;
}

interface User {
  id: string;
  name: string;
}

interface ServiceItemData {
  id: string;
  type: string;
  title: string;
  order: number;
  duration: number;
  notes: string | null;
  songId: string | null;
  assigneeId: string | null;
  song: { title: string; defaultKey: string } | null;
  assignee: { id: string; name: string } | null;
}

interface ItemDetailPanelProps {
  item: ServiceItemData;
  serviceId: string;
  songs: Song[];
  users: User[];
  unavailableUserIds?: string[];
  onSave: (updated: ServiceItemData) => void;
  onDelete: (itemId: string) => void;
}

export function ItemDetailPanel({
  item,
  serviceId,
  songs,
  users,
  unavailableUserIds = [],
  onSave,
  onDelete,
}: ItemDetailPanelProps) {
  const [form, setForm] = useState({
    title: item.title,
    duration: item.duration,
    notes: item.notes ?? "",
    songId: item.songId ?? "",
    assigneeId: item.assigneeId ?? "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      title: item.title,
      duration: item.duration,
      notes: item.notes ?? "",
      songId: item.songId ?? "",
      assigneeId: item.assigneeId ?? "",
    });
  }, [item.id, item.title, item.duration, item.notes, item.songId, item.assigneeId]);

  async function handleSave() {
    setSaving(true);
    const res = await fetch(
      `/api/services/${serviceId}/items/${item.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          duration: form.duration,
          notes: form.notes || null,
          songId: form.songId || null,
          assigneeId: form.assigneeId || null,
        }),
      }
    );
    if (res.ok) {
      const updated = await res.json();
      onSave(updated);
    }
    setSaving(false);
  }

  async function handleDelete() {
    const res = await fetch(
      `/api/services/${serviceId}/items/${item.id}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      onDelete(item.id);
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-sm">Détails de l&apos;élément</h3>

      <div className="space-y-2">
        <Label>Titre</Label>
        <Input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label>Durée (minutes)</Label>
        <Input
          type="number"
          min={1}
          value={form.duration}
          onChange={(e) =>
            setForm({ ...form, duration: parseInt(e.target.value) || 1 })
          }
        />
      </div>

      {item.type === "SONG" && (
        <div className="space-y-2">
          <Label>Chant</Label>
          <Combobox
            options={songs.map((s) => ({ value: s.id, label: s.title, hint: s.defaultKey }))}
            value={form.songId}
            onChange={(songId) => setForm({ ...form, songId })}
            allowNone
            noneLabel="Aucun chant"
            placeholder="Choisir un chant…"
            searchPlaceholder="Rechercher un chant…"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label>Responsable</Label>
        <Combobox
          options={users.map((u) => ({
            value: u.id,
            label: u.name,
            note: unavailableUserIds.includes(u.id) ? "indisponible" : undefined,
          }))}
          value={form.assigneeId}
          onChange={(assigneeId) => setForm({ ...form, assigneeId })}
          allowNone
          noneLabel="Aucun responsable"
          placeholder="Choisir un responsable…"
          searchPlaceholder="Rechercher un membre…"
        />
        {form.assigneeId && unavailableUserIds.includes(form.assigneeId) && (
          <p className="text-xs text-amber-600">⚠ Cette personne s&apos;est déclarée indisponible ce jour-là.</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea
          rows={4}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Notes pour cet élément..."
        />
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving} className="flex-1">
          {saving ? "Enregistrement..." : "Enregistrer"}
        </Button>
        <Button variant="destructive" onClick={handleDelete}>
          Supprimer
        </Button>
      </div>
    </div>
  );
}
