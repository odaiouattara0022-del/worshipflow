/**
 * POST /api/pp-bridge/ack
 *
 * Agent acknowledges receipt of a command, moving it to RUNNING.
 * This lets Vercel know the agent is processing it (not just pending).
 *
 * Auth: Authorization: Bearer <agentToken>
 * Body: { commandId: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveDevice } from "../_auth";

export async function POST(request: NextRequest) {
  const device = await resolveDevice(request);
  if (!device) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { commandId } = await request.json();
  if (!commandId) {
    return NextResponse.json({ error: "commandId requis" }, { status: 400 });
  }

  const command = await prisma.ppCommand.findFirst({ where: { id: commandId } });
  if (!command || (command as any).deviceId !== device.id) {
    return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  }

  await prisma.ppCommand.update({
    where: { id: commandId },
    data: { status: "RUNNING", updatedAt: new Date().toISOString() },
  });

  return NextResponse.json({ ok: true });
}
