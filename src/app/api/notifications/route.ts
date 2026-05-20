import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get("unread") === "true";

  const notifications = await prisma.notification.findMany({
    where: {
      userId: user.id,
      ...(unreadOnly ? { readAt: null } : {}),
    },
    orderBy: { sentAt: "desc" },
    take: 50,
  });

  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, readAt: null },
  });

  return NextResponse.json({ notifications, unreadCount });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userId, type, message, channel } = body;

  if (!userId || !type || !message) {
    return NextResponse.json(
      { error: "userId, type et message requis" },
      { status: 400 }
    );
  }

  const notification = await prisma.notification.create({
    data: { userId, type, message, channel: channel || "IN_APP" },
  });

  return NextResponse.json(notification, { status: 201 });
}
