import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPin, requireAdmin } from "@/lib/auth";

export async function GET() {
  // Public endpoint used on login page — only expose non-sensitive fields
  const users = await prisma.user.findMany({
    select: { id: true, name: true, role: true, avatar: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
}

/**
 * POST /api/team — Create a new member.
 * ADMIN only.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await request.json();
  const { name, email, phone, role, pin } = body;

  if (!name || !pin) {
    return NextResponse.json(
      { error: "Le nom et le PIN sont requis" },
      { status: 400 }
    );
  }

  if (String(pin).length < 1) {
    return NextResponse.json(
      { error: "Le mot de passe est requis" },
      { status: 400 }
    );
  }

  // Check for duplicate name
  const existing = await prisma.user.findFirst({
    where: { name: { equals: name } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Un membre avec ce nom existe déjà" },
      { status: 409 }
    );
  }

  const hashedPin = await hashPin(pin);

  const user = await prisma.user.create({
    data: {
      name,
      email: email || null,
      phone: phone || null,
      role: role || "MEMBER",
      pin: hashedPin,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      avatar: true,
    },
  });

  return NextResponse.json(user, { status: 201 });
}
