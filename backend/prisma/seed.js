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

  // 3. Demo Drivers, Vehicles, and Trips — gives the Safety Officer's
  //    /drivers, /trips, and /dashboard pages something real to show,
  //    since no Dispatcher module exists yet to create this data.
  const drivers = [
    {
      name: "Alex Menon",
      licenseNumber: "GJ0520230012345",
      licenseCategory: "LMV_TR",
      licenseExpiry: new Date("2028-12-01"),
      contactNumber: "9876543210",
      email: "alex.menon@example.com",
      status: "AVAILABLE",
    },
    {
      name: "John Carter",
      licenseNumber: "MH1220190098765",
      licenseCategory: "HMV",
      licenseExpiry: new Date("2025-03-01"), // deliberately expired demo record
      contactNumber: "9822011223",
      email: "john.carter@example.com",
      status: "SUSPENDED",
    },
    {
      name: "Priya Sharma",
      licenseNumber: "GJ0620210054321",
      licenseCategory: "LMV_TR",
      licenseExpiry: new Date("2027-08-15"),
      contactNumber: "9988776655",
      email: "priya.sharma@example.com",
      status: "ON_TRIP",
    },
  ];

  const driverMap = {};
  for (const d of drivers) {
    const driver = await prisma.driver.upsert({
      where: { licenseNumber: d.licenseNumber },
      update: d,
      create: d,
    });
    driverMap[d.name] = driver.id;
    console.log(`  ✔ Driver seeded: ${d.name}`);
  }

  const vehicles = [
    {
      registrationNumber: "GJ01AB4521",
      name: "VAN-05",
      type: "Van",
      maxLoadCapacity: 500,
      odometer: 12000,
      acquisitionCost: 650000,
      status: "ON_TRIP",
    },
    {
      registrationNumber: "GJ01AB7788",
      name: "TRUCK-11",
      type: "Truck",
      maxLoadCapacity: 2000,
      odometer: 45000,
      acquisitionCost: 1800000,
      status: "AVAILABLE",
    },
  ];

  const vehicleMap = {};
  for (const v of vehicles) {
    const vehicle = await prisma.vehicle.upsert({
      where: { registrationNumber: v.registrationNumber },
      update: v,
      create: v,
    });
    vehicleMap[v.name] = vehicle.id;
    console.log(`  ✔ Vehicle seeded: ${v.name}`);
  }

  console.log();

  const trips = [
    {
      id: "seed-trip-1",
      source: "Gandhinagar Depot",
      destination: "Ahmedabad Hub",
      vehicleId: vehicleMap["VAN-05"],
      driverId: driverMap["Priya Sharma"],
      cargoWeight: 450,
      plannedDistance: 32,
      status: "DISPATCHED",
    },
    {
      id: "seed-trip-2",
      source: "Ahmedabad Hub",
      destination: "Vadodara Yard",
      vehicleId: vehicleMap["TRUCK-11"],
      driverId: driverMap["Alex Menon"],
      cargoWeight: 800,
      plannedDistance: 110,
      status: "DRAFT",
    },
    {
      id: "seed-trip-3",
      source: "Vadodara Yard",
      destination: "Surat Terminal",
      vehicleId: vehicleMap["TRUCK-11"],
      driverId: driverMap["Alex Menon"],
      cargoWeight: 600,
      plannedDistance: 150,
      status: "COMPLETED",
    },
  ];

  for (const t of trips) {
    await prisma.trip.upsert({ where: { id: t.id }, update: t, create: t });
    console.log(`  ✔ Trip seeded: ${t.source} -> ${t.destination}`);
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
