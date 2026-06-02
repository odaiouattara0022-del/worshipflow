import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/** GET /api/churches/[id]/availability?weeks=4 — team availability overview */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser() as any;
  if (!user || user.churchId !== id) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const weeks = parseInt(request.nextUrl.searchParams.get("weeks") ?? "4");

  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + weeks * 7);

  const [members, availabilities, services] = await Promise.all([
    prisma.user.findMany({
      where: { churchId: id },
      select: { id: true, name: true, instruments: true, churchRole: true },
    }),
    prisma.availability.findMany({
      where: {
        userId: { in: [] }, // will re-fetch below
        date: { gte: now.toISOString() },
      },
    }),
    prisma.service.findMany({
      where: { churchId: id, date: { gte: now.toISOString() } },
      select: { id: true, title: true, date: true },
      orderBy: { date: "asc" },
      take: weeks * 3,
    }),
  ]);

  const memberIds = (members as any[]).map((m: any) => m.id);
  const avails = memberIds.length > 0 ? await prisma.availability.findMany({
    where: { userId: { in: memberIds }, date: { gte: now.toISOString() } },
    select: { userId: true, date: true, available: true, reason: true },
  }) : [];

  return NextResponse.json({ members, availabilities: avails, services });
}
