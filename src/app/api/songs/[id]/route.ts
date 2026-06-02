import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { autoSyncSong } from "@/lib/propresenter/sync";
import { requireSession, applyRateLimit, sanitize } from "@/lib/security";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireSession(); } catch (e) { return e as Response; }
  const { id } = await params;
  const song = await prisma.song.findUnique({
    where: { id },
    include: { arrangements: true, serviceItems: { include: { service: true }, take: 10, orderBy: { service: { date: "desc" } } } },
  });
  if (!song) return NextResponse.json({ error: "Chant non trouvé" }, { status: 404 });
  return NextResponse.json(song);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireSession(); } catch (e) { return e as Response; }
  const rl = applyRateLimit(request, "songs.update", 60, 60_000);
  if (rl) return rl;

  const { id } = await params;
  const body = await request.json();

  const song = await prisma.song.update({
    where: { id },
    data: {
      title:        body.title        ? sanitize(body.title)        : undefined,
      author:       body.author       ? sanitize(body.author)       : body.author,
      lyrics:       body.lyrics       ? sanitize(body.lyrics)       : body.lyrics,
      defaultKey:   body.defaultKey   ?? undefined,
      tempo:        body.tempo !== undefined ? (body.tempo ? parseInt(body.tempo) : null) : undefined,
      tags:         body.tags         ? sanitize(body.tags)         : body.tags,
      ccliNumber:   body.ccliNumber   ? sanitize(body.ccliNumber)   : body.ccliNumber,
      publisher:    body.publisher    ? sanitize(body.publisher)    : body.publisher,
      copyrightYear: body.copyrightYear !== undefined ? (body.copyrightYear ? parseInt(body.copyrightYear) : null) : undefined,
      artistCredits: body.artistCredits ? sanitize(body.artistCredits) : body.artistCredits,
      album:         body.album        ? sanitize(body.album)        : body.album,
      copyrightDisplay: body.copyrightDisplay ?? undefined,
      proPresenterPath: body.proPresenterPath ?? undefined,
    },
    include: { arrangements: true },
  });

  autoSyncSong(song).catch(() => {});
  return NextResponse.json(song);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireSession(); } catch (e) { return e as Response; }
  const rl = applyRateLimit(request, "songs.delete", 20, 60_000);
  if (rl) return rl;

  const { id } = await params;
  await prisma.song.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
