import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/**
 * PUT /api/churches/[id]/members/[userId]  { churchRole: "ADMIN" | "MEMBER" }
 * The church OWNER promotes/demotes a member. The OWNER can't be changed here,
 * and you can't change your own role.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const { id, userId } = await params;
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if ((me as any).churchId !== id || (me as any).churchRole !== "OWNER") {
    return NextResponse.json({ error: "Seul le propriétaire de l'église peut changer les rôles" }, { status: 403 });
  }

  const { churchRole } = await request.json();
  if (!["ADMIN", "MEMBER"].includes(churchRole)) {
    return NextResponse.json({ error: "Rôle invalide" }, { status: 400 });
  }

  const target = await prisma.user.findFirst({ where: { id: userId } });
  if (!target || (target as any).churchId !== id) {
    return NextResponse.json({ error: "Membre introuvable dans cette église" }, { status: 404 });
  }
  if (target.id === me.id) {
    return NextResponse.json({ error: "Vous ne pouvez pas changer votre propre rôle" }, { status: 400 });
  }
  if ((target as any).churchRole === "OWNER") {
    return NextResponse.json({ error: "Le rôle du propriétaire ne peut pas être modifié" }, { status: 400 });
  }

  await prisma.user.update({ where: { id: userId }, data: { churchRole } });
  return NextResponse.json({ ok: true, churchRole });
}
