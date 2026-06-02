import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser() as any;
  if (!user || user.churchId !== id || !["OWNER", "ADMIN"].includes(user.churchRole ?? ""))
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const [totalMembers, totalServices, servicesThisYear, upcomingServices, members] = await Promise.all([
    prisma.user.count({ where: { churchId: id } }),
    prisma.service.count({ where: { churchId: id } }),
    prisma.service.count({ where: { churchId: id, date: { gte: yearStart.toISOString() } } }),
    prisma.service.count({ where: { churchId: id, date: { gte: now.toISOString() } } }),
    prisma.user.findMany({
      where: { churchId: id },
      select: { id: true, name: true, churchRole: true, onboardingCompleted: true },
    }),
  ]);

  const onboardingDone = (members as any[]).filter((m: any) => m.onboardingCompleted).length;

  return NextResponse.json({
    totalMembers,
    totalServices,
    servicesThisYear,
    upcomingServices,
    onboardingRate: totalMembers ? Math.round((onboardingDone / totalMembers) * 100) : 0,
    members,
  });
}
