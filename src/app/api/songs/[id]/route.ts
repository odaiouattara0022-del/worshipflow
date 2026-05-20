import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const song = await prisma.song.findUnique({
    where: { id },
    include: { arrangements: true, serviceItems: { include: { service: true }, take: 10, orderBy: { service: { date: "desc" } } } },
  });

  if (!song) {
    return NextResponse.json({ error: "Chant non trouvé" }, { status: 404 });
  }

  return NextResponse.json(song);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  const song = await prisma.song.update({
    where: { id },
    data: {
      title: body.title,
      author: body.author ?? undefined,
      lyrics: body.lyrics ?? undefined,
      defaultKey: body.defaultKey ?? undefined,
      tempo: body.tempo !== undefined ? (body.tempo ? parseInt(body.tempo) : null) : undefined,
      tags: body.tags ?? undefined,
      ccliNumber: body.ccliNumber ?? undefined,
      proPresenterPath: body.proPresenterPath ?? undefined,
    },
    include: { arrangements: true },
  });

  return NextResponse.json(song);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.song.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
