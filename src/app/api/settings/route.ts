import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const settings = await prisma.appSettings.findMany();
  const map: Record<string, string> = {};
  for (const s of settings as any[]) {
    map[s.key] = s.value;
  }
  return NextResponse.json(map);
}

export async function PUT(request: NextRequest) {
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
