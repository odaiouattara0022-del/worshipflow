import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  // Use individual params to avoid URL parsing issues with Supabase pooler
  const pool = new pg.Pool({
    host: process.env.DB_HOST || "aws-0-eu-west-2.pooler.supabase.com",
    port: parseInt(process.env.DB_PORT || "6543"),
    user: process.env.DB_USER || "postgres.plmduabtivmideutigkk",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "postgres",
    ssl: { rejectUnauthorized: false },
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
