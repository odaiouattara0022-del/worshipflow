"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { PPStatusBadge } from "@/components/propresenter/pp-status-badge";
import { DeviceManager } from "@/components/propresenter/device-selector";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { RefreshCw, Library, Wifi, WifiOff, Download } from "lucide-react";
import { toast } from "sonner";

interface SyncResult {
  generated: number;
  skipped: number;
  path: string;
  message: string;
}

interface ScanResult {
  total: number;
  imported: number;
  updated: number;
  skipped: number;
  message: string;
}

interface DeviceStatus {
  online: boolean;
  lastSeen: string | null;
  version?: string;
  name?: string;
}

export default function ProPresenterPage() {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const [statusRes, devicesRes] = await Promise.all([
        fetch("/api/propresenter/status"),
        fetch("/api/propresenter/devices"),
      ]);
      const status = await statusRes.json();
      const devicesData = await devicesRes.json();
      const defaultDevice = (devicesData.devices ?? []).find((d: any) => d.isDefault) ?? devicesData.devices?.[0];
      setDeviceStatus({
        online: status.connected ?? false,
        lastSeen: defaultDevice?.lastSeen ?? null,
        version: status.version ?? defaultDevice?.version ?? null,
        name: defaultDevice?.name ?? null,
      });
    } catch {
      setDeviceStatus({ online: false, lastSeen: null });
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15_000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/propresenter/sync-library", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Erreur de synchronisation"); return; }
      setSyncResult(data);
      toast.success(data.message);
    } catch {
      toast.error("Impossible de contacter l'agent");
    } finally {
      setSyncing(false);
    }
  }

  async function handleScan() {
    setScanning(true);
    setScanResult(null);
    try {
      const res = await fetch("/api/propresenter/scan", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Erreur lors du scan"); return; }
      setScanResult(data);
      toast.success(data.message);
    } catch {
      toast.error("Impossible de contacter le serveur");
    } finally {
      setScanning(false);
    }
  }

  return (
    <div>
      <Header title="ProPresenter" subtitle="Connexion et synchronisation" action={<PPStatusBadge />} />

      <div className="grid gap-6 md:grid-cols-2">

        {/* Statut appareil */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {statusLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : deviceStatus?.online ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              Statut de connexion
            </CardTitle>
            <CardDescription>État de l&apos;agent et de ProPresenter</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {deviceStatus && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Appareil</span>
                  <span className="font-medium">{deviceStatus.name ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ProPresenter</span>
                  <span className={deviceStatus.online ? "text-green-600 font-medium" : "text-red-500"}>
                    {deviceStatus.online ? `Connecté${deviceStatus.version ? ` (${deviceStatus.version})` : ""}` : "Non connecté"}
                  </span>
                </div>
                {deviceStatus.lastSeen && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dernière activité</span>
                    <span className="text-xs text-muted-foreground">{new Date(deviceStatus.lastSeen).toLocaleTimeString("fr-FR")}</span>
                  </div>
                )}
              </>
            )}
            <Button variant="outline" size="sm" onClick={fetchStatus} className="w-full mt-2">
              <RefreshCw className="h-3.5 w-3.5 mr-2" />
              Rafraîchir
            </Button>
          </CardContent>
        </Card>

        {/* Synchronisation bibliothèque */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Library className="h-4 w-4" />
              Synchroniser la bibliothèque
            </CardTitle>
            <CardDescription>
              Envoie tous les chants du site vers ProPresenter — ils apparaissent ensuite dans la barre de recherche PP
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Crée un dossier <span className="font-mono bg-muted px-1 rounded">Libraries/ProSendWorship/</span> dans ProPresenter avec un fichier <code>.pro</code> par chant. Chaque modification de chant sur le site met à jour automatiquement le fichier.
            </p>
            <Button onClick={handleSync} disabled={syncing} className="w-full">
              {syncing ? (
                <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Synchronisation en cours…</>
              ) : (
                <><Library className="h-4 w-4 mr-2" />Synchroniser tous les chants</>
              )}
            </Button>
            {syncResult && (
              <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-3 text-sm text-green-800 dark:text-green-400 space-y-1">
                <p className="font-medium">{syncResult.message}</p>
                <p className="text-xs opacity-80 font-mono">{syncResult.path}</p>
                {syncResult.skipped > 0 && (
                  <p className="text-xs opacity-70">{syncResult.skipped} chants sans paroles ignorés</p>
                )}
                <p className="text-xs mt-2 border-t border-green-200 dark:border-green-700 pt-2 opacity-80">
                  Si la bibliothèque n&apos;apparaît pas dans PP → relancez ProPresenter ou ajoutez-la via Fichier → Bibliothèques → +
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Scanner la bibliothèque PP → ProSendWorship */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Importer depuis ProPresenter
            </CardTitle>
            <CardDescription>
              Importer les chants depuis les fichiers .pro existants dans ProPresenter
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" onClick={handleScan} disabled={scanning} className="w-full">
              {scanning ? (
                <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Scan en cours…</>
              ) : (
                "Scanner la bibliothèque PP"
              )}
            </Button>
            {scanResult && (
              <div className="space-y-2">
                <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-3 text-sm text-green-800 dark:text-green-400">
                  {scanResult.message}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {[
                    { label: "Total", value: scanResult.total },
                    { label: "Importés", value: scanResult.imported },
                    { label: "Mis à jour", value: scanResult.updated },
                    { label: "Ignorés", value: scanResult.skipped },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-md bg-muted p-2">
                      <span className="text-muted-foreground text-xs">{label}</span>
                      <p className="text-lg font-semibold">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gestion des appareils */}
        <Card>
          <CardHeader>
            <CardTitle>Appareils ProPresenter</CardTitle>
            <CardDescription>Gérer les connexions aux ordinateurs ProPresenter</CardDescription>
          </CardHeader>
          <CardContent>
            <DeviceManager />
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
