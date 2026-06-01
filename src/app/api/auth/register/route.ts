import { prisma } from "@/lib/db";
import { hashPin, createSession } from "@/lib/auth";
import { redirect } from "next/navigation";

/**
 * POST /api/auth/register — HTML form-based registration (no JS needed).
 * Creates a new MEMBER account and logs them in.
 */
export async function POST(request: Request) {
  const formData = await request.formData();
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim() || null;
  const phone = (formData.get("phone") as string)?.trim() || null;
  const pin = formData.get("pin") as string;
  const pinConfirm = formData.get("pinConfirm") as string;

  // Build query string to preserve form values on error
  const params = new URLSearchParams();
  if (name) params.set("name", name);
  if (email) params.set("email", email);
  if (phone) params.set("phone", phone);

  if (!name || !pin) {
    params.set("error", "missing");
    redirect(`/register?${params.toString()}`);
  }

  if (String(pin).length < 1) {
    params.set("error", "short");
    redirect(`/register?${params.toString()}`);
  }

  if (pin !== pinConfirm) {
    params.set("error", "mismatch");
    redirect(`/register?${params.toString()}`);
  }

  // Check if name already exists (case-insensitive)
  const allUsers = await prisma.user.findMany({
    select: { name: true },
  });
  const exists = allUsers.some(
    (u: any) => u.name.toLowerCase() === name.toLowerCase()
  );

  if (exists) {
    params.set("error", "exists");
    redirect(`/register?${params.toString()}`);
  }

  // Create the user — outside try/catch so redirect() isn't caught
  const hashedPin = await hashPin(pin);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone,
      role: "MEMBER",
      pin: hashedPin,
    },
  });

  // Auto-login after registration
  await createSession(user.id);
  redirect("/");
}
