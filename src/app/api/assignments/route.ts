import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const serviceId = searchParams.get("serviceId");
  const userId = searchParams.get("userId");

  const where: Record<string, unknown> = {};
  if (serviceId) where.serviceId = serviceId;
  if (userId) where.userId = userId;

  const assignments = await prisma.teamAssignment.findMany({
    where,
    include: {
      user: { select: { id: true, name: true } },
      service: { select: { id: true, title: true, date: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(assignments);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { serviceId, userId, role } = body;

  if (!serviceId || !userId || !role) {
    return NextResponse.json(
      { error: "serviceId, userId et role sont requis" },
      { status: 400 }
    );
  }

  const assignment = await prisma.teamAssignment.create({
    data: {
      serviceId,
      userId,
      role,
    },
    include: {
      user: { select: { id: true, name: true } },
      service: { select: { id: true, title: true, date: true } },
    },
  });

  return NextResponse.json(assignment, { status: 201 });
}
