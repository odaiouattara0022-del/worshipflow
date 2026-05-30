import { prisma } from "@/lib/db";
import { verifyPin, createSession } from "@/lib/auth";
import { redirect } from "next/navigation";

/**
 * POST /api/auth/login-form — HTML form-based login (no JS needed).
 */
export async function POST(request: Request) {
  const formData = await request.formData();
  const name = formData.get("name") as string;
  const pin = formData.get("pin") as string;

  if (!name || !pin) {
    redirect("/login?error=missing");
  }

  const trimmedName = name.trim();
  const allUsers = await prisma.user.findMany({
    select: { id: true, name: true, pin: true, role: true },
  });
  const user = allUsers.find(
    (u) => u.name.toLowerCase() === trimmedName.toLowerCase()
  );

  if (!user) {
    redirect("/login?error=invalid");
  }

  const valid = await verifyPin(pin, user.pin);
  if (!valid) {
    redirect("/login?error=invalid");
  }

  await createSession(user.id);
  redirect("/");
}
