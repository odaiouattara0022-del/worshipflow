/**
 * POST /api/pp-bridge/result
 *
 * Agent posts the result (or error) of a completed command.
 *
 * Auth: Authorization: Bearer <agentToken>
 * Body: { commandId: string, result?: unknown, error?: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveDevice } from "../_auth";

export async function POST(request: NextRequest) {
  const device = await resolveDevice(request);
  if (!device) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { commandId, result, error } = await request.json();
  if (!commandId) {
    return NextResponse.json({ error: "commandId requis" }, { status: 400 });
  }

  const command = await prisma.ppCommand.findFirst({ where: { id: commandId } });
  if (!command || (command as any).deviceId !== device.id) {
    return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  }

  await prisma.ppCommand.update({
    where: { id: commandId },
    data: {
      status: error ? "ERROR" : "DONE",
      result: result !== undefined ? JSON.stringify(result) : null,
      error: error ?? null,
      updatedAt: new Date().toISOString(),
    },
  });

  return NextResponse.json({ ok: true });
}
