"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Plus, Trash2, Star, Wifi, WifiOff, Search, Copy, Check, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface PPDeviceInfo {
  id: string;
  name: string;
  host: string;
  port: number;
  type: string;
  config: string | null;
  isDefault: boolean;
  libraryPath: string;
  online: boolean;
  version: string | null;
  status?: string;
  hostname?: string | null;
}

interface DeviceSelectorProps {
  selectedDeviceId: string;
  onDeviceChange: (deviceId: string) => void;
  compact?: boolean;
}

export function DeviceSelector({
  selectedDeviceId,
  onDeviceChange,
  compact = false,
}: DeviceSelectorProps) {
  const [devices, setDevices] = useState<PPDeviceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDevices = useCallback(async (isInitial = false) => {
    if (!isInitial) setRefreshing(true);
    try {
      const res = await fetch("/api/propresenter/devices");
      const data = await res.json();
      // Only approved devices are selectable for sending/controlling.
      const newDevices: PPDeviceInfo[] = (data.devices ?? []).filter(
        (d: PPDeviceInfo) => (d.status ?? "active") === "active"
      );
      setDevices(newDevices);

      // Auto-select default or first online device
      if (!selectedDeviceId || !newDevices.find((d) => d.id === selectedDeviceId)) {
        const def = newDevices.find((d) => d.isDefault) ?? newDevices.find((d) => d.online) ?? newDevices[0];
        if (def) onDeviceChange(def.id);
      }
    } catch {
      // API not available
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDeviceId, onDeviceChange]);

  useEffect(() => {
    fetchDevices(true);
  }, [fetchDevices]);

  // Poll status every 10s
  useEffect(() => {
    const interval = setInterval(() => fetchDevices(false), 10000);
    return () => clearInterval(interval);
  }, [fetchDevices]);

  if (loading) {
    return <span className="text-sm text-muted-foreground">Chargement…</span>;
  }

  if (devices.length === 0) {
    return (
      <span className="text-sm text-muted-foreground">
        Aucun appareil configuré
      </span>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <select
          value={selectedDeviceId}
          onChange={(e) => onDeviceChange(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {devices.map((d) => (
            <option key={d.id} value={d.id}>
              {d.online ? "🟢" : "🔴"} {d.name} ({d.host}:{d.port})
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => fetchDevices(false)}
          disabled={refreshing}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background text-muted-foreground hover:bg-accent"
          title="Rafraîchir le statut"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {devices.map((d) => (
        <button
          key={d.id}
          type="button"
          onClick={() => onDeviceChange(d.id)}
          className={`w-full flex items-center gap-3 rounded-md border p-3 text-left text-sm transition-colors ${
            selectedDeviceId === d.id
              ? "border-primary bg-primary/5"
              : "border-border hover:bg-accent"
          }`}
        >
          {d.online ? (
            <Wifi className="h-4 w-4 text-green-500 shrink-0" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-500 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{d.name}</span>
              {d.isDefault && (
                <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 shrink-0" />
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {d.host}:{d.port}
              {d.online && d.version ? ` — ${d.version}` : ""}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}

function CopyIdButton({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(id).then(() => {
      setCopied(true);
      toast.success("ID copié !");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={`ID agent : ${id}`}
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
      <span className="font-mono">{id.slice(0, 8)}…</span>
    </button>
  );
}

/**
 * Full device management panel (for settings page).
 */
export function DeviceManager() {
  const [devices, setDevices] = useState<PPDeviceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [newName, setNewName] = useState("");
  const [newHost, setNewHost] = useState("");
  const [newPort, setNewPort] = useState("12345");
  const [newLibPath, setNewLibPath] = useState("");
  const [newType, setNewType] = useState("propresenter");
  const [newFreeShowPort, setNewFreeShowPort] = useState("5506");
  const [newFreeShowShowsPath, setNewFreeShowShowsPath] = useState("");

  const fetchDevices = useCallback(async () => {
    try {
      const res = await fetch("/api/propresenter/devices");
      const data = await res.json();
      setDevices(data.devices ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  // Poll
  useEffect(() => {
    const interval = setInterval(fetchDevices, 10000);
    return () => clearInterval(interval);
  }, [fetchDevices]);

  async function handleAdd() {
    if (!newName.trim() || !newHost.trim()) {
      toast.error("Nom et adresse IP requis");
      return;
    }
    try {
      const config = newType === "freeshow"
        ? JSON.stringify({ freeShowPort: newFreeShowPort.trim() || "5506", freeShowShowsPath: newFreeShowShowsPath.trim() })
        : null;
      const res = await fetch("/api/propresenter/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          host: newHost.trim(),
          port: parseInt(newPort) || 12345,
          libraryPath: newLibPath.trim(),
          type: newType,
          config,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Erreur");
        return;
      }
      toast.success(`Appareil « ${newName} » ajouté`);
      setNewName("");
      setNewHost("");
      setNewPort("12345");
      setNewLibPath("");
      setNewType("propresenter");
      setNewFreeShowPort("5506");
      setNewFreeShowShowsPath("");
      setShowAdd(false);
      fetchDevices();
    } catch {
      toast.error("Erreur lors de l'ajout");
    }
  }

  async function handleDelete(id: string, name: string) {
    try {
      await fetch(`/api/propresenter/devices/${id}`, { method: "DELETE" });
      toast.success(`Appareil « ${name} » supprimé`);
      fetchDevices();
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  }

  async function handleSetDefault(id: string) {
    try {
      await fetch(`/api/propresenter/devices/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      toast.success("Appareil par défaut mis à jour");
      fetchDevices();
    } catch {
      toast.error("Erreur");
    }
  }

  async function handleApprove(id: string, name: string) {
    try {
      const res = await fetch(`/api/propresenter/devices/${id}/approve`, { method: "POST" });
      if (!res.ok) { toast.error("Erreur lors de l'approbation"); return; }
      toast.success(`« ${name} » approuvé`);
      fetchDevices();
    } catch {
      toast.error("Erreur lors de l'approbation");
    }
  }

  async function handleReject(id: string, name: string) {
    try {
      const res = await fetch(`/api/propresenter/devices/${id}/reject`, { method: "POST" });
      if (!res.ok) { toast.error("Erreur lors du rejet"); return; }
      toast.success(`« ${name} » rejeté`);
      fetchDevices();
    } catch {
      toast.error("Erreur lors du rejet");
    }
  }

  async function handleScan() {
    setScanning(true);
    try {
      const res = await fetch("/api/propresenter/scan");
      const data = await res.json();
      const found = data.devices ?? [];
      if (found.length === 0) {
        toast.info("Aucun ProPresenter trouvé sur le réseau");
      } else {
        // Auto-add devices that aren't already configured
        let added = 0;
        for (const d of found) {
          const exists = devices.some(
            (existing) => existing.host === d.host && existing.port === d.port
          );
          if (!exists) {
            await fetch("/api/propresenter/devices", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: d.name,
                host: d.host,
                port: d.port,
              }),
            });
            added++;
          }
        }
        if (added > 0) {
          toast.success(`${added} appareil(s) détecté(s) et ajouté(s)`);
          fetchDevices();
        } else {
          toast.info(
            `${found.length} ProPresenter trouvé(s), tous déjà configurés`
          );
        }
      }
    } catch {
      toast.error("Erreur lors du scan");
    } finally {
      setScanning(false);
    }
  }

  async function handleDetectPath(id: string, name: string) {
    try {
      const res = await fetch(`/api/propresenter/devices/${id}/detect-path`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.found) {
        toast.success(`Chemin détecté pour ${name}`);
        fetchDevices();
      } else {
        toast.error(data.message || `Chemin non trouvé pour ${name}`);
      }
    } catch {
      toast.error("Erreur lors de la détection");
    }
  }

  async function handleSetLibPath(id: string, path: string) {
    try {
      await fetch(`/api/propresenter/devices/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ libraryPath: path }),
      });
      toast.success("Chemin mis à jour");
      fetchDevices();
    } catch {
      toast.error("Erreur");
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Chargement…</p>;
  }

  const pendingDevices = devices.filter((d) => d.status === "pending");
  const activeDevices = devices.filter((d) => (d.status ?? "active") === "active");

  return (
    <div className="space-y-4">
      {pendingDevices.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-amber-600">
            Appareils en attente d&apos;approbation
          </h4>
          {pendingDevices.map((d) => (
            <div
              key={d.id}
              className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 flex items-center gap-3"
            >
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0 animate-pulse" />
              <div className="flex-1 min-w-0">
                <span className="font-medium">{d.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {d.type === "freeshow" ? "FreeShow" : "ProPresenter"} détecté
                  {d.hostname ? ` sur ${d.hostname}` : ""} — veut se connecter
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" onClick={() => handleApprove(d.id, d.name)}>
                  Approuver
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReject(d.id, d.name)}
                >
                  Rejeter
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeDevices.length === 0 && pendingDevices.length === 0 && !showAdd && (
        <p className="text-sm text-muted-foreground">
          Aucun appareil de sortie configuré.
        </p>
      )}

      {activeDevices.map((d) => (
        <div
          key={d.id}
          className="rounded-md border border-border p-3 space-y-2"
        >
          <div className="flex items-center gap-3">
            {d.online ? (
              <Wifi className="h-5 w-5 text-green-500 shrink-0" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-500 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium">{d.name}</span>
                {d.isDefault && (
                  <span className="text-xs bg-yellow-500/10 text-yellow-600 px-1.5 py-0.5 rounded">
                    Par défaut
                  </span>
                )}
                <span
                  className={`text-xs px-1.5 py-0.5 rounded ${
                    d.online
                      ? "bg-green-500/10 text-green-600"
                      : "bg-red-500/10 text-red-600"
                  }`}
                >
                  {d.online ? "En ligne" : "Hors ligne"}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {d.host}:{d.port}
                {d.version ? ` — ${d.version}` : ""}
              </span>
              <CopyIdButton id={d.id} />
            </div>
            <div className="flex items-center gap-1">
              {!d.isDefault && (
                <button
                  type="button"
                  onClick={() => handleSetDefault(d.id)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-yellow-600"
                  title="Définir par défaut"
                >
                  <Star className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => handleDelete(d.id, d.name)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                title="Supprimer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Library path — only relevant when agent is offline (agent auto-detects when online) */}
          {!d.online && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={d.libraryPath || ""}
                onChange={(e) => handleSetLibPath(d.id, e.target.value)}
                placeholder="Chemin bibliothèque PP (ex: \\NOM-PC\...)"
                className="flex-1 h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => handleDetectPath(d.id, d.name)}
                className="inline-flex h-8 items-center gap-1 px-2 rounded-md border border-input bg-background text-xs text-muted-foreground hover:bg-accent shrink-0"
                title="Détecter automatiquement"
              >
                <Search className="h-3.5 w-3.5" />
                Détecter
              </button>
            </div>
          )}
          {!d.online && !d.libraryPath && (
            <p className="text-xs text-amber-500">
              Agent hors ligne — renseignez le chemin pour pouvoir envoyer des chants
            </p>
          )}
        </div>
      ))}

      {/* Install on another computer */}
      <div className="rounded-md border border-dashed border-border p-4 space-y-3 bg-muted/30">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Download className="h-4 w-4" />
          Connecter un ordinateur (ProPresenter ou FreeShow)
        </h4>
        <ol className="text-xs text-muted-foreground space-y-1 list-none">
          <li>① Sur le PC, ouvrez ProPresenter ou FreeShow (avec son API activée)</li>
          <li>② Téléchargez l&apos;agent ci-dessous et double-cliquez dessus</li>
          <li>③ L&apos;appareil apparaît ici dans « En attente d&apos;approbation » — cliquez <strong>Approuver</strong></li>
        </ol>
        <a
          href="/downloads/pp-agent.exe"
          download="pp-agent.exe"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          Télécharger l&apos;agent
        </a>
        <p className="text-xs text-muted-foreground mt-1">
          Aucune installation, aucun code à saisir · Double-cliquez et approuvez ici
        </p>
      </div>

      {showAdd ? (
        <div className="rounded-md border border-dashed border-border p-4 space-y-3">
          <h4 className="text-sm font-medium">Nouvel appareil</h4>
          <div className="space-y-2">
            {/* Type selector */}
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Logiciel de présentation</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="propresenter">ProPresenter</option>
                <option value="freeshow">FreeShow</option>
              </select>
            </div>
            <input
              type="text"
              placeholder="Nom (ex: PC Principal)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Adresse IP (ex: 192.168.1.10)"
                value={newHost}
                onChange={(e) => setNewHost(e.target.value)}
                className="col-span-2 h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                type="number"
                placeholder="Port"
                value={newPort}
                onChange={(e) => setNewPort(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {/* FreeShow-specific fields */}
            {newType === "freeshow" && (
              <div className="space-y-2 rounded-md bg-muted/40 px-3 py-2.5">
                <p className="text-xs font-medium text-muted-foreground">Paramètres FreeShow</p>
                <p className="text-[11px] text-muted-foreground">Dans FreeShow : Paramètres → Connexions → activez l’API (port REST 5506).</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1">
                    <label className="text-xs text-muted-foreground block mb-1">Port API REST</label>
                    <input
                      type="text"
                      placeholder="5506"
                      value={newFreeShowPort}
                      onChange={(e) => setNewFreeShowPort(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-muted-foreground block mb-1">Chemin des Shows</label>
                    <input
                      type="text"
                      placeholder="C:\Users\...\FreeShow\Shows"
                      value={newFreeShowShowsPath}
                      onChange={(e) => setNewFreeShowShowsPath(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
              </div>
            )}
            {newType === "propresenter" && (
              <>
                <input
                  type="text"
                  placeholder="Chemin bibliothèque PP (ex: \\192.168.1.12\ProPresenter\Libraries\Default)"
                  value={newLibPath}
                  onChange={(e) => setNewLibPath(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <p className="text-xs text-muted-foreground">
                  Pour un appareil local : C:\Users\...\Documents\ProPresenter\Libraries\Default
                  <br />
                  Pour un appareil distant : \\adresse-ip\Dossier-partagé\ProPresenter\Libraries\Default
                </p>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd}>
              Ajouter
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowAdd(false);
                setNewType("propresenter");
                setNewFreeShowPort("5506");
                setNewFreeShowShowsPath("");
              }}
            >
              Annuler
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdd(true)}
            className="flex-1"
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter manuellement
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleScan}
            disabled={scanning}
            className="flex-1"
          >
            <Search className={`h-4 w-4 mr-2 ${scanning ? "animate-spin" : ""}`} />
            {scanning ? "Recherche…" : "Détecter automatiquement"}
          </Button>
        </div>
      )}
    </div>
  );
}
