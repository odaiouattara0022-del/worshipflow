import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const templates = await prisma.serviceTemplate.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { services: true } } },
  });

  return NextResponse.json(templates);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, items, defaultDuration } = body;

  if (!name) {
    return NextResponse.json(
      { error: "Le nom est requis" },
      { status: 400 }
    );
  }

  const template = await prisma.serviceTemplate.create({
    data: {
      name,
      items: items ? JSON.stringify(items) : "[]",
      defaultDuration: defaultDuration ?? 90,
    },
  });

  return NextResponse.json(template, { status: 201 });
}
