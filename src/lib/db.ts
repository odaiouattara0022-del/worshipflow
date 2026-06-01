import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function buildConnectionString(): string {
  // Prefer DIRECT_URL (bypasses pooler), fall back to DATABASE_URL.
  const base = process.env.DIRECT_URL || process.env.DATABASE_URL!;
  // DB_PASSWORD overrides the password embedded in the URL (handles password rotations).
  if (process.env.DB_PASSWORD) {
    try {
      const url = new URL(base);
      url.password = process.env.DB_PASSWORD;
      return url.toString();
    } catch { /* ignore */ }
  }
  return base;
}

function createPrismaClient(): PrismaClient {
  const connectionString = buildConnectionString();
  const pool = new Pool({
    connectionString,
    max: 2,
    ssl: { rejectUnauthorized: false },
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
