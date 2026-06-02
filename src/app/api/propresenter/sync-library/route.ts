import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { executeViaAgent, bridgeErrorResponse } from "@/lib/propresenter/bridge";

/**
 * POST /api/propresenter/sync-library
 * Body: { deviceId?, theme?, slideUuid?, libraryPath? }
 *
 * Pushes ALL ProSendWorship songs as .pro files into PP's "ProSendWorship" library folder.
 * After sync, PP's search bar returns all ProSendWorship songs instantly.
 */
export async function POST(request: NextRequest) {
  try {
    const { deviceId, theme, slideUuid, libraryPath } = await request.json().catch(() => ({}));

    const device = deviceId
      ? await prisma.ppDevice.findFirst({ where: { id: deviceId } })
      : await prisma.ppDevice.findFirst({ where: { isDefault: true } });

    if (!device) {
      return NextResponse.json({ error: "Aucun appareil configuré" }, { status: 404 });
    }

    const dbSongs = await prisma.song.findMany({
      select: {
        id: true, title: true, lyrics: true,
        author: true, publisher: true, ccliNumber: true,
      },
    });

    const songs = (dbSongs as any[])
      .filter((s: any) => s.lyrics?.trim())
      .map((s: any) => ({
        id: s.id,
        title: s.title,
        lyrics: s.lyrics,
        author: s.author ?? null,
        publisher: s.publisher ?? null,
        ccliNumber: s.ccliNumber ?? null,
      }));

    const resolvedLibPath = libraryPath ?? (device as any).libraryPath
      ? (device as any).libraryPath?.replace(/Libraries\/[^/]+\/?$/, "Libraries/ProSendWorship")
      : null;

    const result = await executeViaAgent(
      (device as any).id,
      "sync-library",
      { songs, theme: theme ?? null, slideUuid: slideUuid ?? null, libraryPath: resolvedLibPath },
      120_000 // 2 min pour une grosse bibliothèque
    ) as any;

    return NextResponse.json(result);
  } catch (err) {
    return bridgeErrorResponse(err);
  }
}

/**
 * POST /api/propresenter/sync-library/song  (appelé en interne après création/modif d'un chant)
 * Body: { songId, deviceId? }
 */
export async function PUT(request: NextRequest) {
  try {
    const { songId, deviceId } = await request.json().catch(() => ({}));
    if (!songId) return NextResponse.json({ ok: true }); // silently ignore

    const song = await prisma.song.findUnique({
      where: { id: songId },
      select: { id: true, title: true, lyrics: true, author: true, publisher: true, ccliNumber: true },
    });
    if (!song || !(song as any).lyrics?.trim()) return NextResponse.json({ ok: true });

    const device = deviceId
      ? await prisma.ppDevice.findFirst({ where: { id: deviceId } })
      : await prisma.ppDevice.findFirst({ where: { isDefault: true } });

    if (!device || !(device as any).agentOnline) return NextResponse.json({ ok: true });

    // Fire-and-forget — don't block the song save
    executeViaAgent(
      (device as any).id,
      "sync-library",
      { songs: [song], theme: null, slideUuid: null, libraryPath: null },
      30_000
    ).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
