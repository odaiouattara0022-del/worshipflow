import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPin } from "@/lib/auth";

export async function GET() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      avatar: true,
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, email, phone, role, pin } = body;

  if (!name || !pin) {
    return NextResponse.json(
      { error: "Le nom et le PIN sont requis" },
      { status: 400 }
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
