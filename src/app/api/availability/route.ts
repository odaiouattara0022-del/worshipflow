import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const month = searchParams.get("month"); // format: "2026-05"

  const where: Record<string, unknown> = {};
  if (userId) where.userId = userId;
  if (month) {
    const [year, m] = month.split("-").map(Number);
    const start = new Date(year, m - 1, 1);
    const end = new Date(year, m, 1);
    where.date = { gte: start, lt: end };
  }

  const availability = await prisma.availability.findMany({
    where,
    include: {
      user: { select: { id: true, name: true } },
    },
    orderBy: { date: "asc" },
  });

  return NextResponse.json(availability);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userId, date, available, reason } = body;

  if (!userId || !date) {
    return NextResponse.json(
      { error: "userId et date sont requis" },
      { status: 400 }
    );
  }

  const parsedDate = new Date(date);
  // Normalize to start of day
  parsedDate.setHours(0, 0, 0, 0);

  const availability = await prisma.availability.upsert({
    where: {
      userId_date: {
        userId,
        date: parsedDate,
      },
    },
    update: {
      available: available ?? true,
      reason: reason || null,
    },
    create: {
      userId,
      date: parsedDate,
      available: available ?? true,
      reason: reason || null,
    },
    include: {
      user: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(availability);
}
