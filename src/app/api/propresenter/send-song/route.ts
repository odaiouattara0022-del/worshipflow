import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { executeViaAgent, bridgeErrorResponse } from "@/lib/propresenter/bridge";
import { getDriver } from "@/lib/output/registry";
import { generateShow } from "@/lib/freeshow/show-generator";

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

    // Resolve device (full object needed for type and libraryPath)
    const device = deviceId
      ? await prisma.ppDevice.findFirst({ where: { id: deviceId } })
      : await prisma.ppDevice.findFirst({ where: { isDefault: true } });

    if (!device) {
      return NextResponse.json({ error: "Aucun appareil configuré" }, { status: 404 });
    }

    const deviceType: string = (device as any).type ?? "propresenter";
    const driver = getDriver(deviceType);

    if (!driver.capabilities.sendSong) {
      return NextResponse.json(
        { error: "Envoi de chant non supporté" },
        { status: 400 }
      );
    }

    if (deviceType === "propresenter") {
      // ProPresenter: keep existing logic exactly as today — zero behavior change
      // Resolve library path from device config
      const libraryPath: string | null = explicitLibPath ?? (device as any)?.libraryPath ?? null;

      const result = await executeViaAgent(
        (device as any).id,
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
    } else {
      const meta = {
        author: (song as any).author ?? null,
        artist: (song as any).artistCredits ?? null,
        publisher: (song as any).publisher ?? null,
        ccli: (song as any).ccliNumber ?? null,
        year: (song as any).copyrightYear ?? null,
      };
      // FreeShow receives a generated .show built from the lyrics. OpenLP (and
      // other search-based backends) can't take arbitrary lyrics — they receive a
      // generic payload and the agent driver looks the song up by title.
      const payload =
        deviceType === "freeshow"
          ? generateShow({ title: song.title as string, lyrics: song.lyrics as string, meta })
          : { title: song.title as string, lyrics: song.lyrics as string, meta };
      await driver.sendSong((device as any).id, payload);

      // Log usage (fire-and-forget)
      prisma.songUsageLog.create({ data: { songId: song.id } }).catch(() => {});

      return NextResponse.json({
        success: true,
        sent: song.title,
        message: `Chant « ${song.title} » envoyé`,
      });
    }
  } catch (err) {
    return bridgeErrorResponse(err);
  }
}
