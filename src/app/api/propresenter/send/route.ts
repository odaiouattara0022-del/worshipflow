import { NextRequest, NextResponse } from "next/server";
import { buildPlaylistManifest } from "@/lib/propresenter/playlist-writer";
import { generateProFile } from "@/lib/propresenter/pro-file-generator";
import { getDeviceBaseUrl } from "@/lib/propresenter/device-url";
import { prisma } from "@/lib/db";

interface PPPlaylist {
  id: { uuid: string; name: string; index: number };
  field_type: string;
  children: unknown[];
}

interface PPLibraryItem {
  uuid: string;
  name: string;
  index: number;
}

interface PPPlaylistItem {
  id: { name: string; uuid?: string };
  type: "header" | "presentation" | "placeholder";
  is_hidden?: boolean;
  is_pco?: boolean;
  destination?: string;
}

async function getLibraryMap(baseUrl: string): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const libRes = await fetch(`${baseUrl}/v1/libraries`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!libRes.ok) return map;
    const libraries = (await libRes.json()) as Array<{ uuid: string; name: string }>;
    for (const lib of libraries) {
      const itemsRes = await fetch(`${baseUrl}/v1/library/${lib.uuid}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!itemsRes.ok) continue;
      const data = (await itemsRes.json()) as { items: PPLibraryItem[] };
      for (const item of data.items ?? []) {
        map.set(item.name.toLowerCase(), item.uuid);
      }
    }
  } catch {
    // ignore
  }
  return map;
}

async function findOrCreatePlaylist(baseUrl: string, name: string): Promise<string | null> {
  try {
    const listRes = await fetch(`${baseUrl}/v1/playlists`, {
      signal: AbortSignal.timeout(5000),
    });
    if (listRes.ok) {
      const playlists = (await listRes.json()) as PPPlaylist[];
      const existing = playlists.find((p) => p.id.name === name);
      if (existing) return existing.id.uuid;
    }
  } catch { /* ignore */ }

  try {
    const createRes = await fetch(`${baseUrl}/v1/playlists`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
      signal: AbortSignal.timeout(5000),
    });
    if (!createRes.ok) return null;
    const listRes = await fetch(`${baseUrl}/v1/playlists`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!listRes.ok) return null;
    const playlists = (await listRes.json()) as PPPlaylist[];
    return playlists.find((p) => p.id.name === name)?.id.uuid ?? null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { serviceId, theme, slideUuid, deviceId, libraryPath: explicitLibPath } = await request.json();
    if (!serviceId) {
      return NextResponse.json({ error: "serviceId requis" }, { status: 400 });
    }

    const baseUrl = await getDeviceBaseUrl(deviceId);
    const manifest = await buildPlaylistManifest(serviceId);

    // Resolve target library path (same logic as send-song)
    let targetLibPath: string | undefined = explicitLibPath || undefined;
    if (!targetLibPath) {
      if (deviceId) {
        const device = await prisma.pPDevice.findUnique({ where: { id: deviceId } });
        if (device?.libraryPath) targetLibPath = device.libraryPath;
      } else {
        const defaultDevice = await prisma.pPDevice.findFirst({ where: { isDefault: true } });
        if (defaultDevice?.libraryPath) targetLibPath = defaultDevice.libraryPath;
      }
    }

    // Step 1: Generate .pro files for songs that have lyrics
    const generated: string[] = [];
    for (const item of manifest.items) {
      if (item.type === "song" && item.songTitle) {
        const song = await prisma.song.findFirst({
          where: { title: item.songTitle },
        });
        if (song && song.lyrics) {
          try {
            await generateProFile(
              song.title, song.lyrics, theme || undefined, slideUuid || undefined, targetLibPath,
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
            generated.push(song.title);

            // Log usage for CCLI reporting
            await prisma.songUsageLog.create({
              data: { songId: song.id, serviceId },
            });
          } catch (err) {
            console.error(`Failed to generate .pro for ${song.title}:`, err);
          }
        }
      }
    }

    // Step 2: Wait a moment for PP to detect new files, then refresh library map
    await new Promise((r) => setTimeout(r, 1000));
    const libraryMap = await getLibraryMap(baseUrl);

    // Step 3: Find or create the playlist
    const playlistUuid = await findOrCreatePlaylist(baseUrl, manifest.name);
    if (!playlistUuid) {
      return NextResponse.json(
        { error: "Impossible de créer la playlist dans ProPresenter", manifest },
        { status: 502 }
      );
    }

    // Step 4: Build playlist items
    const ppItems: PPPlaylistItem[] = [];
    const results: Array<{
      title: string;
      type: string;
      matched: boolean;
      ppType: string;
    }> = [];

    for (const item of manifest.items) {
      if (item.type === "song" && item.songTitle) {
        const matchedUuid = libraryMap.get(item.songTitle.toLowerCase());
        if (matchedUuid) {
          ppItems.push({
            id: { name: item.songTitle, uuid: matchedUuid },
            type: "presentation",
            is_hidden: false,
            is_pco: false,
            destination: "presentation",
          });
          results.push({ title: item.songTitle, type: "song", matched: true, ppType: "presentation" });
        } else {
          ppItems.push({
            id: { name: item.songTitle },
            type: "placeholder",
            is_hidden: false,
            is_pco: false,
            destination: "presentation",
          });
          results.push({ title: item.songTitle, type: "song", matched: false, ppType: "placeholder" });
        }
      } else {
        ppItems.push({
          id: { name: item.title },
          type: "header",
          is_hidden: false,
          is_pco: false,
          destination: "presentation",
        });
        results.push({ title: item.title, type: item.type, matched: false, ppType: "header" });
      }
    }

    // Step 5: PUT items into the playlist
    let itemsAdded = false;
    try {
      const putRes = await fetch(`${baseUrl}/v1/playlist/${playlistUuid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ppItems),
        signal: AbortSignal.timeout(5000),
      });
      itemsAdded = putRes.status === 204 || putRes.ok;
    } catch {
      itemsAdded = false;
    }

    const matchedCount = results.filter((r) => r.matched).length;
    const songCount = results.filter((r) => r.type === "song").length;

    return NextResponse.json({
      success: itemsAdded,
      playlistUuid,
      playlistName: manifest.name,
      totalItems: ppItems.length,
      songsMatched: matchedCount,
      songsTotal: songCount,
      generated,
      results,
      message: itemsAdded
        ? `Playlist mise à jour avec ${ppItems.length} éléments (${matchedCount}/${songCount} chants liés)`
        : "La playlist a été créée mais les éléments n'ont pas pu être ajoutés",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
