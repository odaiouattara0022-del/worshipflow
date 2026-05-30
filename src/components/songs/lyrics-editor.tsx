"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  GripVertical,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  Eye,
  Pencil,
  Copy,
} from "lucide-react";

interface LyricsEditorProps {
  songId: string;
  songTitle: string;
  initialLyrics: string;
}

/**
 * Split lyrics into sections (verses/choruses) based on blank lines.
 * Each blank line creates a new slide in ProPresenter.
 */
function splitSections(lyrics: string): string[] {
  return lyrics
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function joinSections(sections: string[]): string {
  return sections.join("\n\n");
}

export function LyricsEditor({
  songId,
  songTitle,
  initialLyrics,
}: LyricsEditorProps) {
  const [sections, setSections] = useState<string[]>(() =>
    splitSections(initialLyrics)
  );
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<"preview" | "edit">("preview");
  const [fullText, setFullText] = useState(initialLyrics);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const hasChanges =
    mode === "edit"
      ? fullText !== initialLyrics
      : joinSections(sections) !== initialLyrics;

  // Save lyrics
  const handleSave = useCallback(async () => {
    setSaving(true);
    const lyrics = mode === "edit" ? fullText : joinSections(sections);
    try {
      const res = await fetch(`/api/songs/${songId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lyrics }),
      });
      if (res.ok) {
        toast.success("Paroles enregistrées");
        // Sync both modes
        if (mode === "edit") {
          setSections(splitSections(fullText));
        } else {
          setFullText(joinSections(sections));
        }
      } else {
        toast.error("Erreur lors de la sauvegarde");
      }
    } catch {
      toast.error("Erreur de connexion");
    } finally {
      setSaving(false);
    }
  }, [songId, sections, fullText, mode]);

  // Section operations
  function moveSection(from: number, to: number) {
    const next = [...sections];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setSections(next);
    setFullText(joinSections(next));
  }

  function deleteSection(index: number) {
    const next = sections.filter((_, i) => i !== index);
    setSections(next);
    setFullText(joinSections(next));
  }

  function duplicateSection(index: number) {
    const next = [...sections];
    next.splice(index + 1, 0, sections[index]);
    setSections(next);
    setFullText(joinSections(next));
  }

  function addSection() {
    const next = [...sections, ""];
    setSections(next);
    setFullText(joinSections(next));
    setEditingIndex(next.length - 1);
    setEditText("");
  }

  function startEdit(index: number) {
    setEditingIndex(index);
    setEditText(sections[index]);
  }

  function confirmEdit() {
    if (editingIndex === null) return;
    const next = [...sections];
    next[editingIndex] = editText.trim();
    // Remove if empty
    if (!next[editingIndex]) {
      next.splice(editingIndex, 1);
    }
    setSections(next);
    setFullText(joinSections(next));
    setEditingIndex(null);
    setEditText("");
  }

  function cancelEdit() {
    setEditingIndex(null);
    setEditText("");
  }

  // Drag and drop
  function handleDragStart(index: number) {
    setDragIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    setDragOverIndex(index);
  }

  function handleDrop(index: number) {
    if (dragIndex !== null && dragIndex !== index) {
      moveSection(dragIndex, index);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  }

  function handleDragEnd() {
    setDragIndex(null);
    setDragOverIndex(null);
  }

  // Switch modes
  function switchToEdit() {
    setFullText(joinSections(sections));
    setMode("edit");
  }

  function switchToPreview() {
    setSections(splitSections(fullText));
    setMode("preview");
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={switchToPreview}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
              mode === "preview"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent"
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            Slides
          </button>
          <button
            type="button"
            onClick={switchToEdit}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
              mode === "edit"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent"
            }`}
          >
            <Pencil className="h-3.5 w-3.5" />
            Texte brut
          </button>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <span className="text-xs text-orange-500">Modifications non sauvegardées</span>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !hasChanges}
          >
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {saving ? "Sauvegarde…" : "Sauvegarder"}
          </Button>
        </div>
      </div>

      {mode === "edit" ? (
        /* ===== RAW TEXT MODE ===== */
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Séparez chaque couplet/refrain par une ligne vide. Chaque bloc = 1 slide dans ProPresenter.
          </p>
          <textarea
            value={fullText}
            onChange={(e) => setFullText(e.target.value)}
            rows={20}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring resize-y"
            placeholder={"Couplet 1 ligne 1\nCouplet 1 ligne 2\n\nRefrain ligne 1\nRefrain ligne 2\n\nCouplet 2 ligne 1\nCouplet 2 ligne 2"}
          />
        </div>
      ) : (
        /* ===== SLIDE PREVIEW MODE ===== */
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {sections.length} slide{sections.length !== 1 ? "s" : ""} — Glissez pour réorganiser, cliquez pour modifier
          </p>

          {sections.map((section, index) => (
            <div
              key={index}
              draggable={editingIndex !== index}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={() => handleDrop(index)}
              onDragEnd={handleDragEnd}
              className={`group relative rounded-lg border transition-all ${
                dragOverIndex === index
                  ? "border-primary border-dashed bg-primary/5"
                  : dragIndex === index
                  ? "opacity-50 border-border"
                  : "border-border hover:border-primary/50"
              }`}
            >
              {/* Slide header */}
              <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/50 bg-muted/30 rounded-t-lg">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab shrink-0" />
                <span className="text-xs font-medium text-muted-foreground flex-1">
                  Slide {index + 1}
                </span>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => moveSection(index, index - 1)}
                      className="p-1 rounded hover:bg-accent text-muted-foreground"
                      title="Monter"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {index < sections.length - 1 && (
                    <button
                      type="button"
                      onClick={() => moveSection(index, index + 1)}
                      className="p-1 rounded hover:bg-accent text-muted-foreground"
                      title="Descendre"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => duplicateSection(index)}
                    className="p-1 rounded hover:bg-accent text-muted-foreground"
                    title="Dupliquer"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(index)}
                    className="p-1 rounded hover:bg-accent text-muted-foreground"
                    title="Modifier"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  {sections.length > 1 && (
                    <button
                      type="button"
                      onClick={() => deleteSection(index)}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      title="Supprimer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Slide content */}
              {editingIndex === index ? (
                <div className="p-3 space-y-2">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={4}
                    autoFocus
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring resize-y"
                    onKeyDown={(e) => {
                      if (e.key === "Escape") cancelEdit();
                      if (e.key === "Enter" && e.ctrlKey) confirmEdit();
                    }}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={confirmEdit}>
                      Confirmer (Ctrl+Entrée)
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={cancelEdit}
                    >
                      Annuler (Échap)
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="p-3 cursor-pointer"
                  onClick={() => startEdit(index)}
                >
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
                    {section || <span className="text-muted-foreground italic">Slide vide — cliquez pour modifier</span>}
                  </pre>
                </div>
              )}
            </div>
          ))}

          {/* Add slide button */}
          <button
            type="button"
            onClick={addSection}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <Plus className="h-4 w-4" />
            Ajouter un slide
          </button>
        </div>
      )}
    </div>
  );
}
