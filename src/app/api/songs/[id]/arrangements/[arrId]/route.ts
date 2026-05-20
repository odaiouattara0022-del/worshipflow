import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string; arrId: string }> }) {
  const { arrId } = await params;
  const body = await request.json();

  const arrangement = await prisma.songArrangement.update({
    where: { id: arrId },
    data: {
      name: body.name ?? undefined,
      key: body.key ?? undefined,
      sectionOrder: body.sectionOrder ?? undefined,
      chords: body.chords ?? undefined,
      notes: body.notes ?? undefined,
    },
  });

  return NextResponse.json(arrangement);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string; arrId: string }> }) {
  const { arrId } = await params;
  await prisma.songArrangement.delete({ where: { id: arrId } });
  return NextResponse.json({ success: true });
}
