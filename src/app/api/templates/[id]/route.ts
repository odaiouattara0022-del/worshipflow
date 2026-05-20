import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const template = await prisma.serviceTemplate.update({
    where: { id },
    data: {
      name: body.name ?? undefined,
      items: body.items !== undefined ? JSON.stringify(body.items) : undefined,
      defaultDuration: body.defaultDuration ?? undefined,
    },
  });

  return NextResponse.json(template);
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.serviceTemplate.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
