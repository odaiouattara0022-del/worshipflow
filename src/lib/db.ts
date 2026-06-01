import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient(): PrismaClient {
  // DB_PASSWORD overrides any password embedded in DATABASE_URL.
  // This allows the password to be rotated in Vercel without updating DATABASE_URL.
  let connectionString = process.env.DATABASE_URL!;
  if (process.env.DB_PASSWORD) {
    try {
      const url = new URL(connectionString);
      url.password = process.env.DB_PASSWORD;
      connectionString = url.toString();
    } catch {
      // malformed DATABASE_URL — fall back to original
    }
  }
  try {
    const u = new URL(connectionString);
    console.log(`[db] connecting: ${u.username}@${u.hostname}:${u.port}${u.pathname} pw_override=${!!process.env.DB_PASSWORD}`);
  } catch { /* ignore */ }
  const pool = new Pool({
    connectionString,
    max: 3,
    ssl: { rejectUnauthorized: false },
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
