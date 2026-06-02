/**
 * GET /api/pp-bridge/status?deviceId=<id>
 *
 * Used by the ProSendWorship UI to check whether the local agent is online.
 * No auth required — public status check.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const deviceId = request.nextUrl.searchParams.get("deviceId");
  if (!deviceId) {
    return NextResponse.json({ error: "deviceId requis" }, { status: 400 });
  }

  const device = await prisma.ppDevice.findFirst({ where: { id: deviceId } });
  if (!device) {
    return NextResponse.json({ error: "Appareil introuvable" }, { status: 404 });
  }

  const agentLastSeen = (device as any).agentLastSeen
    ? new Date((device as any).agentLastSeen).getTime()
    : 0;
  const online = !!(device as any).agentOnline && Date.now() - agentLastSeen < 20_000;

  return NextResponse.json({
    online,
    lastSeen: (device as any).agentLastSeen ?? null,
  });
}
