/**
 * GET /api/pp-bridge/poll
 *
 * Long-poll endpoint for the local agent.
 * The agent opens one request and the server HOLDS it open until either a
 * PENDING command appears (returned instantly) or HOLD_MS elapses. The agent
 * then immediately re-opens the request. This replaces tight 500ms polling:
 *   - command latency drops to ~one DB check (~100ms) instead of ~1s
 *   - an idle agent makes ~1 request per HOLD_MS instead of ~2 per second
 *
 * The TOTAL response time must stay safely under the agent's request timeout
 * (10s on already-deployed .exe agents) so an idle hold is never seen as a
 * network error. Each Supabase REST check adds latency on top of CHECK_MS, so
 * we budget conservatively: HOLD_MS=6s gives ~6-7.5s total in practice — well
 * under 10s — and the deadline is checked before each iteration to avoid a
 * trailing sleep overshooting the budget.
 *
 * Auth: Authorization: Bearer <agentToken>
 * Returns: { command: PPCommand } | { command: null }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveDevice } from "../_auth";

export const dynamic = "force-dynamic";
export const maxDuration = 30; // allow the held connection (harmless if plan caps lower)

const HOLD_MS = 6_000;   // total hold budget — kept well under the agent's 10s timeout
const CHECK_MS = 600;    // how often to re-check the queue while holding

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function findPending(deviceId: string) {
  return prisma.ppCommand.findFirst({
    where: {
      deviceId,
      status: "PENDING",
      expiresAt: { gt: new Date().toISOString() },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function GET(request: NextRequest) {
  const device = await resolveDevice(request);
  if (!device) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // Heartbeat — mark the agent online for this connection cycle
  await prisma.ppDevice.update({
    where: { id: device.id },
    data: {
      agentOnline: true,
      agentLastSeen: new Date().toISOString(),
    },
  });

  // Fast path: a command is already waiting
  let command = await findPending(device.id);
  if (command) return NextResponse.json({ command });

  // Hold the connection open, checking periodically, until a command arrives
  // or the budget runs out. Only start another check if enough budget remains
  // for the sleep, so a trailing iteration can't overshoot HOLD_MS.
  const deadline = Date.now() + HOLD_MS;
  while (deadline - Date.now() > CHECK_MS && !request.signal.aborted) {
    await sleep(CHECK_MS);
    command = await findPending(device.id);
    if (command) return NextResponse.json({ command });
  }

  return NextResponse.json({ command: null });
}
