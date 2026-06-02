import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { executeViaAgent, bridgeErrorResponse } from "@/lib/propresenter/bridge";

/**
 * GET /api/propresenter/libraries?deviceId=xxx
 * Lists available PP library folders — delegated to the local agent.
 */
export async function GET(request: NextRequest) {
  const deviceId = request.nextUrl.searchParams.get("deviceId");

  const device = deviceId
    ? await prisma.ppDevice.findFirst({ where: { id: deviceId } })
    : await prisma.ppDevice.findFirst({ where: { isDefault: true } });

  if (!device) {
    return NextResponse.json({ libraries: [], message: "Aucun appareil configuré" });
  }

  try {
    const result = await executeViaAgent(
      (device as any).id,
      "libraries",
      { libraryPath: (device as any).libraryPath ?? null }
    );
    return NextResponse.json(result);
  } catch (err) {
    return bridgeErrorResponse(err);
  }
}
