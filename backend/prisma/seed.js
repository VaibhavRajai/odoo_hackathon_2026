/**
 * TransitOps — Database Seed
 *
 * Seeds the four TransitOps roles and one pre-provisioned user per role.
 * Users are not self-registered; accounts are provisioned at deployment.
 *
 * Run: npx prisma db seed
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const ROLES = [
  "Fleet Manager",
  "Dispatcher",
  "Safety Officer",
  "Financial Analyst",
];

const USERS = [
  {
    name: "Rishabh Jain",
    email: "jainrishabh2610@gmail.com",
    password: "password123",
    role: "Fleet Manager",
  },
  {
    name: "Rishabh Jain (Dispatcher)",
    email: "rishabhjainwork1@gmail.com",
    password: "password123",
    role: "Dispatcher",
  },
  {
    name: "Test Thampi",
    email: "testthampi@gmail.com",
    password: "password123",
    role: "Safety Officer",
  },
  {
    name: "Rishabh Jain (Finance)",
    email: "rishabh.jain.6112@gmail.com",
    password: "password123",
    role: "Financial Analyst",
  },
];

async function seed() {
  console.log("🌱 Seeding TransitOps database...\n");

  // 1. Upsert the four TransitOps roles
  const roleMap = {};
  for (const name of ROLES) {
    const role = await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    roleMap[name] = role.id;
    console.log(`  ✔ Role seeded: ${name}`);
  }

  console.log();

  // 2. Upsert users with hashed passwords
  for (const userData of USERS) {
    const passwordHash = await bcrypt.hash(userData.password, 12);
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        passwordHash,
        name: userData.name,
        roleId: roleMap[userData.role],
      },
      create: {
        name: userData.name,
        email: userData.email,
        passwordHash,
        roleId: roleMap[userData.role],
      },
    });
    console.log(`  ✔ User seeded: ${user.name} <${user.email}> [${userData.role}]`);
  }

  console.log("\n✅ Seeding complete.\n");
  console.log("  Login credentials:");
  console.log("  ──────────────────────────────────────────────────────────");
  for (const u of USERS) {
    console.log(`  ${u.role.padEnd(22)} │ ${u.email}`);
  }
  console.log("  ──────────────────────────────────────────────────────────");
  console.log("  Default password for all accounts: password123\n");
}

seed()
  .catch((err) => {
    console.error("❌ Seed failed:", err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
