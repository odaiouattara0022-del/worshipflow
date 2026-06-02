import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser() as any;
  if (!user || user.churchId !== id) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const announcements = await prisma.announcement.findMany({
    where: { churchId: id },
    include: { author: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json(announcements);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser() as any;
  if (!user || user.churchId !== id || !["OWNER", "ADMIN"].includes(user.churchRole ?? ""))
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { title, content, category } = await request.json();
  if (!title?.trim() || !content?.trim()) return NextResponse.json({ error: "Titre et contenu requis" }, { status: 400 });

  const ann = await prisma.announcement.create({
    data: { churchId: id, authorId: user.id, title: title.trim(), content: content.trim(), category: category ?? "general" },
    include: { author: { select: { id: true, name: true } } },
  });
  return NextResponse.json(ann, { status: 201 });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser() as any;
  if (!user || user.churchId !== id || !["OWNER", "ADMIN"].includes(user.churchRole ?? ""))
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { annId } = await request.json();
  await prisma.announcement.delete({ where: { id: annId } });
  return NextResponse.json({ ok: true });
}
