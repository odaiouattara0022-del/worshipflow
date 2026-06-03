import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { executeViaAgent, bridgeErrorResponse } from "@/lib/propresenter/bridge";
import { getDriver } from "@/lib/output/registry";

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

    const deviceType: string = (device as any).type ?? "propresenter";
    const driver = getDriver(deviceType);

    if (!driver.capabilities.liveControl) {
      return NextResponse.json(
        { error: "Contrôle live non supporté par ce logiciel" },
        { status: 400 }
      );
    }

    if (deviceType === "propresenter") {
      // ProPresenter: keep existing call exactly as today — zero behavior change
      const result = await executeViaAgent(
        (device as any).id,
        "control",
        { action, ...params },
        10_000
      );
      return NextResponse.json(result);
    } else {
      // FreeShow (and any future driver): route through driver
      let result: unknown;
      if (action === "next") {
        result = await driver.next((device as any).id);
      } else if (action === "previous") {
        result = await driver.previous((device as any).id);
      } else if (action === "clear" || action === "clearAll") {
        // UI sends the clear scope as `layer` (presentation/media); the driver
        // contract calls it `target`. Accept either so the live "Clear ..."
        // buttons map through to FreeShow instead of collapsing to clear_all.
        result = await driver.clear((device as any).id, params.target ?? params.layer);
      } else {
        return NextResponse.json(
          { error: `Action "${action}" non supportée par ce logiciel` },
          { status: 400 }
        );
      }
      return NextResponse.json(result);
    }
  } catch (err) {
    return bridgeErrorResponse(err);
  }
}
