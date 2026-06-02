import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { testEmailConnection } from "@/lib/notifications/email";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { to } = await request.json();
  const target = to?.trim() || (user as any).email;

  if (!target) {
    return NextResponse.json({ error: "Adresse email de test requise" }, { status: 400 });
  }

  const result = await testEmailConnection(target);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
