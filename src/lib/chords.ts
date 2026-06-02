/**
 * Chord transposition + ChordPro parsing utilities.
 * Format: [Am]Amazing [F]grace how [C]sweet the [G]sound
 */

const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLATS  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// Keys that prefer flat notation
const FLAT_KEYS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm']);

export const ALL_KEYS = [
  'C', 'C#', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B',
];

export const DISPLAY_KEYS = [
  { value: 'C',  label: 'C' },
  { value: 'C#', label: 'C# / Db' },
  { value: 'D',  label: 'D' },
  { value: 'Eb', label: 'Eb' },
  { value: 'E',  label: 'E' },
  { value: 'F',  label: 'F' },
  { value: 'F#', label: 'F# / Gb' },
  { value: 'G',  label: 'G' },
  { value: 'Ab', label: 'Ab' },
  { value: 'A',  label: 'A' },
  { value: 'Bb', label: 'Bb' },
  { value: 'B',  label: 'B' },
];

function noteIndex(note: string): number {
  const i = SHARPS.indexOf(note);
  return i !== -1 ? i : FLATS.indexOf(note);
}

function transposeNote(note: string, semitones: number, preferFlat: boolean): string {
  const idx = noteIndex(note);
  if (idx === -1) return note;
  const newIdx = ((idx + semitones) % 12 + 12) % 12;
  return preferFlat ? FLATS[newIdx] : SHARPS[newIdx];
}

function transposeChord(chord: string, semitones: number, preferFlat: boolean): string {
  if (semitones === 0) return chord;
  // Match root note (e.g. C, C#, Db) + quality (m, maj7, sus4, /E, etc.)
  const m = chord.match(/^([A-G][#b]?)(.*)$/);
  if (!m) return chord;
  const [, root, quality] = m;

  // Handle slash chords: Am/E → root + quality + /bass
  const slash = quality.match(/^(.*?)\/([A-G][#b]?)$/);
  if (slash) {
    const newRoot = transposeNote(root, semitones, preferFlat);
    const newBass = transposeNote(slash[2], semitones, preferFlat);
    return `${newRoot}${slash[1]}/${newBass}`;
  }

  return transposeNote(root, semitones, preferFlat) + quality;
}

export function semitonesBetween(from: string, to: string): number {
  const a = noteIndex(from.replace('m', ''));
  const b = noteIndex(to.replace('m', ''));
  if (a === -1 || b === -1) return 0;
  return ((b - a) % 12 + 12) % 12;
}

/** Transpose all chords in a ChordPro string */
export function transposeChordPro(text: string, semitones: number, targetKey?: string): string {
  if (semitones === 0) return text;
  const preferFlat = targetKey ? FLAT_KEYS.has(targetKey) : false;
  return text.replace(/\[([^\]]+)\]/g, (_, chord) =>
    `[${transposeChord(chord, semitones, preferFlat)}]`
  );
}

export interface ChordSegment {
  chord: string | null;
  text: string;
}

export interface ChordLine {
  isSection: boolean;  // e.g. [Verse 1]
  label: string;       // section label if isSection
  segments: ChordSegment[];
  hasChords: boolean;
}

/** Parse ChordPro text into renderable lines */
export function parseChordPro(text: string): ChordLine[] {
  const lines = text.split('\n');
  const result: ChordLine[] = [];

  for (const raw of lines) {
    const line = raw.trimEnd();

    // Section headers like [Verse 1], [Chorus], [Pont]
    const sectionMatch = line.match(/^\s*\[([A-Za-zÀ-ÿ][^\]]{0,30})\]\s*$/) ;
    if (sectionMatch && !/^[A-G][#b]?/.test(sectionMatch[1])) {
      result.push({ isSection: true, label: sectionMatch[1], segments: [], hasChords: false });
      continue;
    }

    // Parse inline chords
    const segments: ChordSegment[] = [];
    let remaining = line;
    let hasChords = false;
    const parts = remaining.split(/(\[[^\]]+\])/);

    let currentChord: string | null = null;
    for (const part of parts) {
      if (part.startsWith('[') && part.endsWith(']')) {
        currentChord = part.slice(1, -1);
        hasChords = true;
      } else {
        segments.push({ chord: currentChord, text: part });
        currentChord = null;
      }
    }

    // Handle trailing chord with no text
    if (currentChord) segments.push({ chord: currentChord, text: '' });

    if (segments.length > 0 || line.trim() === '') {
      result.push({ isSection: false, label: '', segments, hasChords });
    }
  }

  return result;
}

/** Extract all unique chords from a ChordPro string */
export function extractChords(text: string): string[] {
  const matches = text.match(/\[([^\]]+)\]/g) ?? [];
  return [...new Set(matches.map((m) => m.slice(1, -1)))];
}
