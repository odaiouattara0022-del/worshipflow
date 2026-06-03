/**
 * Shared auth helper for pp-bridge routes.
 * Extracts and validates the Bearer token from the Authorization header,
 * returning the matching PPDevice row or null.
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export async function resolveDevice(request: NextRequest) {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  if (!token) return null;

  const device = await prisma.ppDevice.findFirst({
    where: { agentToken: token },
  });

  if (!device) return null;

  // A device that hasn't been approved (or was rejected) must not be able to
  // poll or receive commands. Legacy rows have no status → treated as active.
  const status = (device as any).status ?? "active";
  if (status !== "active") return null;

  return device;
}
