"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChordSheet } from "@/components/songs/chord-sheet";
import { bpmFromTaps } from "@/lib/tempo";
import { ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";

interface Arrangement { id: string; name: string; key: string; chords: string | null; sectionOrder: string }
interface Song {
  id: string;
  title: string;
  author: string | null;
  lyrics: string;
  defaultKey: string;
  tempo: number | null;
  audioUrl: string | null;
  audioLabel: string | null;
  arrangements: Arrangement[];
}
interface ServiceItem { id: string; type: string; songId: string | null; order: number; title: string }
interface ServiceLite { id: string; title: string; date: string; items: ServiceItem[] }

const TIME_SIGNATURES = [
  { label: "2/4", beats: 2 },
  { label: "3/4", beats: 3 },
  { label: "4/4", beats: 4 },
  { label: "6/8", beats: 6 },
];

export default function RehearsalPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [services, setServices] = useState<ServiceLite[]>([]);
  const [source, setSource] = useState<string>("all"); // "all" | serviceId
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"lyrics" | "chords">("lyrics");
  const [fontSize, setFontSize] = useState(20);
  const [scrollSpeed, setScrollSpeed] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<number | null>(null);

  // Metronome
  const [metronomeActive, setMetronomeActive] = useState(false);
  const [bpm, setBpm] = useState(80);
  const [beatsPerBar, setBeatsPerBar] = useState(4);
  const [beat, setBeat] = useState(0);
  const [countIn, setCountIn] = useState(0);
  const metronomeRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const tapsRef = useRef<number[]>([]);

  useEffect(() => {
    fetch("/api/songs").then((r) => r.json()).then(setSongs).catch(() => {});
    fetch("/api/services").then((r) => r.json()).then((d) => setServices(d.services ?? d ?? [])).catch(() => {});
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (scrollIntervalRef.current) { clearInterval(scrollIntervalRef.current); scrollIntervalRef.current = null; }
    if (scrollSpeed > 0) {
      scrollIntervalRef.current = window.setInterval(() => {
        scrollRef.current?.scrollBy({ top: scrollSpeed * 0.5, behavior: "smooth" });
      }, 50);
    }
    return () => { if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current); };
  }, [scrollSpeed, tab]);

  const playClick = useCallback((accent: boolean) => {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = accent ? 1000 : 800;
    gain.gain.value = accent ? 0.3 : 0.15;
    osc.start(ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.stop(ctx.currentTime + 0.08);
  }, []);

  // Metronome loop
  useEffect(() => {
    if (metronomeRef.current) { clearInterval(metronomeRef.current); metronomeRef.current = null; }
    if (metronomeActive && bpm > 0 && countIn === 0) {
      const interval = 60000 / bpm;
      let current = 0;
      metronomeRef.current = window.setInterval(() => {
        current = (current % beatsPerBar) + 1;
        setBeat(current);
        playClick(current === 1);
      }, interval);
    } else if (!metronomeActive) {
      setBeat(0);
    }
    return () => { if (metronomeRef.current) clearInterval(metronomeRef.current); };
  }, [metronomeActive, bpm, beatsPerBar, countIn, playClick]);

  function handleTap() {
    const now = Date.now();
    tapsRef.current = [...tapsRef.current, now].slice(-8);
    const computed = bpmFromTaps(tapsRef.current);
    if (computed) setBpm(computed);
  }

  // One-bar count-in, then start the metronome.
  function startCountIn() {
    if (metronomeActive) { setMetronomeActive(false); return; }
    let n = 1;
    setCountIn(1);
    playClick(true);
    const interval = 60000 / bpm;
    const id = window.setInterval(() => {
      n += 1;
      if (n > beatsPerBar) {
        clearInterval(id);
        setCountIn(0);
        setMetronomeActive(true);
        return;
      }
      setCountIn(n);
      playClick(false);
    }, interval);
  }

  function selectSong(song: Song) {
    setSelectedSong(song);
    setBpm(song.tempo || 80);
    setScrollSpeed(0);
    setTab("lyrics");
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }

  // Source: "all" → full library; otherwise the chosen service's songs in order.
  const setlist: Song[] | null = useMemo(() => {
    if (source === "all") return null;
    const svc = services.find((s) => s.id === source);
    if (!svc) return [];
    return svc.items
      .filter((it) => it.type === "SONG" && it.songId)
      .map((it) => songs.find((s) => s.id === it.songId))
      .filter((s): s is Song => Boolean(s));
  }, [source, services, songs]);

  const filteredSongs = useMemo(
    () => songs.filter(
      (s) => s.title.toLowerCase().includes(search.toLowerCase()) ||
             (s.author || "").toLowerCase().includes(search.toLowerCase())
    ),
    [songs, search]
  );

  const listSongs = setlist ?? filteredSongs;

  // Setlist navigation
  const currentIndex = selectedSong ? listSongs.findIndex((s) => s.id === selectedSong.id) : -1;
  const goRelative = (delta: number) => {
    if (currentIndex < 0) return;
    const next = listSongs[currentIndex + delta];
    if (next) selectSong(next);
  };

  const arrangement = selectedSong?.arrangements?.find((a) => a.chords?.trim()) ?? selectedSong?.arrangements?.[0] ?? null;
  const hasChords = !!arrangement?.chords?.trim();

  const slides = selectedSong ? selectedSong.lyrics.split(/\n\n+/).filter(Boolean) : [];

  return (
    <div className="flex flex-col h-[calc(100dvh-7.5rem)] md:h-[calc(100vh-2rem)]">
      <Header title="Mode Répétition" subtitle="Paroles, accords et métronome" />

      <div className="flex flex-col md:flex-row gap-4 flex-1 min-h-0 mt-4">
        {/* Song list — full width on mobile (hidden once a song is open), sidebar on desktop */}
        <div className={`md:w-72 md:shrink-0 flex-col min-h-0 ${selectedSong ? "hidden md:flex" : "flex flex-1 md:flex-none"}`}>
          {/* Source selector */}
          <select
            value={source}
            onChange={(e) => { setSource(e.target.value); setSelectedSong(null); }}
            className="mb-2 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">Tous les chants</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} — {new Date(s.date).toLocaleDateString("fr-FR")}
              </option>
            ))}
          </select>

          {source === "all" && (
            <input
              type="text"
              placeholder="Chercher un chant..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-2 h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            />
          )}

          <div className="flex-1 overflow-y-auto space-y-1">
            {listSongs.length === 0 && (
              <p className="text-sm text-muted-foreground px-1 py-2">
                {setlist ? "Aucun chant dans ce service." : "Aucun chant."}
              </p>
            )}
            {listSongs.map((song, i) => (
              <button
                key={song.id}
                onClick={() => selectSong(song)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  selectedSong?.id === song.id
                    ? "bg-primary/10 text-primary border border-primary/30"
                    : "hover:bg-accent text-foreground"
                }`}
              >
                <div className="font-medium truncate">
                  {setlist ? <span className="text-muted-foreground mr-1">{i + 1}.</span> : null}
                  {song.title}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {song.author} · {song.defaultKey}{song.tempo ? ` · ${song.tempo} BPM` : ""}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Main area */}
        <div className={`flex-1 flex-col min-w-0 ${selectedSong ? "flex" : "hidden md:flex"}`}>
          {selectedSong ? (
            <>
              {/* Top bar: back (mobile) + setlist nav + key/tempo + tabs */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <Button size="sm" variant="ghost" className="md:hidden h-8 px-2" onClick={() => setSelectedSong(null)}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Chants
                </Button>

                {setlist && (
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0" disabled={currentIndex <= 0} onClick={() => goRelative(-1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground w-12 text-center">{currentIndex + 1}/{listSongs.length}</span>
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0" disabled={currentIndex >= listSongs.length - 1} onClick={() => goRelative(1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                <Badge variant="outline" className="text-primary">{selectedSong.defaultKey}</Badge>
                {selectedSong.tempo && <Badge variant="secondary">{selectedSong.tempo} BPM</Badge>}

                {/* Tabs */}
                <div className="ml-auto flex rounded-md border border-border overflow-hidden">
                  <button
                    onClick={() => setTab("lyrics")}
                    className={`px-3 h-8 text-xs ${tab === "lyrics" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
                  >Paroles</button>
                  <button
                    onClick={() => setTab("chords")}
                    className={`px-3 h-8 text-xs ${tab === "chords" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
                  >Accords</button>
                </div>
              </div>

              {/* Metronome bar */}
              <div className="flex items-center gap-2 mb-3 p-2 rounded-lg border border-border bg-card flex-wrap relative">
                <Button size="sm" variant={metronomeActive ? "default" : "outline"} className="h-8" onClick={startCountIn}>
                  {metronomeActive ? "⏹ Stop" : "▶ Métronome"}
                </Button>
                <Button size="sm" variant="outline" className="h-8" onClick={handleTap}>Tap</Button>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => setBpm(Math.max(40, bpm - 5))}>-</Button>
                  <span className="text-sm font-mono w-14 text-center">{bpm} BPM</span>
                  <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => setBpm(Math.min(220, bpm + 5))}>+</Button>
                </div>
                <select
                  value={beatsPerBar}
                  onChange={(e) => setBeatsPerBar(Number(e.target.value))}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                  title="Signature rythmique"
                >
                  {TIME_SIGNATURES.map((ts) => <option key={ts.label} value={ts.beats}>{ts.label}</option>)}
                </select>
                <div className="flex gap-1">
                  {Array.from({ length: beatsPerBar }, (_, i) => i + 1).map((b) => (
                    <div key={b} className={`h-3.5 w-3.5 rounded-full transition-colors ${
                      beat === b ? (b === 1 ? "bg-primary" : "bg-primary/60") : "bg-muted"
                    }`} />
                  ))}
                </div>

                {selectedSong.audioUrl && (
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-xs text-muted-foreground hidden sm:inline">{selectedSong.audioLabel || "Audio"}</span>
                    <audio src={selectedSong.audioUrl} controls className="h-8 max-w-[180px]" />
                  </div>
                )}

                {/* Count-in overlay */}
                {countIn > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/90 z-10">
                    <span className="text-4xl font-bold text-primary tabular-nums">{countIn}</span>
                  </div>
                )}
              </div>

              {/* Lyrics / Chords */}
              {tab === "lyrics" ? (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-muted-foreground">Taille</span>
                    <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-xs" onClick={() => setFontSize(Math.max(14, fontSize - 2))}>A-</Button>
                    <span className="text-xs text-muted-foreground w-8 text-center">{fontSize}</span>
                    <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-xs" onClick={() => setFontSize(Math.min(40, fontSize + 2))}>A+</Button>
                    <span className="text-xs text-muted-foreground ml-2">Défil.</span>
                    {[0, 1, 2, 3].map((sp) => (
                      <Button key={sp} size="sm" variant={scrollSpeed === sp ? "default" : "outline"} className="h-7 w-7 p-0 text-xs" onClick={() => setScrollSpeed(sp)}>
                        {sp === 0 ? "⏹" : sp}
                      </Button>
                    ))}
                  </div>
                  <div ref={scrollRef} className="flex-1 overflow-y-auto rounded-lg border border-border bg-card p-6">
                    <h2 className="text-xl font-bold mb-1">{selectedSong.title}</h2>
                    <p className="text-sm text-muted-foreground mb-6">{selectedSong.author}</p>
                    <div className="space-y-6">
                      {slides.map((slide, i) => (
                        <div key={i} className="border-l-2 border-primary/20 pl-4" style={{ fontSize: `${fontSize}px`, lineHeight: 1.6 }}>
                          <span className="text-xs text-muted-foreground font-mono mb-1 block">Diapo {i + 1}</span>
                          {slide.split("\n").map((line, j) => <div key={j}>{line}</div>)}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div ref={scrollRef} className="flex-1 overflow-y-auto rounded-lg border border-border bg-card p-4">
                  {hasChords ? (
                    <ChordSheet
                      title={selectedSong.title}
                      author={selectedSong.author}
                      chords={arrangement!.chords!}
                      originalKey={arrangement!.key || selectedSong.defaultKey}
                    />
                  ) : (
                    <div className="text-center text-muted-foreground py-10">
                      <p className="mb-1">Pas de grille d&apos;accords pour ce chant.</p>
                      <p className="text-sm">Ajoutez un arrangement avec accords depuis la fiche du chant.</p>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <Card className="flex-1 hidden md:flex items-center justify-center">
              <CardContent className="text-center text-muted-foreground">
                <p className="text-lg mb-2">Sélectionnez un chant</p>
                <p className="text-sm">Choisissez un chant dans la liste pour commencer la répétition</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
