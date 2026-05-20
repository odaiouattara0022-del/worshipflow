import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const items = await prisma.serviceItem.findMany({
    where: { serviceId: id },
    include: { song: true, arrangement: true, assignee: true },
    orderBy: { order: "asc" },
  });

  return NextResponse.json(items);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { type, title, duration, songId, arrangementId, notes, assigneeId } = body;

  if (!type || !title) {
    return NextResponse.json(
      { error: "Le type et le titre sont requis" },
      { status: 400 }
    );
  }

  // Auto-calculate order: max + 1
  const maxOrder = await prisma.serviceItem.aggregate({
    where: { serviceId: id },
    _max: { order: true },
  });
  const nextOrder = (maxOrder._max.order ?? 0) + 1;

  const item = await prisma.serviceItem.create({
    data: {
      serviceId: id,
      type,
      title,
      order: nextOrder,
      duration: duration ?? 5,
      songId: songId || null,
      arrangementId: arrangementId || null,
      notes: notes || null,
      assigneeId: assigneeId || null,
    },
    include: { song: true, arrangement: true, assignee: true },
  });

  return NextResponse.json(item, { status: 201 });
}
