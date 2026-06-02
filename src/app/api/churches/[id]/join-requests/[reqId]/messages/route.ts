import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/** GET — messages for a join request */
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string; reqId: string }> }) {
  const { id, reqId } = await params;
  const user = await getCurrentUser() as any;
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const req = await prisma.joinRequest.findUnique({ where: { id: reqId } });
  if (!req || req.churchId !== id) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  // Only the requester or a church admin can read
  const isAdmin = user.churchId === id && ["OWNER", "ADMIN"].includes(user.churchRole ?? "");
  const isRequester = req.userId === user.id;
  if (!isAdmin && !isRequester) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const messages = await prisma.joinRequestMessage.findMany({
    where: { joinRequestId: reqId },
    include: { sender: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(messages);
}

/** POST — send a message */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; reqId: string }> }) {
  const { id, reqId } = await params;
  const user = await getCurrentUser() as any;
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const req = await prisma.joinRequest.findUnique({ where: { id: reqId } });
  if (!req || req.churchId !== id) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const isAdmin = user.churchId === id && ["OWNER", "ADMIN"].includes(user.churchRole ?? "");
  const isRequester = req.userId === user.id;
  if (!isAdmin && !isRequester) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { content } = await request.json();
  if (!content?.trim()) return NextResponse.json({ error: "Message vide" }, { status: 400 });

  const msg = await prisma.joinRequestMessage.create({
    data: { joinRequestId: reqId, senderId: user.id, content: content.trim() },
    include: { sender: { select: { id: true, name: true } } },
  });

  // Notify the other party
  const notifyUserId = isAdmin ? req.userId : (
    (await prisma.user.findFirst({ where: { churchId: id, churchRole: { in: ["OWNER", "ADMIN"] } }, select: { id: true } }))?.id
  );
  if (notifyUserId) {
    await prisma.notification.create({
      data: { userId: notifyUserId, type: "ASSIGNMENT", message: `${user.name} vous a envoyé un message concernant une demande d'adhésion` },
    });
  }

  return NextResponse.json(msg, { status: 201 });
}
