"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ImportExportButtons() {
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [textImport, setTextImport] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleJsonImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const json = JSON.parse(text);

      const res = await fetch("/api/songs/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Array.isArray(json) ? json : json.songs || json),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`${data.created} chant(s) importé(s), ${data.skipped} ignoré(s)`);
        setImportOpen(false);
        window.location.reload();
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error("Fichier JSON invalide");
    } finally {
      setImporting(false);
    }
  }

  async function handleTextImport() {
    if (!textImport.trim()) return;

    setImporting(true);
    try {
      const res = await fetch("/api/songs/import", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: textImport,
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`${data.created} chant(s) importé(s), ${data.skipped} ignoré(s)`);
        setImportOpen(false);
        setTextImport("");
        window.location.reload();
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error("Erreur lors de l'import");
    } finally {
      setImporting(false);
    }
  }

  function handleExport(format: "json" | "text") {
    window.open(`/api/songs/export?format=${format}`, "_blank");
  }

  return (
    <div className="flex gap-2">
      {/* Import */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogTrigger render={<Button variant="outline" size="sm">Importer</Button>} />
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Importer des chants</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* JSON file import */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Depuis un fichier JSON</p>
              <p className="text-xs text-muted-foreground">
                Format : tableau de chants avec title, author, lyrics, defaultKey, tempo, tags
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".json"
                onChange={handleJsonImport}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                disabled={importing}
              >
                Choisir un fichier .json
              </Button>
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-sm font-medium mb-2">Depuis du texte</p>
              <p className="text-xs text-muted-foreground mb-2">
                Format : Titre (ligne 1), Auteur (ligne 2), Paroles (le reste). Séparez chaque chant par ---
              </p>
              <textarea
                className="w-full h-40 rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono"
                placeholder={`Mon chant\nAuteur\nParoles ligne 1\nParoles ligne 2\n\n---\n\nAutre chant\nAuteur\nParoles...`}
                value={textImport}
                onChange={(e) => setTextImport(e.target.value)}
              />
              <Button
                size="sm"
                onClick={handleTextImport}
                disabled={importing || !textImport.trim()}
                className="mt-2"
              >
                {importing ? "Import..." : "Importer le texte"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Export */}
      <Button variant="outline" size="sm" onClick={() => handleExport("json")}>
        Exporter JSON
      </Button>
      <Button variant="outline" size="sm" onClick={() => handleExport("text")}>
        Exporter TXT
      </Button>
    </div>
  );
}
