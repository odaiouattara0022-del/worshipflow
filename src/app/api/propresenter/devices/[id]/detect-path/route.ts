import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { executeViaAgent, bridgeErrorResponse } from "@/lib/propresenter/bridge";

/**
 * POST /api/propresenter/devices/:id/detect-path
 * Asks the local agent to detect the ProPresenter library path.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const device = await prisma.ppDevice.findFirst({ where: { id } });
  if (!device) {
    return NextResponse.json({ error: "Appareil introuvable" }, { status: 404 });
  }

  try {
    const result = await executeViaAgent(
      id,
      "detect-path",
      { host: (device as any).host, name: (device as any).name },
      15_000
    ) as any;

    // If agent found a path, persist it to DB
    if (result?.found && result?.path) {
      await prisma.ppDevice.update({
        where: { id },
        data: { libraryPath: result.path },
      });
    }

    return NextResponse.json(result);
  } catch (err) {
    return bridgeErrorResponse(err);
  }
}
