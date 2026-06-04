import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = [
  "/",              // landing page — always public
  "/churches",      // public church profiles
  "/login",
  "/register",
  "/api/auth/login",
  "/api/auth/login-form",
  "/api/auth/logout",
  "/api/auth/register",
  "/api/auth/members",
  "/api/team",
  "/api/pp-bridge",
  "/api/reminders", // Vercel cron (machine, no session cookie) — secured by CRON_SECRET in the route
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get("wf_session");

  // Landing page: authenticated → dashboard, anonymous → show landing
  if (pathname === "/") {
    if (session?.value) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // Other public paths (login, register, api/auth…)
  if (publicPaths.some((p) => p !== "/" && pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Protected routes
  if (!session?.value) {
    if (pathname.startsWith("/api/")) {
      return Response.json({ error: "Non authentifie" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons).*)"],
};
