"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Monitor, RefreshCw } from "lucide-react";
import { DeviceSelector } from "@/components/propresenter/device-selector";

interface ThemeSlide {
  uuid: string;
  name: string;
  index: number;
}

interface PPTheme {
  name: string;
  index: number;
  slides: ThemeSlide[];
}

interface PPLibrary {
  name: string;
  path: string;
  songCount: number;
}

interface PPPlaylist {
  uuid: string;
  name: string;
}

interface SendSongToPPProps {
  songId: string;
  songTitle: string;
}

export function SendSongToPP({ songId, songTitle }: SendSongToPPProps) {
  const [sending, setSending] = useState(false);
  const [themes, setThemes] = useState<PPTheme[]>([]);
  const [selectedTheme, setSelectedTheme] = useState("");
  const [selectedSlideUuid, setSelectedSlideUuid] = useState("");
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [loadingThemes, setLoadingThemes] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [libraries, setLibraries] = useState<PPLibrary[]>([]);
  const [selectedLibrary, setSelectedLibrary] = useState("");
  const [loadingLibraries, setLoadingLibraries] = useState(true);
  const [playlists, setPlaylists] = useState<PPPlaylist[]>([]);
  const [selectedPlaylistUuid, setSelectedPlaylistUuid] = useState("");
  const [loadingPlaylists, setLoadingPlaylists] = useState(true);

  const fetchPlaylists = useCallback(async () => {
    setLoadingPlaylists(true);
    try {
      const params = selectedDeviceId ? `?deviceId=${selectedDeviceId}` : "";
      const res = await fetch(`/api/propresenter/playlists${params}`);
      const data = await res.json();
      setPlaylists(data.playlists ?? []);
    } catch {
      setPlaylists([]);
    } finally {
      setLoadingPlaylists(false);
    }
  }, [selectedDeviceId]);

  useEffect(() => { fetchPlaylists(); }, [fetchPlaylists]);

  const fetchLibraries = useCallback(async () => {
    setLoadingLibraries(true);
    try {
      const params = selectedDeviceId ? `?deviceId=${selectedDeviceId}` : "";
      const res = await fetch(`/api/propresenter/libraries${params}`);
      const data = await res.json();
      const libs: PPLibrary[] = data.libraries ?? [];
      setLibraries(libs);

      // Auto-select: prefer "CHANTS", then "Default", then first
      setSelectedLibrary((prev) => {
        if (prev && libs.some((l) => l.path === prev)) return prev;
        const chants = libs.find((l) => l.name.toUpperCase() === "CHANTS");
        if (chants) return chants.path;
        const def = libs.find((l) => l.name === "Default");
        if (def) return def.path;
        return libs[0]?.path ?? "";
      });
    } catch {
      setLibraries([]);
    } finally {
      setLoadingLibraries(false);
    }
  }, [selectedDeviceId]);

  useEffect(() => {
    fetchLibraries();
  }, [fetchLibraries]);

  const fetchThemes = useCallback(
    async (isInitial = false) => {
      if (!isInitial) setRefreshing(true);
      try {
        const params = selectedDeviceId
          ? `?deviceId=${selectedDeviceId}`
          : "";
        const res = await fetch(`/api/propresenter/themes${params}`);
        const data = await res.json();
        const newThemes: PPTheme[] = data.themes ?? [];
        setThemes(newThemes);

        setSelectedTheme((prev) => {
          if (prev && newThemes.some((t) => t.name === prev)) return prev;
          const chant = newThemes.find((t) => t.name.toLowerCase() === "chant");
          if (chant) return chant.name;
          return newThemes[0]?.name ?? "";
        });
      } catch {
        setThemes([]);
      } finally {
        setLoadingThemes(false);
        setRefreshing(false);
      }
    },
    [selectedDeviceId]
  );

  useEffect(() => {
    fetchThemes(true);
  }, [fetchThemes]);

  // Live sync every 5s
  useEffect(() => {
    const interval = setInterval(() => fetchThemes(false), 5000);
    return () => clearInterval(interval);
  }, [fetchThemes]);

  // When theme changes, auto-select first slide
  const currentTheme = themes.find((t) => t.name === selectedTheme);
  const slides = currentTheme?.slides ?? [];

  useEffect(() => {
    if (slides.length > 0) {
      setSelectedSlideUuid((prev) => {
        if (prev && slides.some((s) => s.uuid === prev)) return prev;
        return slides[0]?.uuid ?? "";
      });
    } else {
      setSelectedSlideUuid("");
    }
  }, [selectedTheme, slides]);

  async function handleSend() {
    setSending(true);
    try {
      const res = await fetch("/api/propresenter/send-song", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          songId,
          theme: selectedTheme || undefined,
          slideUuid: selectedSlideUuid || undefined,
          deviceId: selectedDeviceId || undefined,
          libraryPath: selectedLibrary || undefined,
          playlistId: selectedPlaylistUuid || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Échec de l'envoi");
        return;
      }

      if (data.success) {
        toast.success(data.message);
      }
    } catch {
      toast.error("Impossible de contacter ProPresenter");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 p-4 rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Monitor className="h-4 w-4 text-primary" />
        Envoyer à ProPresenter
      </div>

      {/* Sélection de l'appareil */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground shrink-0 w-16">
          Appareil
        </label>
        <DeviceSelector
          selectedDeviceId={selectedDeviceId}
          onDeviceChange={setSelectedDeviceId}
          compact
        />
      </div>

      {/* Sélection de la bibliothèque */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground shrink-0 w-16">
          Biblioth.
        </label>
        {loadingLibraries ? (
          <span className="text-xs text-muted-foreground">Chargement…</span>
        ) : libraries.length === 0 ? (
          <span className="text-xs text-orange-500">Aucune bibliothèque trouvée</span>
        ) : (
          <select
            value={selectedLibrary}
            onChange={(e) => setSelectedLibrary(e.target.value)}
            disabled={sending}
            className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {libraries.map((lib) => (
              <option key={lib.path} value={lib.path}>
                {lib.name} ({lib.songCount} chants)
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Sélection de la liste de lecture */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground shrink-0 w-16">
          Playlist
        </label>
        <select
          value={selectedPlaylistUuid}
          onChange={(e) => setSelectedPlaylistUuid(e.target.value)}
          disabled={sending || loadingPlaylists}
          className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Aucune liste de lecture</option>
          {playlists.map((p) => (
            <option key={p.uuid} value={p.uuid}>{p.name}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={fetchPlaylists}
          disabled={loadingPlaylists || sending}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-input bg-background text-muted-foreground hover:bg-accent"
          title="Rafraîchir les listes de lecture"
        >
          <RefreshCw className={`h-4 w-4 ${loadingPlaylists ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loadingThemes ? (
        <span className="text-sm text-muted-foreground">
          Chargement des thèmes…
        </span>
      ) : (
        <>
          {/* Sélection du groupe de thème */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground shrink-0 w-16">
              Thème
            </label>
            <select
              value={selectedTheme}
              onChange={(e) => setSelectedTheme(e.target.value)}
              disabled={sending}
              className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Sans thème</option>
              {themes.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name} ({t.slides.length} éléments)
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => fetchThemes(false)}
              disabled={refreshing || sending}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-input bg-background text-muted-foreground hover:bg-accent"
              title="Rafraîchir les thèmes"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
            </button>
          </div>

          {/* Sélection de la diapositive du thème */}
          {selectedTheme && slides.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground shrink-0 w-16">
                Modèle
              </label>
              <select
                value={selectedSlideUuid}
                onChange={(e) => setSelectedSlideUuid(e.target.value)}
                disabled={sending}
                className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {slides.map((s) => (
                  <option key={s.uuid} value={s.uuid}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </>
      )}

      <Button onClick={handleSend} disabled={sending || loadingThemes}>
        {sending ? "Envoi en cours…" : `Envoyer « ${songTitle} »`}
      </Button>
    </div>
  );
}
