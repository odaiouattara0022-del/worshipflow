"use client";

import { useState } from "react";
import { ChordSheet } from "./chord-sheet";
import { ChordEditor } from "./chord-editor";
import { Button } from "@/components/ui/button";
import { Edit2, Eye, Plus } from "lucide-react";
import { toast } from "sonner";

interface Arrangement {
  id: string;
  name: string;
  key: string;
  chords: string | null;
}

interface ChordSectionProps {
  songId: string;
  songTitle: string;
  songAuthor?: string | null;
  arrangements: Arrangement[];
  defaultKey: string;
}

export function ChordSection({ songId, songTitle, songAuthor, arrangements, defaultKey }: ChordSectionProps) {
  const [arrs, setArrs] = useState<Arrangement[]>(arrangements);
  const [activeArrId, setActiveArrId] = useState(arrs[0]?.id ?? null);
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);

  const activeArr = arrs.find((a) => a.id === activeArrId) ?? null;

  async function createArrangement() {
    setCreating(true);
    try {
      const res = await fetch(`/api/songs/${songId}/arrangements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Standard", key: defaultKey }),
      });
      if (!res.ok) { toast.error("Erreur lors de la création"); return; }
      const arr = await res.json();
      setArrs((prev) => [...prev, arr]);
      setActiveArrId(arr.id);
      setEditing(true);
    } catch {
      toast.error("Erreur de connexion");
    } finally {
      setCreating(false);
    }
  }

  function handleSaved(key: string, chords: string) {
    setArrs((prev) => prev.map((a) => a.id === activeArrId ? { ...a, key, chords } : a));
    setEditing(false);
  }

  if (arrs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
        <p className="text-sm text-muted-foreground">Aucune grille d&apos;accords pour ce chant.</p>
        <Button variant="outline" size="sm" onClick={createArrangement} disabled={creating}>
          <Plus className="h-4 w-4 mr-2" />
          {creating ? "Création…" : "Créer une grille d'accords"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Arrangement tabs + mode toggle */}
      <div className="flex items-center gap-2 flex-wrap">
        {arrs.length > 1 && arrs.map((a) => (
          <button
            key={a.id}
            onClick={() => { setActiveArrId(a.id); setEditing(false); }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              a.id === activeArrId
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {a.name} <span className="ml-1 opacity-70 text-xs">{a.key}</span>
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={createArrangement} disabled={creating}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Arrangement
          </Button>
          <Button
            variant={editing ? "default" : "outline"}
            size="sm"
            onClick={() => setEditing(!editing)}
          >
            {editing ? (
              <><Eye className="h-3.5 w-3.5 mr-1.5" />Aperçu</>
            ) : (
              <><Edit2 className="h-3.5 w-3.5 mr-1.5" />Modifier</>
            )}
          </Button>
        </div>
      </div>

      {/* Content */}
      {activeArr && (
        editing ? (
          <ChordEditor
            arrangementId={activeArr.id}
            initialKey={activeArr.key}
            initialChords={activeArr.chords ?? ""}
            onSaved={handleSaved}
          />
        ) : activeArr.chords ? (
          <ChordSheet
            title={songTitle}
            author={songAuthor}
            chords={activeArr.chords}
            originalKey={activeArr.key}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
            <p className="text-sm text-muted-foreground">Grille vide — ajoutez les accords.</p>
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Edit2 className="h-4 w-4 mr-2" />
              Saisir les accords
            </Button>
          </div>
        )
      )}
    </div>
  );
}
