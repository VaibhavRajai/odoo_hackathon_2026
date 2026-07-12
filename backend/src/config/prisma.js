import { PrismaClient } from "../../generated/prisma/client.js";

/**
 * Singleton Prisma client.
 * Import this everywhere DB access is needed — never instantiate a second PrismaClient.
 */
const prisma = new PrismaClient({
  log: [
    { level: "warn", emit: "event" },
    { level: "error", emit: "event" },
  ],
});

prisma.$on("warn", (e) => {
  console.warn("[Prisma] Warning:", e.message);
});

prisma.$on("error", (e) => {
  console.error("[Prisma] Error:", e.message);
});

export default prisma;
