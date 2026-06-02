import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/** GET /api/churches/[id] — get church info + members */
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const church = await prisma.church.findUnique({
    where: { id },
    include: {
      members: { select: { id: true, name: true, role: true, churchRole: true, avatar: true, email: true } },
      _count: { select: { members: true, joinRequests: true } },
    },
  });
  if (!church) return NextResponse.json({ error: "Église introuvable" }, { status: 404 });
  return NextResponse.json(church);
}

/** PUT /api/churches/[id] — update church info (OWNER/ADMIN only) */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser() as any;
  if (!user || user.churchId !== id || !["OWNER", "ADMIN"].includes(user.churchRole ?? ""))
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const body = await request.json();
  const { name, description, address, website, logoUrl, isPublic, serviceTimes } = body;
  const church = await prisma.church.update({
    where: { id },
    data: {
      name:         name?.trim()        ?? undefined,
      description:  description?.trim() ?? undefined,
      address:      address?.trim()     ?? undefined,
      website:      website?.trim()     ?? undefined,
      logoUrl:      logoUrl?.trim()     ?? undefined,
      isPublic:     isPublic            ?? undefined,
      // serviceTimes stored as JSON string in description appendix or AppSettings
    },
  });
  // Store serviceTimes in AppSettings keyed by church
  if (serviceTimes !== undefined) {
    const { prisma: db } = await import("@/lib/db");
    await db.appSettings.upsert({
      where: { key: `church.${id}.serviceTimes` },
      create: { key: `church.${id}.serviceTimes`, value: JSON.stringify(serviceTimes) },
      update: { value: JSON.stringify(serviceTimes) },
    });
  }
  return NextResponse.json(church);
}
