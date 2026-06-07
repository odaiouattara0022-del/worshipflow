import { prisma } from "@/lib/db";
import { verifyPin, createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

/**
 * POST /api/auth/login-form — HTML form-based login (no JS needed).
 *
 * On success we set the session cookie DIRECTLY on the redirect response (not via
 * cookies().set() + redirect(), which doesn't reliably attach Set-Cookie to a
 * redirect in a route handler — that caused "you have to try several times").
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`login-form:${ip}`, 10, 5 * 60 * 1000);
  if (!rl.allowed) {
    redirect(`/login?error=ratelimit`);
  }

  let formData;
  try {
    formData = await request.formData();
  } catch (e) {
    return NextResponse.json({ error: "Invalid form data", details: String(e) }, { status: 400 });
  }

  const name = formData.get("name") as string;
  const pin = formData.get("pin") as string;

  if (!name || !pin) {
    redirect("/login?error=missing");
  }

  let token: string;
  try {
    const trimmedName = name.trim();
    const allUsers = await prisma.user.findMany({
      select: { id: true, name: true, pin: true, role: true },
    });
    const user = allUsers.find(
      (u: any) => u.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (!user) {
      redirect("/login?error=invalid");
    }

    const valid = await verifyPin(pin, user.pin);
    if (!valid) {
      redirect("/login?error=invalid");
    }

    token = createSessionToken(user.id);
  } catch (e: unknown) {
    // Re-throw Next.js redirect "errors"
    if (e && typeof e === "object" && "digest" in e && typeof (e as { digest?: string }).digest === "string" && (e as { digest: string }).digest.startsWith("NEXT_REDIRECT")) {
      throw e;
    }
    console.error("Login error:", e);
    return NextResponse.json({ error: "Login failed", details: String(e) }, { status: 500 });
  }

  // 303 → the browser does a GET on /dashboard; the cookie rides on this response.
  const res = NextResponse.redirect(new URL("/dashboard", request.url), { status: 303 });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return res;
}
