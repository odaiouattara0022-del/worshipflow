"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { DeviceManager } from "@/components/propresenter/device-selector";

interface SettingsMap {
  [key: string]: string;
}

const DEFAULT_SETTINGS: SettingsMap = {
  churchName: "Mon Église",
  ccliLicense: "",
  ppApiHost: "127.0.0.1",
  ppApiPort: "1025",
  ppLibraryPath: "",
  reminderDays: "7,3,1",
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsMap>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [triggeringReminders, setTriggeringReminders] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          setSettings((prev) => ({ ...prev, ...data }));
        }
      } catch {
        // Use defaults
      }
    }
    load();
  }, []);

  function handleChange(key: string, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        toast.success("Paramètres enregistrés");
      } else {
        toast.error("Erreur lors de la sauvegarde");
      }
    } catch {
      toast.error("Erreur de connexion");
    } finally {
      setSaving(false);
    }
  }

  async function handleTriggerReminders() {
    setTriggeringReminders(true);
    try {
      const res = await fetch("/api/reminders", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        toast.success(`${data.remindersSent} rappel${data.remindersSent !== 1 ? "s" : ""} envoyé${data.remindersSent !== 1 ? "s" : ""}`);
      } else {
        toast.error("Erreur lors de l'envoi des rappels");
      }
    } catch {
      toast.error("Erreur de connexion");
    } finally {
      setTriggeringReminders(false);
    }
  }

  return (
    <div>
      <Header
        title="Paramètres"
        subtitle="Configuration de WorshipFlow"
        action={
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        }
      />

      <div className="mt-6 space-y-6">
        {/* General settings */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Général</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="churchName">Nom de l&apos;&eacute;glise</Label>
              <Input
                id="churchName"
                value={settings.churchName}
                onChange={(e) => handleChange("churchName", e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="ccliLicense">Num&eacute;ro de licence CCLI</Label>
              <Input
                id="ccliLicense"
                value={settings.ccliLicense}
                onChange={(e) => handleChange("ccliLicense", e.target.value)}
                placeholder="ex: 1234567"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Utilis&eacute; pour le reporting CCLI et l&apos;affichage du copyright dans ProPresenter.
              </p>
            </div>
          </div>
        </Card>

        {/* ProPresenter Devices */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-2">Appareils ProPresenter</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Connectez plusieurs ordinateurs ProPresenter et choisissez sur lequel envoyer vos chants et playlists.
          </p>
          <DeviceManager />
        </Card>

        {/* ProPresenter settings (fallback) */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">ProPresenter — Configuration par défaut</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Utilisé uniquement si aucun appareil n&apos;est configuré ci-dessus.
          </p>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ppApiHost">Hôte API</Label>
                <Input
                  id="ppApiHost"
                  value={settings.ppApiHost}
                  onChange={(e) => handleChange("ppApiHost", e.target.value)}
                  placeholder="127.0.0.1"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="ppApiPort">Port API</Label>
                <Input
                  id="ppApiPort"
                  value={settings.ppApiPort}
                  onChange={(e) => handleChange("ppApiPort", e.target.value)}
                  placeholder="1025"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="ppLibraryPath">Chemin bibliothèque ProPresenter</Label>
              <Input
                id="ppLibraryPath"
                value={settings.ppLibraryPath}
                onChange={(e) => handleChange("ppLibraryPath", e.target.value)}
                placeholder="C:\Users\...\ProPresenter\Libraries"
                className="mt-1"
              />
            </div>
          </div>
        </Card>

        {/* CCLI Reporting */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Rapport CCLI</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Exportez un rapport d&apos;utilisation des chants pour votre d&eacute;claration CCLI annuelle.
          </p>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => {
                const year = new Date().getFullYear();
                window.open(`/api/ccli-report?from=${year}-01-01&to=${year}-12-31&format=csv`, "_blank");
              }}
            >
              Exporter l&apos;ann&eacute;e en cours (CSV)
            </Button>
            <Button
              variant="ghost"
              onClick={async () => {
                const year = new Date().getFullYear();
                try {
                  const res = await fetch(`/api/ccli-report?from=${year}-01-01&to=${year}-12-31`);
                  if (res.ok) {
                    const data = await res.json();
                    toast.info(`${data.totalSongs} chant(s) utilis&eacute;(s) ${data.totalUses} fois cette ann&eacute;e`);
                  }
                } catch {
                  toast.error("Erreur lors du chargement du rapport");
                }
              }}
            >
              Voir les statistiques
            </Button>
          </div>
        </Card>

        <Separator />

        {/* Reminders */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Rappels automatiques</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reminderDays">Jours de rappel avant le service</Label>
              <Input
                id="reminderDays"
                value={settings.reminderDays}
                onChange={(e) => handleChange("reminderDays", e.target.value)}
                placeholder="7,3,1"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Séparés par des virgules (ex: 7,3,1 pour J-7, J-3, J-1)
              </p>
            </div>

            <Button
              variant="outline"
              onClick={handleTriggerReminders}
              disabled={triggeringReminders}
            >
              {triggeringReminders ? "Envoi en cours…" : "Envoyer les rappels maintenant"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
