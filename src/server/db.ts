import { PrismaClient } from "@prisma/client";

// Reuse one client across hot reloads in dev; Next.js re-evaluates modules on edit
// and each PrismaClient holds its own connection pool.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
