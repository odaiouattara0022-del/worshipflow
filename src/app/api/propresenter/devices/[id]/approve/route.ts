import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/security";

/**
 * POST /api/propresenter/devices/:id/approve
 * Admin approves a pending agent. The device becomes 'active', so its agentToken
 * starts working on /poll and it can receive commands.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try { await requireSession(); } catch (e) { return e as Response; }

  const { id } = await params;
  const device = await prisma.ppDevice.findFirst({ where: { id } });
  if (!device) {
    return NextResponse.json({ error: "Appareil introuvable" }, { status: 404 });
  }

  await prisma.ppDevice.update({
    where: { id },
    data: { status: "active", updatedAt: new Date().toISOString() },
  });

  return NextResponse.json({ ok: true, status: "active" });
}
