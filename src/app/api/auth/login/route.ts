import { prisma } from "@/lib/db";
import { verifyPin, createSession } from "@/lib/auth";

export async function POST(request: Request) {
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
      (u) => u.name.toLowerCase() === trimmedName.toLowerCase()
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
