import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(null);

  const req = await prisma.joinRequest.findFirst({
    where: { userId: user.id, status: "PENDING" },
    include: {
      messages: {
        include: { sender: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  return NextResponse.json(req);
}
