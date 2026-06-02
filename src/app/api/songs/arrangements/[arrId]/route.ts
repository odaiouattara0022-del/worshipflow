import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ arrId: string }> }) {
  const { arrId } = await params;
  const body = await request.json();
  const arr = await prisma.songArrangement.update({
    where: { id: arrId },
    data: {
      key: body.key ?? undefined,
      chords: body.chords ?? undefined,
      name: body.name ?? undefined,
      notes: body.notes ?? undefined,
    },
  });
  return NextResponse.json(arr);
}
