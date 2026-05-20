import { readFile, readdir, stat } from "fs/promises";
import { join, basename, extname } from "path";

export interface ProSlide {
  text: string;
  label: string;
  notes: string;
}

export interface ProGroup {
  name: string;
  color: string;
}

export interface ProPresentation {
  title: string;
  slides: ProSlide[];
  groups: ProGroup[];
  filePath: string;
}

/**
 * Extract plain text from an RTF string.
 * Handles accented characters encoded as \'XX hex escapes (cp1252).
 */
function rtfToPlainText(rtf: string): string {
  // Decode \'XX hex escapes (Windows-1252 / Latin-1 range)
  let text = rtf.replace(/\\'([0-9a-fA-F]{2})/g, (_m, hex) => {
    const code = parseInt(hex, 16);
    return String.fromCharCode(code);
  });

  // Remove RTF header groups like {\fonttbl...}, {\colortbl...}, {\*\...}
  let result = "";
  let skipGroup = false;
  const skipStack: boolean[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (ch === "{") {
      skipStack.push(skipGroup);
      const ahead = text.substring(i + 1, i + 30);
      if (
        ahead.startsWith("\\fonttbl") ||
        ahead.startsWith("\\colortbl") ||
        ahead.startsWith("\\*\\") ||
        ahead.startsWith("\\stylesheet") ||
        ahead.startsWith("\\info")
      ) {
        skipGroup = true;
      }
    } else if (ch === "}") {
      skipGroup = skipStack.pop() ?? false;
    } else if (!skipGroup) {
      result += ch;
    }
  }

  text = result;

  // Replace \par and \line with newlines
  text = text.replace(/\\par\b\s?/g, "\n");
  text = text.replace(/\\line\b\s?/g, "\n");

  // Remove remaining control words like \f0, \fs100, \b0, etc.
  text = text.replace(/\\[a-z]+\d*\s?/gi, "");

  // Remove any remaining braces
  text = text.replace(/[{}]/g, "");

  // Remove non-printable characters but keep unicode
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");

  // Clean up whitespace
  text = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .join("\n");

  return text.trim();
}

/**
 * Find all RTF blocks in binary data by scanning for {\\rtf signature
 * and using brace-depth matching to find their boundaries.
 */
function extractRtfBlocks(buffer: Buffer): string[] {
  const blocks: string[] = [];
  const marker = Buffer.from("{\\rtf");

  let searchFrom = 0;
  while (searchFrom < buffer.length) {
    const idx = buffer.indexOf(marker, searchFrom);
    if (idx === -1) break;

    // Find the matching closing brace
    let depth = 0;
    let end = -1;
    for (let i = idx; i < buffer.length; i++) {
      if (buffer[i] === 0x7b) depth++; // '{'
      if (buffer[i] === 0x7d) depth--; // '}'
      if (depth === 0) {
        end = i;
        break;
      }
    }

    if (end === -1) break;

    const rtfStr = buffer.subarray(idx, end + 1).toString("utf-8");
    blocks.push(rtfStr);
    searchFrom = end + 1;
  }

  return blocks;
}

/**
 * Extract readable ASCII/Latin strings from the binary that might be
 * group names or labels. Looks for strings near known patterns.
 */
function extractGroupNames(buffer: Buffer): string[] {
  const names: string[] = [];
  const groupKeywords = [
    "Groupe",
    "Group",
    "Verse",
    "Chorus",
    "Bridge",
    "Couplet",
    "Refrain",
    "Pont",
    "Tag",
    "Intro",
    "Outro",
    "Pre-Chorus",
    "Ending",
    "Interlude",
    "Vamp",
  ];

  // Scan for readable strings by looking at length-prefixed sequences
  // In protobuf, strings are often prefixed with their length as a varint
  const text = buffer.toString("utf-8");
  for (const kw of groupKeywords) {
    if (text.includes(kw)) {
      names.push(kw);
    }
  }

  return [...new Set(names)];
}

/**
 * Read a .pro file and extract presentation data.
 */
export async function readProFile(filePath: string): Promise<ProPresentation> {
  const buffer = await readFile(filePath);

  // Title from filename (without extension)
  const title = basename(filePath, extname(filePath));

  // Extract RTF blocks and convert to plain text
  const rtfBlocks = extractRtfBlocks(buffer);
  const slides: ProSlide[] = [];

  for (const rtf of rtfBlocks) {
    const plainText = rtfToPlainText(rtf);
    if (plainText.length > 0) {
      slides.push({ text: plainText, label: "", notes: "" });
    }
  }

  // Extract group names
  const groupNames = extractGroupNames(buffer);
  const groups: ProGroup[] = groupNames.map((name) => ({ name, color: "" }));

  return { title, slides, groups, filePath };
}

/**
 * Recursively scan a directory for .pro files and read each.
 */
export async function scanLibrary(
  libraryPath: string
): Promise<ProPresentation[]> {
  const presentations: ProPresentation[] = [];

  async function walkDir(dir: string) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walkDir(fullPath);
      } else if (
        entry.isFile() &&
        entry.name.toLowerCase().endsWith(".pro")
      ) {
        try {
          const pres = await readProFile(fullPath);
          presentations.push(pres);
        } catch {
          // Skip unreadable files
        }
      }
    }
  }

  // Verify path exists
  try {
    const s = await stat(libraryPath);
    if (!s.isDirectory()) return presentations;
  } catch {
    return presentations;
  }

  await walkDir(libraryPath);
  return presentations;
}
