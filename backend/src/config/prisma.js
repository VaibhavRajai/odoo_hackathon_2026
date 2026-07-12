import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Singleton Prisma client.
 *
 * Prisma 7 requires an explicit driver adapter — `PrismaPg` wraps the
 * standard `pg` library and passes the connection string from the environment.
 */
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

const prisma = new PrismaClient({
  adapter,
  log: ["warn", "error"],
});

export default prisma;
