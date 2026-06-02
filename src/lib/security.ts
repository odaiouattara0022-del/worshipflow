/**
 * security.ts — Centralized security helpers for API routes.
 *
 * Usage:
 *   const user = await requireSession(request);   // throws 401 if not auth
 *   const safe = sanitize(userInput);             // strips XSS
 *   const ok   = rateLimit(request, "key", 20);  // returns false if exceeded
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// ── Auth ─────────────────────────────────────────────────────────────────────

type AuthUser = Awaited<ReturnType<typeof getCurrentUser>>;

/**
 * Verifies the session. Throws a 401 Response if not authenticated.
 * Use this in any route that requires a logged-in user.
 */
export async function requireSession(): Promise<NonNullable<AuthUser>> {
  const user = await getCurrentUser();
  if (!user) throw NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  return user;
}

/**
 * Verifies the session AND that the user is ADMIN or church OWNER/ADMIN.
 */
export async function requireAdminSession() {
  const user = await requireSession() as any;
  const isAppAdmin = user.role === "ADMIN";
  const isChurchAdmin = ["OWNER", "ADMIN"].includes(user.churchRole ?? "");
  if (!isAppAdmin && !isChurchAdmin) {
    throw NextResponse.json({ error: "Accès refusé — droits administrateur requis" }, { status: 403 });
  }
  return user;
}

// ── Rate limiting ─────────────────────────────────────────────────────────────

/**
 * Rate limit a request. Returns false (and sends response) if exceeded.
 * Use for write operations: POST/PUT/DELETE on sensitive endpoints.
 *
 * @param request  The incoming request
 * @param key      A unique key for this endpoint (e.g. "songs.create")
 * @param max      Max requests allowed in the window
 * @param windowMs Window duration in ms (default: 1 minute)
 */
export function applyRateLimit(
  request: NextRequest,
  key: string,
  max = 30,
  windowMs = 60_000
): NextResponse | null {
  const ip = getClientIp(request as unknown as Request);
  const result = checkRateLimit(`${key}:${ip}`, max, windowMs);
  if (!result.allowed) {
    return NextResponse.json(
      { error: `Trop de requêtes. Réessayez dans ${result.retryAfter}s.` },
      { status: 429, headers: { "Retry-After": String(result.retryAfter) } }
    );
  }
  return null;
}

// ── Input sanitization ────────────────────────────────────────────────────────

const DANGEROUS = /<script[\s\S]*?>[\s\S]*?<\/script>|javascript:|on\w+\s*=|<iframe|<object|<embed|data:text\/html/gi;

/**
 * Strip potentially dangerous HTML/JS from a string.
 * Not a full XSS sanitizer — that would require DOMPurify — but removes
 * the most common injection vectors.
 */
export function sanitize(value: unknown): string {
  if (typeof value !== "string") return String(value ?? "");
  return value.replace(DANGEROUS, "").trim();
}

/**
 * Sanitize an object's string values one level deep.
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result = {} as T;
  for (const [k, v] of Object.entries(obj)) {
    (result as Record<string, unknown>)[k] = typeof v === "string" ? sanitize(v) : v;
  }
  return result;
}

// ── Response helpers ──────────────────────────────────────────────────────────

export function unauthorized() {
  return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
}

export function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}
