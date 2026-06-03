import { randomUUID } from "crypto";

interface SongMeta {
  author?: string | null;
  artist?: string | null;
  publisher?: string | null;
  ccli?: string | null;
  year?: string | number | null;
}

interface SongInput {
  title: string;
  lyrics: string;
  meta?: SongMeta;
}

interface FreeShowLine {
  align: string;
  text: { value: string; style: string }[];
}

interface FreeShowItem {
  type: "text";
  style: string;
  align: string;
  lines: FreeShowLine[];
}

interface FreeShowSlide {
  group: string | null;
  color: string | null;
  settings: Record<string, unknown>;
  notes: string;
  items: FreeShowItem[];
}

export interface FreeShowShow {
  id: string;
  name: string;
  category: string | null;
  settings: { activeLayout: string; template: string | null };
  timestamps: { created: number; modified: number | null; used: number | null };
  meta: Record<string, string>;
  slides: Record<string, FreeShowSlide>;
  layouts: Record<string, { name: string; notes: string; slides: { id: string }[] }>;
  media: Record<string, unknown>;
}

// Sensible defaults so the text is actually visible on a 1920x1080 output
// instead of collapsing into a tiny top-left box (FreeShow positions items via CSS).
const ITEM_STYLE = "left:100px;top:120px;width:1720px;height:840px;";
const TEXT_STYLE = "font-size:80px;font-weight:bold;color:#ffffff;";
const LINE_ALIGN = "text-align:center;";

/** Split lyrics into sections on blank lines; each non-empty section is a slide. */
function splitSections(lyrics: string): string[][] {
  return lyrics
    .split(/\n\s*\n/)
    .map((s) => s.split("\n").map((l) => l.trim()).filter(Boolean))
    .filter((lines) => lines.length > 0);
}

function buildMeta(title: string, meta?: SongMeta): Record<string, string> {
  const m: Record<string, string> = { title };
  if (meta?.author) m.author = String(meta.author);
  if (meta?.artist) m.artist = String(meta.artist);
  if (meta?.publisher) m.publisher = String(meta.publisher);
  if (meta?.ccli) m.CCLI = String(meta.ccli);
  if (meta?.year) m.year = String(meta.year);
  return m;
}

export function generateShow(song: SongInput): FreeShowShow {
  const sections = splitSections(song.lyrics);
  const slides: FreeShowShow["slides"] = {};
  const order: { id: string }[] = [];

  sections.forEach((lines, i) => {
    const id = randomUUID();
    slides[id] = {
      // FreeShow shows expect every section grouped; default to "Verse N".
      group: `Verse ${i + 1}`,
      color: null,
      settings: {},
      notes: "",
      items: [
        {
          type: "text",
          style: ITEM_STYLE,
          align: "",
          lines: lines.map((value) => ({
            align: LINE_ALIGN,
            text: [{ value, style: TEXT_STYLE }],
          })),
        },
      ],
    };
    order.push({ id });
  });

  const layoutId = randomUUID();
  const now = Date.now();
  return {
    id: randomUUID(),
    name: song.title,
    category: "song",
    settings: { activeLayout: layoutId, template: null },
    timestamps: { created: now, modified: now, used: null },
    meta: buildMeta(song.title, song.meta),
    slides,
    layouts: { [layoutId]: { name: "Default", notes: "", slides: order } },
    media: {},
  };
}
