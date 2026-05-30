import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { title, date } = body;

  // Fetch original service with all items
  const original = await prisma.service.findUnique({
    where: { id },
    include: {
      items: { orderBy: { order: "asc" } },
    },
  });

  if (!original) {
    return NextResponse.json({ error: "Service non trouvé" }, { status: 404 });
  }

  // Create duplicated service with all items
  const duplicated = await prisma.service.create({
    data: {
      title: title || `${original.title} (copie)`,
      date: date ? new Date(date) : new Date(),
      type: original.type,
      status: "DRAFT",
      notes: original.notes,
      templateId: original.templateId,
      items: {
        create: original.items.map((item) => ({
          type: item.type,
          title: item.title,
          order: item.order,
          duration: item.duration,
          songId: item.songId,
          arrangementId: item.arrangementId,
          notes: item.notes,
          // Don't copy assigneeId — new service, new assignments
        })),
      },
    },
    include: {
      items: { orderBy: { order: "asc" } },
    },
  });

  return NextResponse.json(duplicated, { status: 201 });
}
