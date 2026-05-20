import { NextRequest, NextResponse } from "next/server";
import { buildPlaylistManifest } from "@/lib/propresenter/playlist-writer";

const PP_HOST = process.env.PP_API_HOST || "127.0.0.1";
const PP_PORT = process.env.PP_API_PORT || "1025";

function ppUrl(path: string) {
  return `http://${PP_HOST}:${PP_PORT}${path}`;
}

export async function POST(request: NextRequest) {
  try {
    const { serviceId } = await request.json();
    if (!serviceId) {
      return NextResponse.json(
        { error: "serviceId requis" },
        { status: 400 }
      );
    }

    const manifest = await buildPlaylistManifest(serviceId);

    // Attempt to create/update a playlist in ProPresenter
    const results: Array<{ title: string; success: boolean; error?: string }> = [];

    // Try creating a playlist via PP REST API
    let playlistCreated = false;
    try {
      const createRes = await fetch(ppUrl("/v1/playlists"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: manifest.name }),
        signal: AbortSignal.timeout(5000),
      });
      playlistCreated = createRes.ok;
    } catch {
      // PP may not support playlist creation via API — that's OK
      playlistCreated = false;
    }

    // For each song item with a PP path, try to trigger/add it
    for (const item of manifest.items) {
      if (item.type === "song" && item.proPresenterPath) {
        try {
          const triggerRes = await fetch(
            ppUrl(`/v1/presentation/${encodeURIComponent(item.proPresenterPath)}/0/trigger`),
            { signal: AbortSignal.timeout(3000) }
          );
          results.push({
            title: item.title,
            success: triggerRes.ok,
          });
        } catch (err) {
          results.push({
            title: item.title,
            success: false,
            error: err instanceof Error ? err.message : "Erreur de connexion",
          });
        }
      } else {
        results.push({
          title: item.title,
          success: true, // Headers/media don't need PP action
        });
      }
    }

    return NextResponse.json({
      manifest,
      playlistCreated,
      results,
      totalItems: manifest.items.length,
      songsSent: results.filter((r) => r.success).length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
