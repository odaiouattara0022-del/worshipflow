import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { executeViaAgent, bridgeErrorResponse } from "@/lib/propresenter/bridge";

/**
 * POST /api/propresenter/send-song
 * Body: { songId, theme?, slideUuid?, deviceId?, libraryPath? }
 *
 * Vercel: reads song from DB, passes data to agent.
 * Agent: generates .pro file locally, verifies in PP library.
 */
export async function POST(request: NextRequest) {
  try {
    const { songId, theme, slideUuid, deviceId, libraryPath: explicitLibPath, playlistId, playlistName } = await request.json();
    if (!songId) {
      return NextResponse.json({ error: "songId requis" }, { status: 400 });
    }

    const song = await prisma.song.findUnique({ where: { id: songId } });
    if (!song) {
      return NextResponse.json({ error: "Chant introuvable" }, { status: 404 });
    }
    if (!song.lyrics || (song.lyrics as string).trim().length === 0) {
      return NextResponse.json({ error: "Ce chant n'a pas de paroles" }, { status: 400 });
    }

    // Resolve library path from device config
    let libraryPath: string | null = explicitLibPath ?? null;
    if (!libraryPath) {
      const device = deviceId
        ? await prisma.ppDevice.findFirst({ where: { id: deviceId } })
        : await prisma.ppDevice.findFirst({ where: { isDefault: true } });
      libraryPath = (device as any)?.libraryPath ?? null;
    }

    // Resolve deviceId
    const resolvedDeviceId = deviceId ?? (
      await prisma.ppDevice.findFirst({ where: { isDefault: true } })
        .then((d: any) => d?.id ?? null)
    );

    if (!resolvedDeviceId) {
      return NextResponse.json({ error: "Aucun appareil configuré" }, { status: 404 });
    }

    const result = await executeViaAgent(
      resolvedDeviceId,
      "send-song",
      {
        song: {
          id: song.id,
          title: song.title,
          lyrics: song.lyrics,
          author: (song as any).author ?? null,
          artistCredits: (song as any).artistCredits ?? null,
          publisher: (song as any).publisher ?? null,
          copyrightYear: (song as any).copyrightYear ?? null,
          ccliNumber: (song as any).ccliNumber ?? null,
          copyrightDisplay: (song as any).copyrightDisplay ?? null,
          album: (song as any).album ?? null,
        },
        theme: theme ?? null,
        slideUuid: slideUuid ?? null,
        libraryPath,
        playlistId: playlistId ?? null,
        playlistName: playlistName ?? null,
      },
      20_000
    ) as any;

    // Log usage (fire-and-forget)
    prisma.songUsageLog.create({ data: { songId: song.id } }).catch(() => {});

    return NextResponse.json(result);
  } catch (err) {
    return bridgeErrorResponse(err);
  }
}
