import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser() as any;
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const roles = await prisma.serviceRole.findMany({
    where: { churchId: user.churchId ?? "__none__" },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(roles);
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser() as any;
  if (!user || !["OWNER", "ADMIN"].includes(user.churchRole ?? ""))
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { name, color } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: "Nom requis" }, { status: 400 });

  const count = await prisma.serviceRole.count({ where: { churchId: user.churchId } });
  const role = await prisma.serviceRole.create({
    data: { name: name.trim(), color: color ?? "#6366f1", churchId: user.churchId, sortOrder: count },
  });
  return NextResponse.json(role, { status: 201 });
}
