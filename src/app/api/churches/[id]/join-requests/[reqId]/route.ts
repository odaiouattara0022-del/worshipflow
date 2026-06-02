import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/** PUT /api/churches/[id]/join-requests/[reqId] — approve or reject */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string; reqId: string }> }) {
  const { id, reqId } = await params;
  const user = await getCurrentUser() as any;
  if (!user || user.churchId !== id || !["OWNER", "ADMIN"].includes(user.churchRole ?? ""))
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { action } = await request.json(); // "approve" | "reject"
  if (!["approve", "reject"].includes(action))
    return NextResponse.json({ error: "Action invalide" }, { status: 400 });

  const joinReq = await prisma.joinRequest.findUnique({ where: { id: reqId }, include: { user: true } });
  if (!joinReq || joinReq.churchId !== id) return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });

  const status = action === "approve" ? "APPROVED" : "REJECTED";
  await prisma.joinRequest.update({ where: { id: reqId }, data: { status } });

  if (action === "approve") {
    await prisma.user.update({ where: { id: joinReq.userId }, data: { churchId: id, churchRole: "MEMBER" } });
    await prisma.notification.create({
      data: { userId: joinReq.userId, type: "ASSIGNMENT", message: `Votre demande a été acceptée — bienvenue dans ${(await prisma.church.findUnique({ where: { id }, select: { name: true } }))?.name ?? "l'église"} !` },
    });
  } else {
    await prisma.notification.create({
      data: { userId: joinReq.userId, type: "ASSIGNMENT", message: "Votre demande d'adhésion n'a pas été acceptée." },
    });
  }

  return NextResponse.json({ ok: true, status });
}
