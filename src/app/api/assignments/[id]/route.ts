import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const data: Record<string, unknown> = {};
  if (body.status !== undefined) data.status = body.status;
  if (body.role !== undefined) data.role = body.role;

  const assignment = await prisma.teamAssignment.update({
    where: { id },
    data,
    include: {
      user: { select: { id: true, name: true } },
      service: { select: { id: true, title: true, date: true } },
    },
  });

  return NextResponse.json(assignment);
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.teamAssignment.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
