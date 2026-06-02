import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser() as any;
  if (!user || !["OWNER", "ADMIN"].includes(user.churchRole ?? ""))
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  await prisma.serviceRole.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser() as any;
  if (!user || !["OWNER", "ADMIN"].includes(user.churchRole ?? ""))
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { name, color } = await request.json();
  const role = await prisma.serviceRole.update({ where: { id }, data: { name: name?.trim(), color } });
  return NextResponse.json(role);
}
