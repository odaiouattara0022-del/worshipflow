/**
 * POST /api/pp-bridge/announce
 *
 * Zero-config pairing. The local agent introduces itself with a self-generated
 * installId plus what it auto-detected (software type, FreeShow port/Shows path,
 * hostname). No admin auth — this is the device knocking; an admin approves it in
 * the app afterwards.
 *
 * Body: { installId, hostname?, type?, detected?: { freeShowPort?, freeShowShowsPath? } }
 * Returns: { status: 'pending' | 'active' | 'rejected', agentToken? }
 *   - unknown installId  → creates a 'pending' device, returns { status: 'pending' }
 *   - known installId    → returns its status; agentToken ONLY when 'active'
 */

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { applyRateLimit } from "@/lib/security";
import { newPendingDevice, announceResponse, type AnnounceInput } from "@/lib/output/pairing";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const limited = applyRateLimit(request, "pp-announce", 60, 60_000);
  if (limited) return limited;

  let body: AnnounceInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  if (!body?.installId || typeof body.installId !== "string") {
    return NextResponse.json({ error: "installId requis" }, { status: 400 });
  }

  const existing = await prisma.ppDevice.findFirst({ where: { installId: body.installId } });

  if (!existing) {
    const data = newPendingDevice(body, randomUUID());
    await prisma.ppDevice.create({ data });
    return NextResponse.json({ status: "pending" });
  }

  // Known install: heartbeat + return current status (token only once approved).
  await prisma.ppDevice.update({
    where: { id: (existing as any).id },
    data: { agentLastSeen: new Date().toISOString(), hostname: (body.hostname ?? "").trim() || (existing as any).hostname || null },
  });

  return NextResponse.json(announceResponse(existing as any));
}
