import { prisma } from "@/lib/db";

/**
 * GET /api/auth/members — Public endpoint for login page.
 * Returns only names (no sensitive data).
 */
export async function GET() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      avatar: true,
    },
    orderBy: { name: "asc" },
  });

  return Response.json(users, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
