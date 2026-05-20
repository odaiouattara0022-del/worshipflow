import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const service = await prisma.service.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: { order: "asc" },
        include: { song: true, arrangement: true, assignee: true },
      },
      assignments: { include: { user: { select: { id: true, name: true } } } },
      template: true,
    },
  });

  if (!service) {
    return NextResponse.json(
      { error: "Service non trouvé" },
      { status: 404 }
    );
  }

  return NextResponse.json(service);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const service = await prisma.service.update({
    where: { id },
    data: {
      title: body.title ?? undefined,
      date: body.date ? new Date(body.date) : undefined,
      type: body.type ?? undefined,
      status: body.status ?? undefined,
      notes: body.notes ?? undefined,
    },
    include: {
      items: { orderBy: { order: "asc" } },
      assignments: true,
      template: true,
    },
  });

  return NextResponse.json(service);
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.service.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
