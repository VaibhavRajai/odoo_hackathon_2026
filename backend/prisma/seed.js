/**
 * TransitOps — Database Seed
 *
 * Seeds the four TransitOps roles and one pre-provisioned user per role.
 * Users are not self-registered; accounts are provisioned at deployment.
 *
 * Run: npx prisma db seed
 */

import pkg from "@prisma/client";
const { PrismaClient } = pkg;
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const ROLES = [
  "Fleet Manager",
  "Driver",
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
    name: "Rishabh Jain (Driver)",
    email: "rishabhjainwork1@gmail.com",
    password: "password123",
    role: "Driver",
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
      update: { passwordHash, name: userData.name },
      create: {
        name: userData.name,
        email: userData.email,
        passwordHash,
        roleId: roleMap[userData.role],
      },
    });
    console.log(`  ✔ User seeded: ${user.name} <${user.email}> [${userData.role}]`);
  }

  // 3. Seed Vehicles
  console.log("\n  Seeding Vehicles...");
  const vehicle1 = await prisma.vehicle.upsert({
    where: { registrationNum: 'VT-902' },
    update: {},
    create: { registrationNum: 'VT-902', name: 'Transit Bus', type: 'Bus', maxLoadCapacity: 2500 }
  });
  const vehicle2 = await prisma.vehicle.upsert({
    where: { registrationNum: 'VT-411' },
    update: {},
    create: { registrationNum: 'VT-411', name: 'Cargo Van', type: 'Van', maxLoadCapacity: 1500 }
  });
  console.log("  ✔ Vehicles seeded");

  // 4. Seed DriverProfile
  console.log("\n  Seeding DriverProfiles...");
  const driverUser = await prisma.user.findUnique({ where: { email: 'rishabhjainwork1@gmail.com' } });
  let driverProfile = null;
  let driverProfile2 = null;
  let driverProfile3 = null;
  
  if (driverUser) {
    driverProfile = await prisma.driverProfile.upsert({
      where: { licenseNumber: 'DL-84729' },
      update: { userId: driverUser.id, status: 'Available' },
      create: {
        name: driverUser.name,
        licenseNumber: 'DL-84729',
        userId: driverUser.id,
        status: 'Available'
      }
    });
    
    driverProfile2 = await prisma.driverProfile.upsert({
      where: { licenseNumber: 'DL-11223' },
      update: { status: 'Available' },
      create: {
        name: 'Sarah Connor',
        licenseNumber: 'DL-11223',
        status: 'Available'
      }
    });

    driverProfile3 = await prisma.driverProfile.upsert({
      where: { licenseNumber: 'DL-99887' },
      update: { status: 'Available' },
      create: {
        name: 'John Smith',
        licenseNumber: 'DL-99887',
        status: 'Available'
      }
    });
    console.log("  ✔ Driver Profiles seeded");
  }

  // 5. Seed Trips
  console.log("\n  Seeding Trips...");
  if (driverProfile) {
    // Check if trips exist to avoid duplicate inserts if possible, 
    // or just rely on the fact we restart the DB
    await prisma.trip.create({
      data: {
        source: 'Terminal 1 Main Depot',
        destination: 'Cargo Hub Central',
        cargoWeight: 1250,
        status: 'Draft',
        vehicleId: vehicle1.id,
        driverId: driverProfile.id
      }
    });
    await prisma.trip.create({
      data: {
        source: 'Warehouse East',
        destination: 'Port Loading Dock B',
        cargoWeight: 850,
        status: 'Dispatched',
        vehicleId: vehicle2.id,
        driverId: driverProfile.id
      }
    });
    console.log("  ✔ Trips seeded");
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
