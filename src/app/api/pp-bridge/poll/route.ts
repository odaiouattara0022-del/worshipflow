/**
 * GET /api/pp-bridge/poll
 *
 * Long-poll endpoint for the local agent.
 * The agent calls this every ~500 ms to fetch the next PENDING command.
 * Also updates agentOnline / agentLastSeen as a heartbeat.
 *
 * Auth: Authorization: Bearer <agentToken>
 * Returns: { command: PPCommand } | { command: null }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveDevice } from "../_auth";

export async function GET(request: NextRequest) {
  const device = await resolveDevice(request);
  if (!device) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // Heartbeat
  await prisma.ppDevice.update({
    where: { id: device.id },
    data: {
      agentOnline: true,
      agentLastSeen: new Date().toISOString(),
    },
  });

  // Fetch one PENDING command for this device, oldest first
  const command = await prisma.ppCommand.findFirst({
    where: {
      deviceId: device.id,
      status: "PENDING",
      expiresAt: { gt: new Date().toISOString() },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ command: command ?? null });
}
