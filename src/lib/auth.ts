import bcrypt from "bcryptjs";
import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

const AUTH_SECRET = process.env.AUTH_SECRET;
if (!AUTH_SECRET) {
  throw new Error("AUTH_SECRET environment variable is required");
}

const SESSION_MAX_AGE_MS = 60 * 60 * 24 * 30 * 1000; // 30 days

// ---------------------------------------------------------------------------
// HMAC session token helpers
// Format: base64url(payload) + "." + hex(hmac)
// ---------------------------------------------------------------------------
function signToken(payload: string): string {
  const sig = crypto
    .createHmac("sha256", AUTH_SECRET!)
    .update(payload)
    .digest("hex");
  return `${payload}.${sig}`;
}

function verifyToken(token: string): string | null {
  const dot = token.lastIndexOf(".");
  if (dot === -1) return null;

  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  try {
    const expected = crypto
      .createHmac("sha256", AUTH_SECRET!)
      .update(payload)
      .digest("hex");
    if (!crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"))) {
      return null;
    }
  } catch {
    return null;
  }

  // Validate session age
  const decoded = Buffer.from(payload, "base64url").toString("utf-8");
  const parts = decoded.split(":");
  const issuedAt = parseInt(parts[1] ?? "0", 10);
  if (!issuedAt || Date.now() - issuedAt > SESSION_MAX_AGE_MS) {
    return null;
  }

  return payload;
}

// ---------------------------------------------------------------------------
// PIN helpers
// ---------------------------------------------------------------------------
export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10);
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

// ---------------------------------------------------------------------------
// Session management
// ---------------------------------------------------------------------------
export const SESSION_COOKIE = "wf_session";

export const sessionCookieOptions = {
  httpOnly: true,
  path: "/",
  maxAge: 60 * 60 * 24 * 30, // 30 days
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

/** Signs a session token for a user (does NOT set any cookie). */
export function createSessionToken(userId: string): string {
  const payload = Buffer.from(
    `${userId}:${Date.now()}:${crypto.randomBytes(8).toString("hex")}`
  ).toString("base64url");
  return signToken(payload);
}

export async function createSession(userId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, createSessionToken(userId), sessionCookieOptions);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const session = cookieStore.get("wf_session");
  if (!session?.value) return null;

  try {
    const payload = verifyToken(session.value);
    if (!payload) return null;

    const decoded = Buffer.from(payload, "base64url").toString("utf-8");
    const userId = decoded.split(":")[0];
    if (!userId) return null;

    return await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, role: true, email: true, phone: true, avatar: true, churchId: true, churchRole: true },
    });
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("wf_session");
}

export async function requireAuth() {
  return getCurrentUser();
}

export async function requireAdmin(): Promise<
  | { user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>; error?: never }
  | { user?: never; error: Response }
> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: Response.json({ error: "Non authentifié" }, { status: 401 }) };
  }
  if (user.role !== "ADMIN") {
    return { error: Response.json({ error: "Accès refusé — rôle administrateur requis" }, { status: 403 }) };
  }
  return { user };
}
