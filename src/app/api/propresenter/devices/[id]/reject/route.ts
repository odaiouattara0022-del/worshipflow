import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/security";

/**
 * POST /api/propresenter/devices/:id/reject
 * Admin rejects a pending agent. Its token can no longer poll (resolveDevice only
 * returns 'active' devices). The row is kept so the same install isn't re-created
 * on its next announce — it simply stays rejected.
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
    data: { status: "rejected", agentOnline: false, updatedAt: new Date().toISOString() },
  });

  return NextResponse.json({ ok: true, status: "rejected" });
}
