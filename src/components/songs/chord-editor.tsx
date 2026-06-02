"use client";

import { useState } from "react";
import { DISPLAY_KEYS, extractChords } from "@/lib/chords";
import { toast } from "sonner";
import { Save, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChordEditorProps {
  arrangementId: string;
  initialKey: string;
  initialChords: string;
  onSaved: (key: string, chords: string) => void;
}

const HELP_TEXT = `Format ChordPro — placez les accords entre crochets avant le mot chanté :

[Verse 1]
[G]Amazing [D/F#]grace how [Em]sweet the [C]sound
[G]That saved a [D]wretch like [G]me

[Chorus]
[C]How [G]great is our [Em]God
[C]Sing with [D]me how [G]great is our God

Accords supportés : Am, G, F#m, Bb, Em7, Gsus4, D/F#…`;

export function ChordEditor({ arrangementId, initialKey, initialChords, onSaved }: ChordEditorProps) {
  const [key, setKey] = useState(initialKey);
  const [chords, setChords] = useState(initialChords || "");
  const [saving, setSaving] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const foundChords = extractChords(chords);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/songs/arrangements/${arrangementId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, chords }),
      });
      if (!res.ok) { toast.error("Erreur lors de la sauvegarde"); return; }
      toast.success("Grille d'accords sauvegardée");
      onSaved(key, chords);
    } catch {
      toast.error("Erreur de connexion");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Key selector + help */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Tonalité originale</label>
          <select
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {DISPLAY_KEYS.map((k) => (
              <option key={k.value} value={k.value}>{k.label}</option>
            ))}
          </select>
        </div>

        {foundChords.length > 0 && (
          <div className="flex flex-wrap gap-1 items-center">
            <span className="text-xs text-muted-foreground">Accords détectés :</span>
            {foundChords.slice(0, 8).map((c) => (
              <span key={c} className="text-xs font-mono bg-primary/10 text-primary rounded px-1.5 py-0.5">{c}</span>
            ))}
            {foundChords.length > 8 && <span className="text-xs text-muted-foreground">+{foundChords.length - 8}</span>}
          </div>
        )}

        <button
          onClick={() => setShowHelp(!showHelp)}
          className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
          title="Aide"
        >
          <HelpCircle className="h-4 w-4" />
        </button>
      </div>

      {showHelp && (
        <div className="rounded-lg bg-muted p-4 text-xs font-mono whitespace-pre-wrap text-muted-foreground border border-border">
          {HELP_TEXT}
        </div>
      )}

      {/* Editor */}
      <textarea
        value={chords}
        onChange={(e) => setChords(e.target.value)}
        rows={20}
        spellCheck={false}
        placeholder={`[Verse 1]\n[G]Amazing [D]grace how [Em]sweet the [C]sound\n[G]That saved a [D]wretch like [G]me\n\n[Chorus]\n...`}
        className="w-full rounded-lg border border-input bg-background p-4 font-mono text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring leading-relaxed"
      />

      <Button onClick={handleSave} disabled={saving} className="w-full">
        <Save className="h-4 w-4 mr-2" />
        {saving ? "Sauvegarde…" : "Sauvegarder la grille d'accords"}
      </Button>
    </div>
  );
}
