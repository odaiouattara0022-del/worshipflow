import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { executeViaAgent, bridgeErrorResponse } from "@/lib/propresenter/bridge";

export async function GET(request: NextRequest) {
  const deviceId = request.nextUrl.searchParams.get("deviceId");

  const device = deviceId
    ? await prisma.ppDevice.findFirst({ where: { id: deviceId } })
    : await prisma.ppDevice.findFirst({ where: { isDefault: true } });

  if (!device) {
    return NextResponse.json({ playlists: [], error: "Aucun appareil configuré" });
  }

  try {
    const result = await executeViaAgent(
      (device as any).id,
      "playlists",
      {},
      8_000
    ) as any;

    return NextResponse.json({ playlists: result?.playlists ?? [] });
  } catch (err) {
    return bridgeErrorResponse(err);
  }
}
