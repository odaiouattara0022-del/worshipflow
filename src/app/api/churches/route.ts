import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/** GET /api/churches — search churches by name or inviteCode */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const code = request.nextUrl.searchParams.get("code") ?? "";

  if (code) {
    const church = await prisma.church.findUnique({
      where: { inviteCode: code },
      select: { id: true, name: true, description: true, _count: { select: { members: true } } },
    });
    return NextResponse.json(church ? [church] : []);
  }

  if (q.trim().length < 2) return NextResponse.json([]);

  const churches = await prisma.church.findMany({
    where: { name: { contains: q, mode: "insensitive" } },
    select: { id: true, name: true, description: true, _count: { select: { members: true } } },
    take: 10,
  });
  return NextResponse.json(churches);
}

/** POST /api/churches — create a new church (current user becomes OWNER) */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if ((user as any).churchId) return NextResponse.json({ error: "Vous appartenez déjà à une église" }, { status: 400 });

  const { name, description } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: "Le nom est requis" }, { status: 400 });

  const church = await prisma.church.create({ data: { name: name.trim(), description: description?.trim() || null } });

  await prisma.user.update({
    where: { id: user.id },
    data: { churchId: church.id, churchRole: "OWNER" },
  });

  return NextResponse.json(church, { status: 201 });
}
