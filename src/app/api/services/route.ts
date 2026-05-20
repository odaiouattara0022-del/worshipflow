import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "";
  const type = searchParams.get("type") || "";
  const upcoming = searchParams.get("upcoming") === "true";

  const where: Record<string, unknown> = {};

  if (status) {
    where.status = status;
  }
  if (type) {
    where.type = type;
  }
  if (upcoming) {
    where.date = { gte: new Date() };
  }

  const services = await prisma.service.findMany({
    where,
    include: {
      items: { orderBy: { order: "asc" } },
      assignments: { include: { user: { select: { id: true, name: true } } } },
      _count: { select: { items: true, assignments: true } },
    },
    orderBy: { date: "asc" },
  });

  return NextResponse.json(services);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, date, type, notes, templateId } = body;

  if (!title || !date) {
    return NextResponse.json(
      { error: "Le titre et la date sont requis" },
      { status: 400 }
    );
  }

  let itemsData: { type: string; title: string; order: number; duration?: number }[] = [];

  if (templateId) {
    const template = await prisma.serviceTemplate.findUnique({
      where: { id: templateId },
    });
    if (!template) {
      return NextResponse.json(
        { error: "Modèle non trouvé" },
        { status: 404 }
      );
    }
    const templateItems = JSON.parse(template.items) as {
      type: string;
      title: string;
      duration?: number;
    }[];
    itemsData = templateItems.map((item, index) => ({
      type: item.type,
      title: item.title,
      order: index + 1,
      duration: item.duration ?? 5,
    }));
  }

  const service = await prisma.service.create({
    data: {
      title,
      date: new Date(date),
      type: type || "culte",
      notes: notes || null,
      templateId: templateId || null,
      items: itemsData.length > 0 ? { create: itemsData } : undefined,
    },
    include: {
      items: { orderBy: { order: "asc" } },
      assignments: true,
      template: true,
    },
  });

  return NextResponse.json(service, { status: 201 });
}
