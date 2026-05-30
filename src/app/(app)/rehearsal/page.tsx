"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface Song {
  id: string;
  title: string;
  author: string | null;
  lyrics: string;
  defaultKey: string;
  tempo: number | null;
  audioUrl: string | null;
  audioLabel: string | null;
  arrangements: { id: string; name: string; key: string; chords: string | null; sectionOrder: string }[];
}

export default function RehearsalPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [search, setSearch] = useState("");
  const [fontSize, setFontSize] = useState(20);
  const [scrollSpeed, setScrollSpeed] = useState(0); // 0 = stopped, 1-5 = speed
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<number | null>(null);

  // Metronome state
  const [metronomeActive, setMetronomeActive] = useState(false);
  const [bpm, setBpm] = useState(80);
  const [beat, setBeat] = useState(0);
  const metronomeRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    fetch("/api/songs")
      .then((r) => r.json())
      .then(setSongs);
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
    if (scrollSpeed > 0 && scrollRef.current) {
      scrollIntervalRef.current = window.setInterval(() => {
        scrollRef.current?.scrollBy({ top: scrollSpeed * 0.5, behavior: "smooth" });
      }, 50);
    }
    return () => {
      if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current);
    };
  }, [scrollSpeed]);

  // Metronome
  const playClick = useCallback((accent: boolean) => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = accent ? 1000 : 800;
    gain.gain.value = accent ? 0.3 : 0.15;
    osc.start(ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.stop(ctx.currentTime + 0.08);
  }, []);

  useEffect(() => {
    if (metronomeRef.current) {
      clearInterval(metronomeRef.current);
      metronomeRef.current = null;
    }
    if (metronomeActive && bpm > 0) {
      const interval = 60000 / bpm;
      let currentBeat = 0;
      metronomeRef.current = window.setInterval(() => {
        currentBeat = (currentBeat % 4) + 1;
        setBeat(currentBeat);
        playClick(currentBeat === 1);
      }, interval);
    } else {
      setBeat(0);
    }
    return () => {
      if (metronomeRef.current) clearInterval(metronomeRef.current);
    };
  }, [metronomeActive, bpm, playClick]);

  function selectSong(song: Song) {
    setSelectedSong(song);
    setBpm(song.tempo || 80);
    setScrollSpeed(0);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }

  const filteredSongs = songs.filter(
    (s) =>
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      (s.author || "").toLowerCase().includes(search.toLowerCase())
  );

  const slides = selectedSong
    ? selectedSong.lyrics.split(/\n\n+/).filter(Boolean)
    : [];

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)]">
      <Header title="Mode Répétition" subtitle="Paroles, accords et métronome" />

      <div className="flex gap-4 flex-1 min-h-0 mt-4">
        {/* Song list sidebar */}
        <div className="w-72 shrink-0 flex flex-col">
          <input
            type="text"
            placeholder="Chercher un chant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-2 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
          />
          <div className="flex-1 overflow-y-auto space-y-1">
            {filteredSongs.map((song) => (
              <button
                key={song.id}
                onClick={() => selectSong(song)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  selectedSong?.id === song.id
                    ? "bg-primary/10 text-primary border border-primary/30"
                    : "hover:bg-accent text-foreground"
                }`}
              >
                <div className="font-medium truncate">{song.title}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {song.author} · {song.defaultKey}
                  {song.tempo ? ` · ${song.tempo} BPM` : ""}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Main lyrics area */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedSong ? (
            <>
              {/* Controls bar */}
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <Badge variant="outline" className="text-primary">{selectedSong.defaultKey}</Badge>
                {selectedSong.tempo && (
                  <Badge variant="secondary">{selectedSong.tempo} BPM</Badge>
                )}

                {/* Font size */}
                <div className="flex items-center gap-1 ml-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 w-7 p-0 text-xs"
                    onClick={() => setFontSize(Math.max(14, fontSize - 2))}
                  >
                    A-
                  </Button>
                  <span className="text-xs text-muted-foreground w-8 text-center">{fontSize}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 w-7 p-0 text-xs"
                    onClick={() => setFontSize(Math.min(40, fontSize + 2))}
                  >
                    A+
                  </Button>
                </div>

                {/* Auto-scroll */}
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">Scroll:</span>
                  {[0, 1, 2, 3].map((speed) => (
                    <Button
                      key={speed}
                      size="sm"
                      variant={scrollSpeed === speed ? "default" : "outline"}
                      className="h-7 w-7 p-0 text-xs"
                      onClick={() => setScrollSpeed(speed)}
                    >
                      {speed === 0 ? "⏹" : speed}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Metronome bar */}
              <div className="flex items-center gap-3 mb-3 p-2 rounded-lg border border-border bg-card">
                <Button
                  size="sm"
                  variant={metronomeActive ? "default" : "outline"}
                  onClick={() => setMetronomeActive(!metronomeActive)}
                  className="h-8"
                >
                  {metronomeActive ? "⏹ Stop" : "▶ Métronome"}
                </Button>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => setBpm(Math.max(40, bpm - 5))}>-</Button>
                  <span className="text-sm font-mono w-14 text-center">{bpm} BPM</span>
                  <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => setBpm(Math.min(220, bpm + 5))}>+</Button>
                </div>
                {/* Beat indicator */}
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((b) => (
                    <div
                      key={b}
                      className={`h-4 w-4 rounded-full transition-colors ${
                        beat === b
                          ? b === 1
                            ? "bg-primary"
                            : "bg-primary/60"
                          : "bg-muted"
                      }`}
                    />
                  ))}
                </div>

                {/* Audio player if available */}
                {selectedSong.audioUrl && (
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{selectedSong.audioLabel || "Audio"}</span>
                    <audio src={selectedSong.audioUrl} controls className="h-8" />
                  </div>
                )}
              </div>

              {/* Lyrics display */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto rounded-lg border border-border bg-card p-6">
                <h2 className="text-xl font-bold mb-1">{selectedSong.title}</h2>
                <p className="text-sm text-muted-foreground mb-6">{selectedSong.author}</p>
                <div className="space-y-6">
                  {slides.map((slide, i) => (
                    <div
                      key={i}
                      className="border-l-2 border-primary/20 pl-4"
                      style={{ fontSize: `${fontSize}px`, lineHeight: 1.6 }}
                    >
                      <span className="text-xs text-muted-foreground font-mono mb-1 block">
                        Slide {i + 1}
                      </span>
                      {slide.split("\n").map((line, j) => (
                        <div key={j}>{line}</div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <Card className="flex-1 flex items-center justify-center">
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
