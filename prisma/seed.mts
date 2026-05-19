import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, "..", "dev.db").replace(/\\/g, "/");

const adapter = new PrismaLibSql({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminPin = await bcrypt.hash("1234", 10);

  await prisma.user.upsert({
    where: { id: "admin-user" },
    update: {},
    create: {
      id: "admin-user",
      name: "Administrateur",
      pin: adminPin,
      role: "ADMIN",
    },
  });

  await prisma.serviceTemplate.upsert({
    where: { id: "culte-standard" },
    update: {},
    create: {
      id: "culte-standard",
      name: "Culte Dominical Standard",
      defaultDuration: 90,
      items: JSON.stringify([
        { type: "COUNTDOWN", title: "Compte à rebours", duration: 5 },
        { type: "SONG", title: "Louange 1", duration: 6 },
        { type: "SONG", title: "Louange 2", duration: 6 },
        { type: "SONG", title: "Louange 3", duration: 6 },
        { type: "PRAYER", title: "Prière d'ouverture", duration: 10 },
        { type: "SERMON", title: "Prédication", duration: 35 },
        { type: "OFFERING", title: "Offrande", duration: 5 },
        { type: "ANNOUNCEMENT", title: "Annonces", duration: 5 },
        { type: "SONG", title: "Chant de clôture", duration: 6 },
        { type: "PRAYER", title: "Bénédiction", duration: 5 },
      ]),
    },
  });

  await prisma.appSettings.upsert({
    where: { key: "pp_data_path" },
    update: {},
    create: { id: "setting-pp-data-path", key: "pp_data_path", value: "C:\\Users\\HP\\Documents\\ProPresenter" },
  });
  await prisma.appSettings.upsert({
    where: { key: "pp_api_port" },
    update: {},
    create: { id: "setting-pp-api-port", key: "pp_api_port", value: "1025" },
  });
  await prisma.appSettings.upsert({
    where: { key: "reminder_j7" },
    update: {},
    create: { id: "setting-reminder-j7", key: "reminder_j7", value: "true" },
  });
  await prisma.appSettings.upsert({
    where: { key: "reminder_j3" },
    update: {},
    create: { id: "setting-reminder-j3", key: "reminder_j3", value: "true" },
  });
  await prisma.appSettings.upsert({
    where: { key: "reminder_j1" },
    update: {},
    create: { id: "setting-reminder-j1", key: "reminder_j1", value: "true" },
  });

  console.log("Seed complete: admin user (PIN: 1234), standard template, default settings");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
