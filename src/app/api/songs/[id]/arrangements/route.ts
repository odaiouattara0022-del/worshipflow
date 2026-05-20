import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const arrangements = await prisma.songArrangement.findMany({
    where: { songId: id },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(arrangements);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  const arrangement = await prisma.songArrangement.create({
    data: {
      songId: id,
      name: body.name || "Standard",
      key: body.key,
      sectionOrder: body.sectionOrder || "V1,C,V2,C",
      chords: body.chords || null,
      notes: body.notes || null,
    },
  });

  return NextResponse.json(arrangement, { status: 201 });
}
