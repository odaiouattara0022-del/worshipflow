import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { autoSyncSong } from "@/lib/propresenter/sync";
import { requireSession, applyRateLimit, sanitize } from "@/lib/security";

export async function GET(request: NextRequest) {
  try { await requireSession(); } catch (e) { return e as Response; }

  const { searchParams } = new URL(request.url);
  const search = sanitize(searchParams.get("search") || "");
  const tag    = sanitize(searchParams.get("tag") || "");
  const key    = sanitize(searchParams.get("key") || "");

  const where: Record<string, unknown> = {};
  if (search) where.OR = [
    { title: { contains: search } },
    { author: { contains: search } },
    { lyrics: { contains: search } },
  ];
  if (tag) where.tags = { contains: tag };
  if (key) where.defaultKey = key;

  const songs = await prisma.song.findMany({
    where,
    include: { arrangements: true, _count: { select: { serviceItems: true } } },
    orderBy: { title: "asc" },
  });
  return NextResponse.json(songs);
}

export async function POST(request: NextRequest) {
  try { await requireSession(); } catch (e) { return e as Response; }

  const rl = applyRateLimit(request, "songs.create", 30, 60_000);
  if (rl) return rl;

  const body = await request.json();
  const { title, author, lyrics, defaultKey, tempo, tags,
    ccliNumber, publisher, copyrightYear, artistCredits, album,
    copyrightDisplay, proPresenterPath } = body;

  if (!title?.trim()) return NextResponse.json({ error: "Le titre est requis" }, { status: 400 });

  const song = await prisma.song.create({
    data: {
      title:          sanitize(title),
      author:         author  ? sanitize(author)  : null,
      lyrics:         lyrics  ? sanitize(lyrics)  : "",
      defaultKey:     defaultKey || "Do",
      tempo:          tempo ? parseInt(tempo) : null,
      tags:           tags  ? sanitize(tags)  : "",
      ccliNumber:     ccliNumber  ? sanitize(ccliNumber)  : null,
      publisher:      publisher   ? sanitize(publisher)   : null,
      copyrightYear:  copyrightYear ? parseInt(copyrightYear) : null,
      artistCredits:  artistCredits ? sanitize(artistCredits) : null,
      album:          album ? sanitize(album) : null,
      copyrightDisplay: copyrightDisplay !== undefined ? copyrightDisplay : true,
      proPresenterPath: proPresenterPath || null,
    },
    include: { arrangements: true },
  });

  autoSyncSong(song).catch(() => {});
  return NextResponse.json(song, { status: 201 });
}
