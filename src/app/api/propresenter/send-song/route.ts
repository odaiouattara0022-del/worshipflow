import { NextRequest, NextResponse } from "next/server";
import { generateProFile } from "@/lib/propresenter/pro-file-generator";
import { getDeviceBaseUrl } from "@/lib/propresenter/device-url";
import { prisma } from "@/lib/db";

interface PPLibraryItem {
  uuid: string;
  name: string;
  index: number;
}

/**
 * POST /api/propresenter/send-song
 * Body: { songId: string, theme?: string, slideUuid?: string, deviceId?: string }
 *
 * Generates a .pro file and writes it to the target device's PP library folder.
 * If the device has a libraryPath configured, the file is written there.
 * Otherwise it falls back to the local PP_DATA_PATH.
 */
export async function POST(request: NextRequest) {
  try {
    const { songId, theme, slideUuid, deviceId, libraryPath: explicitLibPath } = await request.json();
    if (!songId) {
      return NextResponse.json({ error: "songId requis" }, { status: 400 });
    }

    const song = await prisma.song.findUnique({ where: { id: songId } });
    if (!song) {
      return NextResponse.json({ error: "Chant introuvable" }, { status: 404 });
    }
    if (!song.lyrics || song.lyrics.trim().length === 0) {
      return NextResponse.json(
        { error: "Ce chant n'a pas de paroles" },
        { status: 400 }
      );
    }

    // Get the target library path:
    // 1. Explicit libraryPath from frontend (user chose a specific library)
    // 2. Device's configured libraryPath
    // 3. Default device's libraryPath
    let targetLibPath: string | undefined = explicitLibPath || undefined;
    if (!targetLibPath) {
      if (deviceId) {
        const device = await prisma.pPDevice.findUnique({ where: { id: deviceId } });
        if (device?.libraryPath) {
          targetLibPath = device.libraryPath;
        }
      } else {
        // Use default device
        const defaultDevice = await prisma.pPDevice.findFirst({
          where: { isDefault: true },
        });
        if (defaultDevice?.libraryPath) {
          targetLibPath = defaultDevice.libraryPath;
        }
      }
    }

    const baseUrl = await getDeviceBaseUrl(deviceId);

    // Step 1: Generate the .pro file in the target library folder (with CCLI metadata)
    const result = await generateProFile(
      song.title,
      song.lyrics,
      theme || undefined,
      slideUuid || undefined,
      targetLibPath || undefined,
      {
        author: song.author || undefined,
        artistCredits: song.artistCredits || undefined,
        songTitle: song.title,
        publisher: song.publisher || undefined,
        copyrightYear: song.copyrightYear || undefined,
        songNumber: song.ccliNumber || undefined,
        display: song.copyrightDisplay,
        album: song.album || undefined,
      }
    );

    // Log usage for CCLI reporting
    await prisma.songUsageLog.create({
      data: { songId: song.id },
    });

    // Step 2: Wait for PP to detect the new file
    await new Promise((r) => setTimeout(r, 2000));

    // Step 3: Check if PP can see it in the library
    let matched = false;
    let libraryUuid: string | null = null;
    try {
      const libRes = await fetch(`${baseUrl}/v1/libraries`, {
        signal: AbortSignal.timeout(5000),
      });
      if (libRes.ok) {
        const libraries = (await libRes.json()) as Array<{
          uuid: string;
          name: string;
        }>;
        for (const lib of libraries) {
          const itemsRes = await fetch(`${baseUrl}/v1/library/${lib.uuid}`, {
            signal: AbortSignal.timeout(5000),
          });
          if (!itemsRes.ok) continue;
          const data = (await itemsRes.json()) as { items: PPLibraryItem[] };
          const found = (data.items ?? []).find(
            (item) => item.name.toLowerCase() === song.title.toLowerCase()
          );
          if (found) {
            matched = true;
            libraryUuid = found.uuid;
            break;
          }
        }
      }
    } catch {
      // PP not reachable for verification
    }

    return NextResponse.json({
      success: true,
      songTitle: song.title,
      slides: result.slides,
      path: result.path,
      theme: theme || null,
      matchedInLibrary: matched,
      libraryUuid,
      message: matched
        ? `« ${song.title} » envoyé à ProPresenter (${result.slides} slides)`
        : `« ${song.title} » généré (${result.slides} slides) — le fichier a été écrit dans ${result.path}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("send-song error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
