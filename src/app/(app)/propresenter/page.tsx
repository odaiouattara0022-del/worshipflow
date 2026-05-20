"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { PPStatusBadge } from "@/components/propresenter/pp-status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

interface ScanResult {
  total: number;
  imported: number;
  updated: number;
  skipped: number;
  message: string;
}

export default function ProPresenterPage() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleScan() {
    setScanning(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/propresenter/scan", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur lors du scan");
        return;
      }

      setResult(data);
    } catch {
      setError("Impossible de contacter le serveur");
    } finally {
      setScanning(false);
    }
  }

  return (
    <div>
      <Header
        title="ProPresenter"
        subtitle="Connexion et synchronisation"
        action={<PPStatusBadge />}
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Scanner card */}
        <Card>
          <CardHeader>
            <CardTitle>Scanner la bibliothèque</CardTitle>
            <CardDescription>
              Importer les chants depuis les fichiers .pro de ProPresenter
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleScan} disabled={scanning}>
              {scanning ? "Scan en cours..." : "Lancer le scan"}
            </Button>

            {error && (
              <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            {result && (
              <div className="mt-4 space-y-2">
                <div className="rounded-md bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-400">
                  {result.message}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-md bg-muted p-2">
                    <span className="text-muted-foreground">Total fichiers</span>
                    <p className="text-lg font-semibold">{result.total}</p>
                  </div>
                  <div className="rounded-md bg-muted p-2">
                    <span className="text-muted-foreground">Importés</span>
                    <p className="text-lg font-semibold">{result.imported}</p>
                  </div>
                  <div className="rounded-md bg-muted p-2">
                    <span className="text-muted-foreground">Mis à jour</span>
                    <p className="text-lg font-semibold">{result.updated}</p>
                  </div>
                  <div className="rounded-md bg-muted p-2">
                    <span className="text-muted-foreground">Ignorés</span>
                    <p className="text-lg font-semibold">{result.skipped}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Configuration card */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>
              Paramètres de connexion ProPresenter
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Chemin des données</dt>
                <dd className="font-mono text-xs mt-0.5">
                  {process.env.NEXT_PUBLIC_PP_DATA_PATH || "Défini côté serveur (pp_data_path)"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Port API</dt>
                <dd className="font-mono text-xs mt-0.5">
                  {process.env.NEXT_PUBLIC_PP_API_PORT || "1025 (défaut)"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Hôte API</dt>
                <dd className="font-mono text-xs mt-0.5">
                  {process.env.NEXT_PUBLIC_PP_API_HOST || "127.0.0.1 (défaut)"}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
