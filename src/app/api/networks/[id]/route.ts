import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const network = await prisma.network.findUnique({
    where: { id },
    include: { churches: { include: { church: { select: { id: true, name: true, description: true, _count: { select: { members: true } } } } } } },
  });
  if (!network) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(network);
}

/** POST /api/networks/[id] — join a network */
export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser() as any;
  if (!user || !["OWNER", "ADMIN"].includes(user.churchRole ?? ""))
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const existing = await prisma.networkChurch.findFirst({ where: { networkId: id, churchId: user.churchId } });
  if (existing) return NextResponse.json(existing);

  const nc = await prisma.networkChurch.create({ data: { networkId: id, churchId: user.churchId, role: "MEMBER" } });
  return NextResponse.json(nc, { status: 201 });
}
