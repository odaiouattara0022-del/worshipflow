import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10);
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

export async function createSession(userId: string): Promise<void> {
  const token = Buffer.from(
    `${userId}:${Date.now()}:${Math.random().toString(36).slice(2)}`
  ).toString("base64");

  const cookieStore = await cookies();
  cookieStore.set("wf_session", token, {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    sameSite: "lax",
  });
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const session = cookieStore.get("wf_session");

  if (!session?.value) return null;

  try {
    const decoded = Buffer.from(session.value, "base64").toString("utf-8");
    const userId = decoded.split(":")[0];

    if (!userId) return null;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        role: true,
        email: true,
        phone: true,
        avatar: true,
      },
    });

    return user;
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("wf_session");
}

/**
 * Check if the current user is authenticated.
 * Returns the user or null.
 */
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) return null;
  return user;
}

/**
 * Check if the current user is an ADMIN.
 * Returns { user } on success, or { error: Response } on failure.
 */
export async function requireAdmin(): Promise<
  | { user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>; error?: never }
  | { user?: never; error: Response }
> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      error: Response.json({ error: "Non authentifié" }, { status: 401 }),
    };
  }
  if (user.role !== "ADMIN") {
    return {
      error: Response.json(
        { error: "Accès refusé — rôle administrateur requis" },
        { status: 403 }
      ),
    };
  }
  return { user };
}
