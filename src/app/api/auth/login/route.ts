import { prisma } from "@/lib/db";
import { verifyPin, createSession } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  // 10 attempts per IP per 5 minutes
  const ip = getClientIp(request);
  const rl = checkRateLimit(`login:${ip}`, 10, 5 * 60 * 1000);
  if (!rl.allowed) {
    return Response.json(
      { error: `Trop de tentatives. Réessayez dans ${rl.retryAfter}s.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  try {
    const body = await request.json();
    const { name, pin } = body;

    if (!name || !pin) {
      return Response.json(
        { error: "Nom et PIN requis" },
        { status: 400 }
      );
    }

    // Trim whitespace for easier mobile login
    const trimmedName = name.trim();

    // SQLite doesn't support case-insensitive mode, so fetch all and compare
    const allUsers = await prisma.user.findMany({
      select: { id: true, name: true, pin: true, role: true },
    });
    const user = allUsers.find(
      (u: any) => u.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (!user) {
      return Response.json(
        { error: "Identifiants invalides" },
        { status: 401 }
      );
    }

    const valid = await verifyPin(pin, user.pin);
    if (!valid) {
      return Response.json(
        { error: "Identifiants invalides" },
        { status: 401 }
      );
    }

    await createSession(user.id);

    return Response.json({
      id: user.id,
      name: user.name,
      role: user.role,
    });
  } catch {
    return Response.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
