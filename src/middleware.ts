import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = ["/login", "/register", "/api/auth/login", "/api/auth/login-form", "/api/auth/register", "/api/auth/members", "/api/team"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow GET /api/team for login page member list
  if (pathname === "/api/team" && request.method === "GET") {
    return NextResponse.next();
  }

  const session = request.cookies.get("wf_session");

  if (!session?.value) {
    // API routes: return 401 JSON
    if (pathname.startsWith("/api/")) {
      return Response.json({ error: "Non authentifie" }, { status: 401 });
    }

    // Pages: redirect to login
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons).*)"],
};
