import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { itemId } = await params;
  const body = await request.json();

  const item = await prisma.serviceItem.update({
    where: { id: itemId },
    data: {
      type: body.type ?? undefined,
      title: body.title ?? undefined,
      order: body.order ?? undefined,
      duration: body.duration ?? undefined,
      songId: body.songId ?? undefined,
      arrangementId: body.arrangementId ?? undefined,
      notes: body.notes ?? undefined,
      assigneeId: body.assigneeId ?? undefined,
    },
    include: { song: true, arrangement: true, assignee: true },
  });

  return NextResponse.json(item);
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { itemId } = await params;
  await prisma.serviceItem.delete({ where: { id: itemId } });
  return NextResponse.json({ success: true });
}
