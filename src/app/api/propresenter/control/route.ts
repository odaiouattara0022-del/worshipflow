import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { executeViaAgent, bridgeErrorResponse } from "@/lib/propresenter/bridge";

/**
 * POST /api/propresenter/control
 * Body: { action, deviceId?, ...params }
 *
 * Supported actions:
 * next, previous, trigger, triggerPlaylist, clear, clearAll,
 * status, activePresentation, focusedPresentation, playlists,
 * playlistItems, thumbnail
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, deviceId, ...params } = body;

    if (!action) {
      return NextResponse.json({ error: "action requis" }, { status: 400 });
    }

    // Resolve device
    const device = deviceId
      ? await prisma.ppDevice.findFirst({ where: { id: deviceId } })
      : await prisma.ppDevice.findFirst({ where: { isDefault: true } });

    if (!device) {
      return NextResponse.json({ error: "Aucun appareil configuré" }, { status: 404 });
    }

    const result = await executeViaAgent(
      (device as any).id,
      "control",
      { action, ...params },
      10_000
    );

    return NextResponse.json(result);
  } catch (err) {
    return bridgeErrorResponse(err);
  }
}
