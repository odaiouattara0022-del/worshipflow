import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { autoSyncSong } from "@/lib/propresenter/sync";
import { requireSession, applyRateLimit, sanitize } from "@/lib/security";

export async function GET(request: NextRequest) {
  let user;
  try { user = await requireSession(); } catch (e) { return e as Response; }

  const { searchParams } = new URL(request.url);
  const search = sanitize(searchParams.get("search") || "").toLowerCase();
  const tag    = sanitize(searchParams.get("tag") || "").toLowerCase();
  const key    = sanitize(searchParams.get("key") || "");
  const scope  = searchParams.get("scope") || "all"; // all | public | mine
  const myChurch = (user as { churchId?: string | null }).churchId ?? null;

  // "Mine" without a church → nothing.
  if (scope === "mine" && !myChurch) return NextResponse.json([]);

  // Visibility: global (churchId null) OR shared (isPublic) OR my church's songs.
  let where: Record<string, unknown>;
  if (scope === "mine") {
    where = { churchId: myChurch };
  } else if (scope === "public") {
    where = { OR: [{ churchId: null }, { isPublic: true }] };
  } else {
    where = { OR: [{ churchId: null }, { isPublic: true }, ...(myChurch ? [{ churchId: myChurch }] : [])] };
  }

  let songs = await prisma.song.findMany({
    where,
    include: { arrangements: true, _count: { select: { serviceItems: true } } },
    orderBy: { title: "asc" },
  });

  // Search / tag / key are applied in JS so we don't stack a second OR group
  // (the REST adapter can't combine two OR groups in one query).
  if (search) songs = songs.filter((s: any) =>
    `${s.title} ${s.author ?? ""} ${s.lyrics ?? ""}`.toLowerCase().includes(search));
  if (tag) songs = songs.filter((s: any) => (s.tags ?? "").toLowerCase().includes(tag));
  if (key) songs = songs.filter((s: any) => s.defaultKey === key);

  return NextResponse.json(songs);
}

export async function POST(request: NextRequest) {
  let user;
  try { user = await requireSession(); } catch (e) { return e as Response; }

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
      // Owned by the creator's church (private). A church-less platform admin
      // creates into the global public library (churchId null).
      churchId: (user as { churchId?: string | null }).churchId ?? null,
      isPublic: false,
    },
    include: { arrangements: true },
  });

  autoSyncSong(song).catch(() => {});
  return NextResponse.json(song, { status: 201 });
}
