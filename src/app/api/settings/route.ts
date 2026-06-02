import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, applyRateLimit } from "@/lib/security";

export async function GET() {
  try { await requireSession(); } catch (e) { return e as Response; }
  const settings = await prisma.appSettings.findMany();
  const map: Record<string, string> = {};
  for (const s of settings as any[]) {
    map[s.key] = s.value;
  }
  return NextResponse.json(map);
}

export async function PUT(request: NextRequest) {
  try { await requireSession(); } catch (e) { return e as Response; }
  const rl = applyRateLimit(request, "settings.update", 20, 60_000);
  if (rl) return rl;

  const body = await request.json();
  const entries = Object.entries(body) as [string, string][];

  for (const [key, value] of entries) {
    if (value === undefined || value === null) continue;

    const existing = await prisma.appSettings.findFirst({ where: { key } });
    if (existing) {
      await prisma.appSettings.update({
        where: { id: (existing as any).id },
        data: { value: String(value) },
      });
    } else {
      await prisma.appSettings.create({
        data: { key, value: String(value) },
      });
    }
  }

  const settings = await prisma.appSettings.findMany();
  const map: Record<string, string> = {};
  for (const s of settings as any[]) {
    map[s.key] = s.value;
  }
  return NextResponse.json(map);
}
