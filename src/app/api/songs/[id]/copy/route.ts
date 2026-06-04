import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, applyRateLimit } from "@/lib/security";

/**
 * POST /api/songs/[id]/copy
 * Duplicates a visible PUBLIC song (global or shared by another church) into the
 * caller's own church library (private), so the church can edit its own copy.
 * Requires the caller to belong to a church.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try { user = await requireSession(); } catch (e) { return e as Response; }
  const rl = applyRateLimit(request, "songs.copy", 30, 60_000);
  if (rl) return rl;

  const myChurch = (user as { churchId?: string | null }).churchId ?? null;
  if (!myChurch) {
    return NextResponse.json({ error: "Vous devez appartenir à une église pour copier un chant." }, { status: 400 });
  }

  const { id } = await params;
  const src = await prisma.song.findFirst({ where: { id }, include: { arrangements: true } });
  if (!src) return NextResponse.json({ error: "Chant non trouvé" }, { status: 404 });

  const s = src as any;
  // Only public songs (global or shared) can be copied. Own-church songs are already yours.
  const isPublicSource = s.churchId == null || s.isPublic === true;
  if (!isPublicSource && s.churchId !== myChurch) {
    return NextResponse.json({ error: "Ce chant n'est pas accessible." }, { status: 403 });
  }

  const copy = await prisma.song.create({
    data: {
      title: s.title,
      author: s.author ?? null,
      lyrics: s.lyrics ?? "",
      defaultKey: s.defaultKey ?? "Do",
      tempo: s.tempo ?? null,
      tags: s.tags ?? "",
      ccliNumber: s.ccliNumber ?? null,
      publisher: s.publisher ?? null,
      copyrightYear: s.copyrightYear ?? null,
      artistCredits: s.artistCredits ?? null,
      album: s.album ?? null,
      copyrightDisplay: s.copyrightDisplay ?? true,
      churchId: myChurch,
      isPublic: false,
    },
    include: { arrangements: true },
  });

  // Copy arrangements (chords, keys) so the church's copy is fully usable.
  for (const a of (s.arrangements ?? [])) {
    await prisma.songArrangement.create({
      data: {
        songId: (copy as any).id,
        name: a.name ?? "Standard",
        key: a.key ?? s.defaultKey ?? "Do",
        sectionOrder: a.sectionOrder ?? "V1,C,V2,C",
        chords: a.chords ?? null,
        notes: a.notes ?? null,
      },
    });
  }

  return NextResponse.json(copy, { status: 201 });
}
