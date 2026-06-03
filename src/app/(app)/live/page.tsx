"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeviceSelector } from "@/components/propresenter/device-selector";
import {
  ChevronLeft,
  ChevronRight,
  XCircle,
  MonitorOff,
  Wifi,
  WifiOff,
  LayoutList,
  Play,
} from "lucide-react";
import { getCapabilities } from "@/lib/output/capabilities";

interface SlideInfo {
  current: { index: number; name?: string };
  presentation?: { name: string; uuid: string };
}

interface PresentationGroup {
  name: string;
  color?: { red: number; green: number; blue: number; alpha: number };
  slides: Array<{ index: number; label: string; enabled: boolean }>;
}

interface ActivePresentation {
  id?: { uuid: string; name: string };
  groups?: PresentationGroup[];
  presentation_path?: string;
}

interface PPPlaylist {
  id: { uuid: string; name: string; index: number };
  children?: PPPlaylistItem[];
}

interface PPPlaylistItem {
  id: { uuid: string; name: string; index: number };
  type?: string;
  is_hidden?: boolean;
}

export default function LiveControlPage() {
  const [deviceId, setDeviceId] = useState("");
  const [deviceType, setDeviceType] = useState("propresenter");
  const [connected, setConnected] = useState(false);
  const [slideInfo, setSlideInfo] = useState<SlideInfo | null>(null);
  const [activePresentation, setActivePresentation] = useState<ActivePresentation | null>(null);
  const [playlists, setPlaylists] = useState<PPPlaylist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string>("");
  const [playlistItems, setPlaylistItems] = useState<PPPlaylistItem[]>([]);
  const [sending, setSending] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Resolve device type for capability gating
  useEffect(() => {
    if (!deviceId) return;
    fetch("/api/propresenter/devices")
      .then((r) => r.json())
      .then((data) => {
        const found = (data.devices ?? []).find((d: { id: string; type?: string }) => d.id === deviceId);
        if (found) setDeviceType(found.type ?? "propresenter");
      })
      .catch(() => {});
  }, [deviceId]);

  const caps = getCapabilities(deviceType);

  // PP control helper
  const ppControl = useCallback(
    async (action: string, params: Record<string, unknown> = {}) => {
      try {
        const res = await fetch("/api/propresenter/control", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, deviceId: deviceId || undefined, ...params }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
      } catch {
        return null;
      }
    },
    [deviceId]
  );

  // Poll PP status
  const pollStatus = useCallback(async () => {
    const [statusRes, activeRes] = await Promise.all([
      ppControl("status"),
      ppControl("activePresentation"),
    ]);

    if (statusRes?.success) {
      setConnected(true);
      setSlideInfo(statusRes.data);
    } else {
      setConnected(false);
      setSlideInfo(null);
    }

    if (activeRes?.success && activeRes.data) {
      setActivePresentation(activeRes.data);
    } else {
      setActivePresentation(null);
    }
  }, [ppControl]);

  // Start/stop polling
  useEffect(() => {
    pollStatus();
    intervalRef.current = setInterval(pollStatus, 2500);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [pollStatus]);

  // Load playlists
  useEffect(() => {
    async function loadPlaylists() {
      const res = await ppControl("playlists");
      if (res?.success && Array.isArray(res.data)) {
        setPlaylists(res.data);
      }
    }
    loadPlaylists();
  }, [ppControl]);

  // Load playlist items when selected
  useEffect(() => {
    async function loadItems() {
      if (!selectedPlaylist) {
        setPlaylistItems([]);
        return;
      }
      const res = await ppControl("playlistItems", { id: selectedPlaylist });
      if (res?.success && res.data?.items) {
        setPlaylistItems(res.data.items);
      }
    }
    loadItems();
  }, [selectedPlaylist, ppControl]);

  // Actions
  async function handleNext() {
    setSending(true);
    await ppControl("next");
    setSending(false);
    setTimeout(pollStatus, 200);
  }

  async function handlePrevious() {
    setSending(true);
    await ppControl("previous");
    setSending(false);
    setTimeout(pollStatus, 200);
  }

  async function handleClear(layer?: string) {
    setSending(true);
    await ppControl("clear", { layer: layer || "presentation" });
    setSending(false);
    setTimeout(pollStatus, 200);
  }

  async function handleTriggerSlide(index: number) {
    if (!activePresentation?.id?.uuid) return;
    setSending(true);
    await ppControl("trigger", { id: activePresentation.id.uuid, index });
    setSending(false);
    setTimeout(pollStatus, 200);
  }

  async function handleTriggerPlaylistItem(playlistId: string, index: number) {
    setSending(true);
    await ppControl("triggerPlaylist", { id: playlistId, index });
    setSending(false);
    setTimeout(pollStatus, 200);
  }

  const currentSlideIndex = slideInfo?.current?.index ?? -1;
  const presentationName =
    activePresentation?.id?.name || slideInfo?.presentation?.name || "";

  // Flatten all slides from groups for the slide grid
  const allSlides: Array<{
    index: number;
    label: string;
    groupName: string;
    groupColor?: string;
  }> = [];
  if (activePresentation?.groups) {
    for (const group of activePresentation.groups) {
      const color = group.color
        ? `rgb(${Math.round((group.color.red ?? 0) * 255)}, ${Math.round((group.color.green ?? 0) * 255)}, ${Math.round((group.color.blue ?? 0) * 255)})`
        : undefined;
      for (const slide of group.slides || []) {
        allSlides.push({
          index: slide.index,
          label: slide.label || `Slide ${slide.index + 1}`,
          groupName: group.name,
          groupColor: color,
        });
      }
    }
  }

  return (
    <div>
      <Header
        title="Contrôle en direct"
        subtitle={
          connected
            ? `Connecté — ${presentationName || "Aucune présentation"}`
            : "Non connecté au logiciel de présentation"
        }
        action={
          <div className="flex items-center gap-3">
            <DeviceSelector
              selectedDeviceId={deviceId}
              onDeviceChange={setDeviceId}
              compact
            />
            {connected ? (
              <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                <Wifi className="h-3 w-3 mr-1" />
                Connect&eacute;
              </Badge>
            ) : (
              <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
                <WifiOff className="h-3 w-3 mr-1" />
                D&eacute;connect&eacute;
              </Badge>
            )}
          </div>
        }
      />

      {!caps.liveControl && (
        <div className="mt-6 rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          Ce logiciel ne supporte pas le contrôle live.
        </div>
      )}

      <div className={`mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6 ${!caps.liveControl ? "pointer-events-none opacity-50" : ""}`}>
        {/* Main control area */}
        <div className="lg:col-span-2 space-y-4">
          {/* Transport controls */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handlePrevious}
                  disabled={!connected || sending}
                  className="h-16 w-24"
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>

                <div className="text-center min-w-[200px]">
                  {connected && presentationName ? (
                    <>
                      <p className="text-sm text-muted-foreground">
                        {presentationName}
                      </p>
                      <p className="text-3xl font-bold tabular-nums">
                        {currentSlideIndex >= 0
                          ? `${currentSlideIndex + 1} / ${allSlides.length || "?"}`
                          : "--"}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {connected ? "Aucune présentation active" : "En attente de connexion..."}
                    </p>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleNext}
                  disabled={!connected || sending}
                  className="h-16 w-24"
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              </div>

              {/* Clear buttons */}
              <div className="flex items-center justify-center gap-2 mt-4">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleClear("presentation")}
                  disabled={!connected || sending}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Clear Slides
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleClear("media")}
                  disabled={!connected || sending}
                >
                  <MonitorOff className="h-4 w-4 mr-1" />
                  Clear M&eacute;dia
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleClear()}
                  disabled={!connected || sending}
                >
                  Clear Tout
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Slide grid (from active presentation) */}
          {allSlides.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Slides &mdash; {presentationName}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {allSlides.map((slide) => (
                    <button
                      key={slide.index}
                      onClick={() => handleTriggerSlide(slide.index)}
                      disabled={!connected || sending}
                      className={`relative flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all text-sm
                        ${
                          slide.index === currentSlideIndex
                            ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                            : "border-border hover:border-primary/50 hover:bg-accent"
                        }`}
                    >
                      {/* Group color indicator */}
                      {slide.groupColor && (
                        <div
                          className="absolute top-1 left-1 h-2 w-2 rounded-full"
                          style={{ backgroundColor: slide.groupColor }}
                        />
                      )}
                      <span className="font-bold tabular-nums">
                        {slide.index + 1}
                      </span>
                      <span className="text-xs text-muted-foreground truncate w-full text-center">
                        {slide.groupName}
                      </span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar — Playlists */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <LayoutList className="h-4 w-4" />
                Playlists
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {playlists.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {connected ? "Aucune playlist" : "Non connecté"}
                </p>
              ) : (
                playlists.map((pl) => (
                  <button
                    key={pl.id.uuid}
                    onClick={() =>
                      setSelectedPlaylist(
                        selectedPlaylist === pl.id.uuid ? "" : pl.id.uuid
                      )
                    }
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors
                      ${
                        selectedPlaylist === pl.id.uuid
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "hover:bg-accent border border-transparent"
                      }`}
                  >
                    {pl.id.name}
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          {/* Playlist items */}
          {selectedPlaylist && playlistItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {playlists.find((p) => p.id.uuid === selectedPlaylist)?.id.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {playlistItems.map((item, idx) => (
                  <button
                    key={item.id.uuid || idx}
                    onClick={() =>
                      handleTriggerPlaylistItem(selectedPlaylist, item.id.index)
                    }
                    disabled={!connected || sending || item.type === "header"}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors text-left
                      ${
                        item.type === "header"
                          ? "font-semibold text-muted-foreground cursor-default bg-muted/30"
                          : "hover:bg-accent"
                      }`}
                  >
                    {item.type !== "header" && (
                      <Play className="h-3 w-3 shrink-0 text-muted-foreground" />
                    )}
                    <span className="truncate">{item.id.name}</span>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
