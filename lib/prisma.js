import { PrismaClient } from "@prisma/client";

// Reuse the client across hot reloads / warm serverless invocations so Neon's
// connection limit is not exhausted.
const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.__leadfinderPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__leadfinderPrisma = prisma;
}
