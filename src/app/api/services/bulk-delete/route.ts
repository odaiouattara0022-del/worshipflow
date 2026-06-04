import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, applyRateLimit } from "@/lib/security";

/**
 * POST /api/services/bulk-delete  { ids: string[] }
 * Deletes several services in one request (one rate-limited call instead of N).
 */
export async function POST(request: NextRequest) {
  try { await requireSession(); } catch (e) { return e as Response; }

  const rl = applyRateLimit(request, "services.bulkDelete", 10, 60_000);
  if (rl) return rl;

  const { ids } = await request.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "Liste d'identifiants requise" }, { status: 400 });
  }

  const result = await prisma.service.deleteMany({ where: { id: { in: ids } } });
  return NextResponse.json({ success: true, count: result.count });
}
