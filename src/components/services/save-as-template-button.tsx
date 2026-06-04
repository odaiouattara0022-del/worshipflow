"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

interface TemplateItem { type: string; title: string; duration: number }

interface SaveAsTemplateButtonProps {
  defaultName: string;
  items: TemplateItem[];
  totalDuration: number;
}

// Turns the current service's running order into a reusable template
// (structure only — type/title/duration, no specific songs).
export function SaveAsTemplateButton({ defaultName, items, totalDuration }: SaveAsTemplateButtonProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    const res = await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), items, defaultDuration: totalDuration || 90 }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success(`Modèle « ${name.trim()} » créé`);
      setOpen(false);
    } else {
      toast.error("Impossible de créer le modèle");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        Enregistrer comme modèle
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enregistrer comme modèle</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Crée un modèle réutilisable à partir du déroulement actuel ({items.length} éléments,
            {" "}{totalDuration} min). Les chants précis ne sont pas enregistrés — seule la structure l&apos;est.
          </p>
          <div className="space-y-2">
            <Label>Nom du modèle</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Culte type dominical" />
          </div>
          <Button onClick={handleSave} disabled={saving || !name.trim()} className="w-full">
            {saving ? "Création…" : "Créer le modèle"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
