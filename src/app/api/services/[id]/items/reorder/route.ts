import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { orderedIds } = body as { orderedIds: string[] };

  if (!orderedIds || !Array.isArray(orderedIds)) {
    return NextResponse.json(
      { error: "orderedIds est requis et doit être un tableau" },
      { status: 400 }
    );
  }

  // Verify all items belong to this service
  const existingItems = await prisma.serviceItem.findMany({
    where: { serviceId: id },
    select: { id: true },
  });
  const existingIds = new Set(existingItems.map((i: any) => i.id as string));
  const invalid = orderedIds.filter((oid) => !existingIds.has(oid));
  if (invalid.length > 0) {
    return NextResponse.json(
      { error: "Certains éléments n'appartiennent pas à ce service" },
      { status: 400 }
    );
  }

  // Update order in a transaction
  await prisma.$transaction(
    orderedIds.map((itemId, index) =>
      prisma.serviceItem.update({
        where: { id: itemId },
        data: { order: index + 1 },
      })
    )
  );

  const items = await prisma.serviceItem.findMany({
    where: { serviceId: id },
    include: { song: true, arrangement: true, assignee: true },
    orderBy: { order: "asc" },
  });

  return NextResponse.json(items);
}
