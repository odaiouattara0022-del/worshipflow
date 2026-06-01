import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient(): PrismaClient {
  // Use individual params to avoid URL-parsing issues with the dot in the username.
  // DB_PASSWORD takes precedence over the password embedded in DATABASE_URL.
  const pool = new Pool({
    host: "aws-0-eu-west-2.pooler.supabase.com",
    port: 6543,
    user: "postgres.plmduabtivmideutigkk",
    password: process.env.DB_PASSWORD,
    database: "postgres",
    ssl: false,
    max: 2,
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
