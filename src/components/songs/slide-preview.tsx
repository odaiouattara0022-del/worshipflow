"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SlideData {
  index: number;
  label: string;
  text: string;
  lines: string[];
  lineCount: number;
}

interface ThemeData {
  name: string;
  textPosition: { x: number; y: number; width: number; height: number };
  backgroundImage: string | null;
  backgroundPosition: { x: number; y: number; width: number; height: number } | null;
  textBgColor: string | null;
  textStyle: {
    fontSize: number;
    bold: boolean;
    color: string;
    alignment: string;
  };
  slideSize: { width: number; height: number };
}

interface PPThemeSlide {
  uuid: string;
  name: string;
  index: number;
}

interface PPThemeSlideThumbnail {
  uuid: string;
  name: string;
  index: number;
  thumbnail: string | null;
}

interface PPTheme {
  name: string;
  index: number;
  slides: PPThemeSlide[];
}

interface SlidePreviewProps {
  lyrics: string;
  themeName?: string;
  slideUuid?: string;
}

export function SlidePreview({ lyrics, themeName: externalThemeName, slideUuid: externalSlideUuid }: SlidePreviewProps) {
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [theme, setTheme] = useState<ThemeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedSlide, setSelectedSlide] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Theme selection state
  const [ppThemes, setPpThemes] = useState<PPTheme[]>([]);
  const [chosenThemeName, setChosenThemeName] = useState(externalThemeName || "");
  const [chosenSlideUuid, setChosenSlideUuid] = useState(externalSlideUuid || "");
  const [loadingThemes, setLoadingThemes] = useState(true);
  const [slideThumbnails, setSlideThumbnails] = useState<PPThemeSlideThumbnail[]>([]);
  const [loadingThumbnails, setLoadingThumbnails] = useState(false);

  // Resolved values: external props override local if provided
  const activeThemeName = externalThemeName || chosenThemeName;
  const activeSlideUuid = externalSlideUuid || chosenSlideUuid;

  // Fetch PP themes list
  const fetchThemes = useCallback(async () => {
    try {
      const res = await fetch("/api/propresenter/themes");
      const data = await res.json();
      const themes: PPTheme[] = data.themes ?? [];
      setPpThemes(themes);

      // Auto-select first theme if none chosen
      if (!chosenThemeName && themes.length > 0) {
        const chant = themes.find((t) => t.name.toLowerCase() === "chant");
        const selected = chant || themes[0];
        setChosenThemeName(selected.name);
        if (selected.slides.length > 0) {
          setChosenSlideUuid(selected.slides[0].uuid);
        }
      }
    } catch {
      // PP not available
    } finally {
      setLoadingThemes(false);
    }
  }, [chosenThemeName]);

  useEffect(() => {
    if (!externalThemeName) {
      fetchThemes();
    } else {
      setLoadingThemes(false);
    }
  }, [externalThemeName, fetchThemes]);

  // Auto-select first slide when theme changes
  const currentPPTheme = ppThemes.find((t) => t.name === chosenThemeName);
  const themeSlides = currentPPTheme?.slides ?? [];

  useEffect(() => {
    if (themeSlides.length > 0 && !externalSlideUuid) {
      setChosenSlideUuid((prev) => {
        if (prev && themeSlides.some((s) => s.uuid === prev)) return prev;
        return themeSlides[0]?.uuid ?? "";
      });
    }
  }, [chosenThemeName, themeSlides, externalSlideUuid]);

  // Fetch slide thumbnails when theme changes
  useEffect(() => {
    if (!chosenThemeName || externalSlideUuid) {
      setSlideThumbnails([]);
      return;
    }
    let cancelled = false;
    setLoadingThumbnails(true);
    fetch(`/api/propresenter/themes/thumbnails?themeName=${encodeURIComponent(chosenThemeName)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setSlideThumbnails(data.thumbnails ?? []);
      })
      .catch(() => {
        if (!cancelled) setSlideThumbnails([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingThumbnails(false);
      });
    return () => { cancelled = true; };
  }, [chosenThemeName, externalSlideUuid]);

  // Fetch preview data
  useEffect(() => {
    if (!lyrics.trim()) {
      setSlides([]);
      setTheme(null);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/propresenter/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lyrics,
            themeName: activeThemeName || undefined,
            slideUuid: activeSlideUuid || undefined,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setSlides(data.slides || []);
          setTheme(data.theme || null);
          setSelectedSlide((prev) => Math.min(prev, (data.slides?.length || 1) - 1));
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [lyrics, activeThemeName, activeSlideUuid]);

  if (!lyrics.trim()) return null;

  const slideWidth = 1920;
  const slideHeight = 1080;

  const active = slides[selectedSlide];

  function goToPrev() {
    setSelectedSlide((p) => Math.max(0, p - 1));
  }
  function goToNext() {
    setSelectedSlide((p) => Math.min(slides.length - 1, p + 1));
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span>
            Preview {theme ? `— ${theme.name}` : ""}
            {loading && <span className="text-xs text-muted-foreground ml-2">(chargement...)</span>}
          </span>
          <span className="text-xs text-muted-foreground font-normal">
            {slides.length} slide{slides.length !== 1 ? "s" : ""}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Theme selector (only if not externally controlled) */}
        {!externalThemeName && !loadingThemes && ppThemes.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground shrink-0">Thème</label>
              <select
                value={chosenThemeName}
                onChange={(e) => setChosenThemeName(e.target.value)}
                className="h-8 flex-1 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Sans thème</option>
                {ppThemes.map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            {chosenThemeName && themeSlides.length > 1 && (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Modèle</label>
                {loadingThumbnails ? (
                  <p className="text-xs text-muted-foreground">Chargement des modèles...</p>
                ) : slideThumbnails.length > 0 ? (
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {slideThumbnails.map((st) => (
                      <button
                        key={st.uuid}
                        onClick={() => setChosenSlideUuid(st.uuid)}
                        title={st.name}
                        className={`relative shrink-0 rounded overflow-hidden border-2 transition-all cursor-pointer group
                          ${st.uuid === chosenSlideUuid
                            ? "border-primary ring-1 ring-primary/40 scale-105"
                            : "border-transparent hover:border-primary/30 opacity-70 hover:opacity-100"
                          }`}
                        style={{ width: 64, height: 36 }}
                      >
                        {st.thumbnail ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={st.thumbnail}
                            alt={st.name}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        ) : (
                          <div
                            className="absolute inset-0"
                            style={{ background: "linear-gradient(145deg, #1a1040, #0a0a1e)" }}
                          />
                        )}
                        {/* Slide name overlay */}
                        <div className="absolute inset-0 flex items-end justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                          <span className="text-white text-[7px] leading-tight pb-0.5 px-0.5 truncate max-w-full font-medium drop-shadow-md">
                            {st.name}
                          </span>
                        </div>
                        {/* Selection check */}
                        {st.uuid === chosenSlideUuid && (
                          <div className="absolute top-0.5 right-0.5 w-3 h-3 bg-primary rounded-full flex items-center justify-center">
                            <span className="text-primary-foreground text-[6px]">✓</span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  /* Fallback to dropdown if no thumbnails available */
                  <select
                    value={chosenSlideUuid}
                    onChange={(e) => setChosenSlideUuid(e.target.value)}
                    className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {themeSlides.map((s) => (
                      <option key={s.uuid} value={s.uuid}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>
        )}
        {!externalThemeName && loadingThemes && (
          <p className="text-xs text-muted-foreground">Chargement des thèmes...</p>
        )}

        {/* Large preview — fills sidebar width, 16:9 ratio */}
        {active && (
          <div className="relative w-full" style={{ aspectRatio: "16 / 9" }}>
            <div
              className="absolute inset-0 rounded-lg overflow-hidden border border-border shadow-lg bg-black"
            >
              {/* Background image — positioned at its protobuf bounds */}
              {theme?.backgroundImage && theme.backgroundPosition && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={theme.backgroundImage}
                  alt="Background"
                  className="absolute"
                  style={{
                    left: (theme.backgroundPosition.x / slideWidth) * 100 + "%",
                    top: (theme.backgroundPosition.y / slideHeight) * 100 + "%",
                    width: (theme.backgroundPosition.width / slideWidth) * 100 + "%",
                    height: (theme.backgroundPosition.height / slideHeight) * 100 + "%",
                    objectFit: "fill",
                  }}
                />
              )}
              {/* Background image — full slide if no specific position */}
              {theme?.backgroundImage && !theme.backgroundPosition && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={theme.backgroundImage}
                  alt="Background"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
              {/* Gradient overlay when no theme */}
              {!theme?.backgroundImage && (
                <div
                  className="absolute inset-0"
                  style={{ background: "linear-gradient(145deg, #1a1040 0%, #0d0d2b 50%, #0a0a1e 100%)" }}
                />
              )}
              {/* Text overlay — expand small text areas for readability */}
              <div
                className="absolute flex items-end justify-center px-2 pb-1"
                style={
                  theme
                    ? (() => {
                        const textTopPct = (theme.textPosition.y / slideHeight) * 100;
                        const textHeightPct = (theme.textPosition.height / slideHeight) * 100;
                        // If the text area is small (<30%), expand upward for readability
                        const expandedHeight = Math.max(textHeightPct, 40);
                        const expandedTop = Math.max(0, textTopPct + textHeightPct - expandedHeight);
                        return {
                          left: (theme.textPosition.x / slideWidth) * 100 + "%",
                          top: expandedTop + "%",
                          width: (theme.textPosition.width / slideWidth) * 100 + "%",
                          height: expandedHeight + "%",
                        };
                      })()
                    : {
                        left: "4%",
                        top: "15%",
                        width: "92%",
                        height: "70%",
                      }
                }
              >
                <p
                  className="text-center leading-snug w-full"
                  style={{
                    fontSize: "clamp(10px, 4cqi, 18px)",
                    fontWeight: theme?.textStyle.bold ? "bold" : 600,
                    color: theme?.textStyle.color || "#fff",
                    textShadow: "1px 1px 4px rgba(0,0,0,0.9)",
                    letterSpacing: "0.01em",
                  }}
                >
                  {active.lines.map((line, i) => (
                    <span key={i}>
                      {line}
                      {i < active.lines.length - 1 && <br />}
                    </span>
                  ))}
                </p>
              </div>
              {/* Slide number badge */}
              <div className="absolute bottom-1 right-1 bg-black/50 text-white/80 text-[9px] px-1.5 py-0.5 rounded-sm font-mono">
                {active.index + 1}/{slides.length}
              </div>
            </div>
          </div>
        )}

        {/* Navigation controls */}
        {slides.length > 1 && (
          <div className="flex items-center justify-between gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              disabled={selectedSlide === 0}
              onClick={goToPrev}
            >
              ◀ Préc.
            </Button>
            <span className="text-xs text-muted-foreground font-mono">
              Slide {selectedSlide + 1} / {slides.length}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              disabled={selectedSlide === slides.length - 1}
              onClick={goToNext}
            >
              Suiv. ▶
            </Button>
          </div>
        )}

        {/* Thumbnail strip */}
        {slides.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {slides.map((slide) => (
              <button
                key={slide.index}
                onClick={() => setSelectedSlide(slide.index)}
                className={`relative shrink-0 rounded overflow-hidden border-2 transition-all
                  ${
                    slide.index === selectedSlide
                      ? "border-primary ring-1 ring-primary/40 scale-105"
                      : "border-transparent hover:border-primary/30 opacity-70 hover:opacity-100"
                  }`}
                style={{
                  width: 52,
                  height: 30,
                  background: theme?.backgroundImage
                    ? undefined
                    : "linear-gradient(145deg, #1a1040, #0a0a1e)",
                }}
              >
                {/* Background */}
                {theme?.backgroundImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={theme.backgroundImage}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover opacity-70"
                  />
                )}
                {/* Index number */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white font-bold text-[10px]">{slide.index + 1}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
