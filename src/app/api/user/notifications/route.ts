import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser() as any;
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  return NextResponse.json({
    notifChannels: user.notifChannels ?? "IN_APP",
    notifEvents: user.notifEvents ?? "ASSIGNMENT,REMINDER",
  });
}

export async function PUT(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { notifChannels, notifEvents } = await request.json();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      notifChannels: notifChannels ?? undefined,
      notifEvents: notifEvents ?? undefined,
    },
  });
  return NextResponse.json({ ok: true });
}
