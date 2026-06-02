/**
 * POST /api/pp-bridge/register
 *
 * Called by pp-agent.exe on first run (or re-registration).
 * Body: { deviceId: string, setupKey: string }
 *
 * setupKey is the one-time key shown in the ProSendWorship UI when adding a device.
 * On success, returns { agentToken } which the agent saves locally and uses on
 * every subsequent request via Authorization: Bearer <token>.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { deviceId, setupKey } = await request.json();

    if (!deviceId || !setupKey) {
      return NextResponse.json(
        { error: "deviceId et setupKey sont requis" },
        { status: 400 }
      );
    }

    const device = await prisma.ppDevice.findFirst({ where: { id: deviceId } });
    if (!device) {
      return NextResponse.json({ error: "Appareil introuvable" }, { status: 404 });
    }

    // First registration: setupKey must equal deviceId (shown to admin in UI).
    // Re-registration (e.g. after a reset): setupKey must match the current agentToken.
    const storedKey: string | null = (device as any).agentToken ?? null;
    const validKey = storedKey ? storedKey === setupKey : setupKey === deviceId;
    if (!validKey) {
      return NextResponse.json({ error: "Clé d'installation invalide" }, { status: 401 });
    }

    const agentToken = randomUUID();

    await prisma.ppDevice.update({
      where: { id: deviceId },
      data: {
        agentToken,
        agentOnline: true,
        agentLastSeen: new Date().toISOString(),
      },
    });

    return NextResponse.json({ agentToken });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
