import { NextRequest, NextResponse } from "next/server";
import { buildPlaylistManifest } from "@/lib/propresenter/playlist-writer";
import { prisma } from "@/lib/db";
import { executeViaAgent, bridgeErrorResponse } from "@/lib/propresenter/bridge";

/**
 * POST /api/propresenter/send
 * Body: { serviceId, theme?, slideUuid?, deviceId?, libraryPath? }
 *
 * Vercel: reads service + song data from DB, passes everything to agent.
 * Agent: generates .pro files, creates/updates playlist in PP.
 */
export async function POST(request: NextRequest) {
  try {
    const { serviceId, theme, slideUuid, deviceId, libraryPath: explicitLibPath, playlistId, playlistName } = await request.json();
    if (!serviceId) {
      return NextResponse.json({ error: "serviceId requis" }, { status: 400 });
    }

    // Build manifest (DB read — stays on Vercel)
    const manifest = await buildPlaylistManifest(serviceId);

    // Collect song data for items that need .pro generation
    const songTitles = manifest.items
      .filter((i) => i.type === "song" && i.songTitle)
      .map((i) => i.songTitle as string);

    const dbSongs = await prisma.song.findMany({
      where: { title: { in: songTitles } },
    });

    const songs = (dbSongs as any[])
      .filter((s: any) => s.lyrics?.trim())
      .map((s: any) => ({
        id: s.id,
        title: s.title,
        lyrics: s.lyrics,
        author: s.author ?? null,
        artistCredits: s.artistCredits ?? null,
        publisher: s.publisher ?? null,
        copyrightYear: s.copyrightYear ?? null,
        ccliNumber: s.ccliNumber ?? null,
        copyrightDisplay: s.copyrightDisplay ?? null,
        album: s.album ?? null,
      }));

    // Resolve device
    const device = deviceId
      ? await prisma.ppDevice.findFirst({ where: { id: deviceId } })
      : await prisma.ppDevice.findFirst({ where: { isDefault: true } });

    if (!device) {
      return NextResponse.json({ error: "Aucun appareil configuré" }, { status: 404 });
    }

    const libraryPath = explicitLibPath ?? (device as any).libraryPath ?? null;

    const result = await executeViaAgent(
      (device as any).id,
      "send-service",
      { manifest, songs, theme: theme ?? null, slideUuid: slideUuid ?? null, libraryPath, playlistId: playlistId ?? null, playlistName: playlistName ?? null },
      30_000
    ) as any;

    // Log usage for songs that were generated
    const generated: string[] = result?.generated ?? [];
    for (const title of generated) {
      const matched = (dbSongs as any[]).find((s: any) => s.title === title);
      if (matched) {
        prisma.songUsageLog
          .create({ data: { songId: matched.id, serviceId } })
          .catch(() => {});
      }
    }

    return NextResponse.json(result);
  } catch (err) {
    return bridgeErrorResponse(err);
  }
}
