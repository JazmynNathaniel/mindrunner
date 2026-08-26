import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./db";
import type { SettingsInput } from "./validation";

export type DbClient = PrismaClient | Prisma.TransactionClient;

export async function getSettings(db: DbClient = prisma) {
  const existing = await db.settings.findUnique({ where: { id: 1 } });
  if (existing) return existing;
  return db.settings.create({ data: { id: 1 } });
}

export async function updateSettings(input: SettingsInput) {
  return prisma.settings.upsert({
    where: { id: 1 },
    update: input,
    create: { id: 1, ...input },
  });
}
