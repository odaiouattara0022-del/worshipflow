import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/** PUT /api/user/onboarding — update profile fields + mark onboarding done */
export async function PUT(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await request.json();
  const { instruments, bio, onboardingCompleted } = body;

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      instruments: instruments ?? undefined,
      bio: bio ?? undefined,
      onboardingCompleted: onboardingCompleted ?? undefined,
    },
    select: { id: true, name: true, instruments: true, bio: true, onboardingCompleted: true },
  });

  return NextResponse.json(updated);
}
