import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Import songs from text/JSON format.
 * Accepts either:
 *   - JSON array of songs
 *   - Plain text with format: title, author, lyrics separated by ---
 */
export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";

  let songsToImport: { title: string; author?: string; lyrics?: string; defaultKey?: string; tempo?: number; tags?: string }[] = [];

  if (contentType.includes("application/json")) {
    const body = await request.json();
    if (Array.isArray(body)) {
      songsToImport = body;
    } else if (body.songs && Array.isArray(body.songs)) {
      songsToImport = body.songs;
    } else {
      return NextResponse.json({ error: "Format JSON invalide — attendu un tableau de chants" }, { status: 400 });
    }
  } else {
    // Plain text import: parse sections separated by "---"
    const text = await request.text();
    const sections = text.split(/^---+$/m).map(s => s.trim()).filter(Boolean);

    for (const section of sections) {
      const lines = section.split("\n").map(l => l.trim());
      const title = lines[0] || "";
      const author = lines[1] || "";
      // Rest is lyrics, join with newlines
      const lyrics = lines.slice(2).join("\n").trim();

      if (title) {
        songsToImport.push({ title, author: author || undefined, lyrics });
      }
    }
  }

  if (songsToImport.length === 0) {
    return NextResponse.json({ error: "Aucun chant à importer" }, { status: 400 });
  }

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const song of songsToImport) {
    if (!song.title) {
      errors.push("Chant sans titre ignoré");
      continue;
    }

    // Check for duplicates
    const existing = await prisma.song.findFirst({
      where: { title: song.title, author: song.author || null },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.song.create({
      data: {
        title: song.title,
        author: song.author || null,
        lyrics: song.lyrics || "",
        defaultKey: song.defaultKey || "Do",
        tempo: song.tempo || null,
        tags: song.tags || "",
      },
    });
    created++;
  }

  return NextResponse.json({
    created,
    skipped,
    errors,
    total: songsToImport.length,
  });
}
