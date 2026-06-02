import { randomUUID } from "crypto";

interface SongInput { title: string; lyrics: string; }

interface FreeShowSlide {
  group: string | null;
  color: string | null;
  settings: Record<string, unknown>;
  notes: string;
  items: { lines: { text: { value: string }[] }[] }[];
}

export interface FreeShowShow {
  name: string;
  category: string;
  settings: Record<string, unknown>;
  slides: Record<string, FreeShowSlide>;
  layouts: Record<string, { name: string; slides: { id: string }[] }>;
  media: Record<string, unknown>;
}

/** Split lyrics into sections on blank lines; each non-empty section is a slide. */
function splitSections(lyrics: string): string[][] {
  return lyrics
    .split(/\n\s*\n/)
    .map((s) => s.split("\n").map((l) => l.trim()).filter(Boolean))
    .filter((lines) => lines.length > 0);
}

export function generateShow(song: SongInput): FreeShowShow {
  const sections = splitSections(song.lyrics);
  const slides: FreeShowShow["slides"] = {};
  const order: { id: string }[] = [];

  sections.forEach((lines, i) => {
    const id = randomUUID();
    slides[id] = {
      group: i === 0 ? "Verse 1" : null,
      color: null,
      settings: {},
      notes: "",
      items: [{ lines: lines.map((value) => ({ text: [{ value }] })) }],
    };
    order.push({ id });
  });

  const layoutId = randomUUID();
  return {
    name: song.title,
    category: "song",
    settings: {},
    slides,
    layouts: { [layoutId]: { name: "Default", slides: order } },
    media: {},
  };
}
