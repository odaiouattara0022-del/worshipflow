import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser() as any;
  if (!user || !["OWNER", "ADMIN"].includes(user.churchRole ?? ""))
    return NextResponse.json({ error: "Seul un admin d'église peut créer un réseau" }, { status: 403 });

  const { name, description } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: "Nom requis" }, { status: 400 });

  const network = await prisma.network.create({ data: { name: name.trim(), description: description?.trim() || null } });

  // Add creator's church as founding member with ADMIN role
  await prisma.networkChurch.create({ data: { networkId: network.id, churchId: user.churchId, role: "ADMIN" } });

  return NextResponse.json(network, { status: 201 });
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const code = request.nextUrl.searchParams.get("code") ?? "";

  if (code) {
    const n = await prisma.network.findUnique({ where: { inviteCode: code }, include: { _count: { select: { churches: true } } } });
    return NextResponse.json(n ? [n] : []);
  }
  if (q.trim().length < 2) return NextResponse.json([]);

  const networks = await prisma.network.findMany({
    where: { name: { contains: q, mode: "insensitive" } },
    include: { _count: { select: { churches: true } } },
    take: 10,
  });
  return NextResponse.json(networks);
}
