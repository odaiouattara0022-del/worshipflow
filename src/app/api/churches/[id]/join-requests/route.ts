import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/** GET /api/churches/[id]/join-requests — list pending requests (admin only) */
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser() as any;
  if (!user || user.churchId !== id || !["OWNER", "ADMIN"].includes(user.churchRole ?? ""))
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const requests = await prisma.joinRequest.findMany({
    where: { churchId: id, status: "PENDING" },
    include: {
      user: { select: { id: true, name: true, email: true, avatar: true } },
      messages: {
        include: { sender: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(requests);
}

/** POST /api/churches/[id]/join-requests — request to join a church */
export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser() as any;
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (user.churchId) return NextResponse.json({ error: "Vous appartenez déjà à une église" }, { status: 400 });

  const church = await prisma.church.findUnique({ where: { id } });
  if (!church) return NextResponse.json({ error: "Église introuvable" }, { status: 404 });

  const existing = await prisma.joinRequest.findUnique({ where: { churchId_userId: { churchId: id, userId: user.id } } });
  if (existing) return NextResponse.json(existing);

  const req = await prisma.joinRequest.create({
    data: { churchId: id, userId: user.id },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  // Notify church admins
  const admins = await prisma.user.findMany({
    where: { churchId: id, churchRole: { in: ["OWNER", "ADMIN"] } },
    select: { id: true },
  });
  if (admins.length > 0) {
    await prisma.notification.createMany({
      data: admins.map((a) => ({
        userId: a.id,
        type: "ASSIGNMENT",
        message: `${user.name} demande à rejoindre votre église`,
      })),
    });
  }

  return NextResponse.json(req, { status: 201 });
}
