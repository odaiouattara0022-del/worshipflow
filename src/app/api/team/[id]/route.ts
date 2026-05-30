import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPin, requireAdmin, getCurrentUser } from "@/lib/auth";

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      avatar: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json(
      { error: "Membre non trouvé" },
      { status: 404 }
    );
  }

  return NextResponse.json(user);
}

/**
 * PUT /api/team/[id] — Update a member.
 * ADMIN only (except: a user can update their own email/phone/pin).
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const isSelf = currentUser.id === id;
  const isAdmin = currentUser.role === "ADMIN";

  if (!isAdmin && !isSelf) {
    return NextResponse.json(
      { error: "Accès refusé — vous ne pouvez modifier que votre propre profil" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const data: Record<string, unknown> = {};

  // Only admins can change name and role
  if (isAdmin) {
    if (body.name !== undefined) data.name = body.name;
    if (body.role !== undefined) data.role = body.role;
  }

  // Self or admin can change these
  if (body.email !== undefined) data.email = body.email || null;
  if (body.phone !== undefined) data.phone = body.phone || null;
  if (body.pin) {
    if (String(body.pin).length < 4) {
      return NextResponse.json(
        { error: "Le PIN doit contenir au moins 4 caractères" },
        { status: 400 }
      );
    }
    data.pin = await hashPin(body.pin);
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      avatar: true,
    },
  });

  return NextResponse.json(user);
}

/**
 * DELETE /api/team/[id] — Delete a member.
 * ADMIN only. Cannot delete yourself.
 */
export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = await params;

  // Prevent admin from deleting themselves
  if (auth.user.id === id) {
    return NextResponse.json(
      { error: "Impossible de supprimer votre propre compte" },
      { status: 400 }
    );
  }

  // Check target exists
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: "Membre non trouvé" }, { status: 404 });
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
