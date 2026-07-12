/**
 * TransitOps — Database Seed
 *
 * Seeds the four TransitOps roles, one pre-provisioned user per role,
 * and 50 realistic commercial vehicles with associated active & closed
 * maintenance logs.
 *
 * Run: npx prisma db seed
 */

import pkg from "@prisma/client";
const { PrismaClient } = pkg;
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import crypto from "crypto";
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

// Regions: North, South, East, West, Central — distributed across the 50 vehicles
const VEHICLES = [
  // 12 Vans
  { registrationNumber: "MH01AB1234", name: "Tata Winger", type: "Van", region: "West", maxLoadCapacity: 1600, odometer: 45000, acquisitionCost: 1250000, status: "AVAILABLE" },
  { registrationNumber: "MH12XY5678", name: "Force Traveller", type: "Van", region: "West", maxLoadCapacity: 2000, odometer: 120000, acquisitionCost: 1650000, status: "AVAILABLE" },
  { registrationNumber: "GJ01CD4321", name: "Mahindra Supro", type: "Van", region: "West", maxLoadCapacity: 1000, odometer: 32000, acquisitionCost: 850000, status: "AVAILABLE" },
  { registrationNumber: "DL01EF9876", name: "Maruti Suzuki Eeco", type: "Van", region: "North", maxLoadCapacity: 700, odometer: 15000, acquisitionCost: 550000, status: "AVAILABLE" },
  { registrationNumber: "KA03GH2468", name: "Tata Winger Cargo", type: "Van", region: "South", maxLoadCapacity: 1500, odometer: 85000, acquisitionCost: 1100000, status: "AVAILABLE" },
  { registrationNumber: "TN01JK1357", name: "Force Traveller Delivery", type: "Van", region: "South", maxLoadCapacity: 1800, odometer: 210000, acquisitionCost: 1500000, status: "ON_TRIP" },
  { registrationNumber: "RJ14LM2468", name: "Tata Winger Passenger", type: "Van", region: "North", maxLoadCapacity: 1600, odometer: 95000, acquisitionCost: 1250000, status: "ON_TRIP" },
  { registrationNumber: "UP16NP9753", name: "Mahindra Supro Cargo", type: "Van", region: "North", maxLoadCapacity: 1000, odometer: 64000, acquisitionCost: 850000, status: "ON_TRIP" },
  { registrationNumber: "MP04QR8642", name: "Force Traveller", type: "Van", region: "Central", maxLoadCapacity: 2000, odometer: 145000, acquisitionCost: 1650000, status: "IN_SHOP" },
  { registrationNumber: "MH02ST1357", name: "Tata Winger Delivery", type: "Van", region: "West", maxLoadCapacity: 1600, odometer: 180000, acquisitionCost: 1250000, status: "IN_SHOP" },
  { registrationNumber: "GJ03UV9753", name: "Maruti Suzuki Eeco", type: "Van", region: "West", maxLoadCapacity: 700, odometer: 245000, acquisitionCost: 520000, status: "RETIRED" },
  { registrationNumber: "DL03WX8642", name: "Force Traveller", type: "Van", region: "North", maxLoadCapacity: 2000, odometer: 290000, acquisitionCost: 1600000, status: "RETIRED" },

  // 12 Trucks
  { registrationNumber: "MH15AB9876", name: "Tata Prima 2830", type: "Truck", region: "West", maxLoadCapacity: 25000, odometer: 68000, acquisitionCost: 4500000, status: "AVAILABLE" },
  { registrationNumber: "MH43CD1234", name: "Eicher Pro 6028", type: "Truck", region: "West", maxLoadCapacity: 18000, odometer: 110000, acquisitionCost: 3800000, status: "AVAILABLE" },
  { registrationNumber: "GJ02EF5678", name: "BharatBenz 2823R", type: "Truck", region: "West", maxLoadCapacity: 20000, odometer: 82000, acquisitionCost: 4100000, status: "AVAILABLE" },
  { registrationNumber: "DL02GH9876", name: "Tata Ultra T.7", type: "Truck", region: "North", maxLoadCapacity: 4000, odometer: 42000, acquisitionCost: 1550000, status: "AVAILABLE" },
  { registrationNumber: "KA04JK1234", name: "Ashok Leyland Partner", type: "Truck", region: "South", maxLoadCapacity: 3000, odometer: 56000, acquisitionCost: 1450000, status: "AVAILABLE" },
  { registrationNumber: "TN02LM5678", name: "Eicher Pro 2049", type: "Truck", region: "South", maxLoadCapacity: 3500, odometer: 72000, acquisitionCost: 1500000, status: "AVAILABLE" },
  { registrationNumber: "RJ14NP9876", name: "BharatBenz 3523R", type: "Truck", region: "North", maxLoadCapacity: 28000, odometer: 140000, acquisitionCost: 5200000, status: "ON_TRIP" },
  { registrationNumber: "UP16QR1234", name: "Tata Signa 2821", type: "Truck", region: "North", maxLoadCapacity: 22000, odometer: 195000, acquisitionCost: 4300000, status: "ON_TRIP" },
  { registrationNumber: "MP04ST5678", name: "Ashok Leyland Boss 1215", type: "Truck", region: "Central", maxLoadCapacity: 8000, odometer: 125000, acquisitionCost: 2200000, status: "ON_TRIP" },
  { registrationNumber: "MH03UV9876", name: "Eicher Pro 6028", type: "Truck", region: "West", maxLoadCapacity: 18000, odometer: 215000, acquisitionCost: 3800000, status: "IN_SHOP" },
  { registrationNumber: "GJ04WX1234", name: "Tata Prima 2830", type: "Truck", region: "West", maxLoadCapacity: 25000, odometer: 320000, acquisitionCost: 4500000, status: "IN_SHOP" },
  { registrationNumber: "DL04YZ5678", name: "Ashok Leyland U-3718", type: "Truck", region: "North", maxLoadCapacity: 35000, odometer: 480000, acquisitionCost: 5800000, status: "RETIRED" },

  // 8 Mini Trucks
  { registrationNumber: "MH04AB3456", name: "Tata Ace Gold", type: "Mini Truck", region: "West", maxLoadCapacity: 750, odometer: 24000, acquisitionCost: 520000, status: "AVAILABLE" },
  { registrationNumber: "MH14CD7890", name: "Mahindra Jeeto", type: "Mini Truck", region: "West", maxLoadCapacity: 600, odometer: 18000, acquisitionCost: 480000, status: "AVAILABLE" },
  { registrationNumber: "GJ04EF2345", name: "Maruti Suzuki Super Carry", type: "Mini Truck", region: "West", maxLoadCapacity: 740, odometer: 31000, acquisitionCost: 510000, status: "AVAILABLE" },
  { registrationNumber: "DL04GH6789", name: "Tata Ace EV", type: "Mini Truck", region: "North", maxLoadCapacity: 600, odometer: 8000, acquisitionCost: 980000, status: "AVAILABLE" },
  { registrationNumber: "KA05JK2345", name: "Mahindra Jeeto Plus", type: "Mini Truck", region: "South", maxLoadCapacity: 715, odometer: 42000, acquisitionCost: 495000, status: "AVAILABLE" },
  { registrationNumber: "TN03LM6789", name: "Tata Ace Gold Diesel", type: "Mini Truck", region: "South", maxLoadCapacity: 750, odometer: 98000, acquisitionCost: 530000, status: "ON_TRIP" },
  { registrationNumber: "RJ15NP2345", name: "Maruti Suzuki Super Carry", type: "Mini Truck", region: "Central", maxLoadCapacity: 740, odometer: 112000, acquisitionCost: 510000, status: "ON_TRIP" },
  { registrationNumber: "UP17QR6789", name: "Tata Ace Gold CNG", type: "Mini Truck", region: "North", maxLoadCapacity: 750, odometer: 85000, acquisitionCost: 580000, status: "IN_SHOP" },

  // 6 Pickups
  { registrationNumber: "MH05AB5678", name: "Mahindra Bolero Pickup", type: "Pickup", region: "West", maxLoadCapacity: 1500, odometer: 38000, acquisitionCost: 890000, status: "AVAILABLE" },
  { registrationNumber: "MH16CD1234", name: "Tata Yodha", type: "Pickup", region: "West", maxLoadCapacity: 1700, odometer: 52000, acquisitionCost: 920000, status: "AVAILABLE" },
  { registrationNumber: "GJ05EF5678", name: "Mahindra Bolero Maxx", type: "Pickup", region: "West", maxLoadCapacity: 1300, odometer: 29000, acquisitionCost: 840000, status: "AVAILABLE" },
  { registrationNumber: "DL05GH1234", name: "Isuzu D-Max", type: "Pickup", region: "North", maxLoadCapacity: 1200, odometer: 67000, acquisitionCost: 1450000, status: "AVAILABLE" },
  { registrationNumber: "KA06JK5678", name: "Mahindra Bolero Pickup", type: "Pickup", region: "South", maxLoadCapacity: 1500, odometer: 105000, acquisitionCost: 890000, status: "ON_TRIP" },
  { registrationNumber: "TN04LM1234", name: "Tata Yodha Crew Cabin", type: "Pickup", region: "South", maxLoadCapacity: 1200, odometer: 138000, acquisitionCost: 990000, status: "IN_SHOP" },

  // 5 Buses
  { registrationNumber: "MH06AB7890", name: "Tata Starbus 32", type: "Bus", region: "West", maxLoadCapacity: 5000, odometer: 88000, acquisitionCost: 2800000, status: "AVAILABLE" },
  { registrationNumber: "MH18CD5678", name: "Ashok Leyland Oyster", type: "Bus", region: "West", maxLoadCapacity: 6000, odometer: 115000, acquisitionCost: 3200000, status: "AVAILABLE" },
  { registrationNumber: "GJ06EF1234", name: "Eicher Starline 2075", type: "Bus", region: "East", maxLoadCapacity: 4500, odometer: 74000, acquisitionCost: 2400000, status: "AVAILABLE" },
  { registrationNumber: "DL06GH5678", name: "Tata CityBus", type: "Bus", region: "North", maxLoadCapacity: 8000, odometer: 165000, acquisitionCost: 3850000, status: "ON_TRIP" },
  { registrationNumber: "KA07JK1234", name: "Ashok Leyland Oyster Staff", type: "Bus", region: "South", maxLoadCapacity: 6000, odometer: 142000, acquisitionCost: 3200000, status: "IN_SHOP" },

  // 7 Trailers
  { registrationNumber: "MH07AB9012", name: "Tata Signa 4018.S", type: "Trailer", region: "West", maxLoadCapacity: 35000, odometer: 94000, acquisitionCost: 4800000, status: "AVAILABLE" },
  { registrationNumber: "MH20CD3456", name: "BharatBenz 4023TT", type: "Trailer", region: "West", maxLoadCapacity: 40000, odometer: 130000, acquisitionCost: 5400000, status: "AVAILABLE" },
  { registrationNumber: "GJ07EF7890", name: "Tata Prima 4930.S", type: "Trailer", region: "East", maxLoadCapacity: 49000, odometer: 61000, acquisitionCost: 6200000, status: "AVAILABLE" },
  { registrationNumber: "DL07GH2345", name: "Ashok Leyland 4019", type: "Trailer", region: "North", maxLoadCapacity: 38000, odometer: 155000, acquisitionCost: 4600000, status: "AVAILABLE" },
  { registrationNumber: "KA08JK6789", name: "Mahindra Blazo X 40", type: "Trailer", region: "South", maxLoadCapacity: 40000, odometer: 182000, acquisitionCost: 5100000, status: "AVAILABLE" },
  { registrationNumber: "TN05LM2345", name: "Tata Signa 4018.S", type: "Trailer", region: "East", maxLoadCapacity: 35000, odometer: 205000, acquisitionCost: 4800000, status: "RETIRED" },
  { registrationNumber: "RJ16NP6789", name: "BharatBenz 4023TT", type: "Trailer", region: "Central", maxLoadCapacity: 40000, odometer: 380000, acquisitionCost: 5400000, status: "RETIRED" },
];

/** Generate deterministic UUID from string input for idempotent seeding. */
function getDeterministicUUID(val) {
  const hash = crypto.createHash("sha256").update(val).digest("hex");
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    "4" + hash.substring(13, 16),
    "8" + hash.substring(17, 20),
    hash.substring(20, 32),
  ].join("-");
}

async function seed() {
  console.log("🌱 Seeding TransitOps database...\n");

  // 1. Upsert roles
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

  // 2. Upsert users
  for (const userData of USERS) {
    const passwordHash = await bcrypt.hash(userData.password, 12);
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: { passwordHash, name: userData.name, roleId: roleMap[userData.role] },
      create: { name: userData.name, email: userData.email, passwordHash, roleId: roleMap[userData.role] },
    });
    console.log(`  ✔ User seeded: ${user.name} <${user.email}> [${userData.role}]`);
  }
  console.log();

  // 3. Upsert vehicles (now including region)
  console.log("🚘 Seeding vehicles...");
  const vehicleMap = {};
  for (const v of VEHICLES) {
    const vehicleId = getDeterministicUUID(v.registrationNumber);
    const dbVehicle = await prisma.vehicle.upsert({
      where: { registrationNumber: v.registrationNumber },
      update: {
        name: v.name,
        type: v.type,
        region: v.region,
        maxLoadCapacity: v.maxLoadCapacity,
        odometer: v.odometer,
        acquisitionCost: v.acquisitionCost,
        status: v.status,
      },
      create: {
        id: vehicleId,
        registrationNumber: v.registrationNumber,
        name: v.name,
        type: v.type,
        region: v.region,
        maxLoadCapacity: v.maxLoadCapacity,
        odometer: v.odometer,
        acquisitionCost: v.acquisitionCost,
        status: v.status,
      },
    });
    vehicleMap[v.registrationNumber] = dbVehicle.id;
  }
  console.log(`  ✔ Seeded ${VEHICLES.length} vehicles (with regions).`);
  console.log();

  // 4. Seed active maintenance (IN_SHOP vehicles)
  console.log("🔧 Seeding maintenance records...");
  const activeMaintenanceConfigs = [
    { regNum: "MP04QR8642", type: "Engine Overhaul", cost: 18500, desc: "Piston replacement and cylinder bore hone due to low compression." },
    { regNum: "MH02ST1357", type: "Brake Repair", cost: 4200, desc: "Front brake pads and brake rotor replacement." },
    { regNum: "MH03UV9876", type: "Suspension Repair", cost: 12500, desc: "Front shock absorbers and bush kits overhaul." },
    { regNum: "GJ04WX1234", type: "Transmission Service", cost: 24000, desc: "Clutch plate replacement and gearbox oil change." },
    { regNum: "UP17QR6789", type: "Electrical Repair", cost: 3500, desc: "Alternator repair and battery replacement." },
    { regNum: "TN04LM1234", type: "AC Service", cost: 5800, desc: "AC compressor replacement and gas recharging." },
    { regNum: "KA07JK1234", type: "Tyre Replacement", cost: 16000, desc: "Four front and rear radial tyres replaced." },
  ];

  for (const m of activeMaintenanceConfigs) {
    const vId = vehicleMap[m.regNum];
    if (!vId) continue;
    const maintenanceId = getDeterministicUUID(`${m.regNum}:active:m`);
    await prisma.maintenance.upsert({
      where: { id: maintenanceId },
      update: { vehicleId: vId, type: m.type, cost: m.cost, description: m.desc, status: "ACTIVE" },
      create: {
        id: maintenanceId,
        vehicleId: vId,
        type: m.type,
        cost: m.cost,
        description: m.desc,
        startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        status: "ACTIVE",
      },
    });
  }

  // 5. Seed closed maintenance history
  const closedMaintenanceConfigs = [
    { regNum: "MH01AB1234", type: "Oil Change", cost: 3500, desc: "Standard oil filter and engine oil lube service.", daysAgoStart: 20, daysAgoEnd: 19 },
    { regNum: "MH12XY5678", type: "Brake Repair", cost: 6800, desc: "Rear brake drum lining overhaul.", daysAgoStart: 45, daysAgoEnd: 43 },
    { regNum: "GJ01CD4321", type: "Wheel Alignment", cost: 1200, desc: "Laser wheel alignment and balancing.", daysAgoStart: 12, daysAgoEnd: 12 },
    { regNum: "DL01EF9876", type: "Scheduled Inspection", cost: 2500, desc: "Routine 10,000 km general diagnostic checklist.", daysAgoStart: 18, daysAgoEnd: 18 },
    { regNum: "KA03GH2468", type: "AC Service", cost: 4900, desc: "AC filter cleaning and gas top-up.", daysAgoStart: 30, daysAgoEnd: 29 },
    { regNum: "MH15AB9876", type: "Tyre Replacement", cost: 28000, desc: "Set of rear multi-axle tyres replaced.", daysAgoStart: 60, daysAgoEnd: 59 },
    { regNum: "MH43CD1234", type: "Brake Repair", cost: 8200, desc: "Front brake booster kit repair.", daysAgoStart: 15, daysAgoEnd: 14 },
    { regNum: "GJ02EF5678", type: "Oil Change", cost: 5200, desc: "High mileage synthetic engine oil replacement.", daysAgoStart: 25, daysAgoEnd: 25 },
    { regNum: "DL02GH9876", type: "Electrical Repair", cost: 2200, desc: "Wiper motor and cabin fuse replacement.", daysAgoStart: 8, daysAgoEnd: 7 },
    { regNum: "KA04JK1234", type: "Suspension Repair", cost: 14000, desc: "Leaf spring assembly recambering and bush replacement.", daysAgoStart: 50, daysAgoEnd: 48 },
  ];

  for (const m of closedMaintenanceConfigs) {
    const vId = vehicleMap[m.regNum];
    if (!vId) continue;
    const maintenanceId = getDeterministicUUID(`${m.regNum}:closed:${m.daysAgoStart}`);
    await prisma.maintenance.upsert({
      where: { id: maintenanceId },
      update: { vehicleId: vId, type: m.type, cost: m.cost, description: m.desc, status: "CLOSED" },
      create: {
        id: maintenanceId,
        vehicleId: vId,
        type: m.type,
        cost: m.cost,
        description: m.desc,
        startDate: new Date(Date.now() - m.daysAgoStart * 24 * 60 * 60 * 1000),
        completedDate: new Date(Date.now() - m.daysAgoEnd * 24 * 60 * 60 * 1000),
        status: "CLOSED",
      },
    });
  }

  console.log(`  ✔ Seeded ${activeMaintenanceConfigs.length} active and ${closedMaintenanceConfigs.length} closed maintenance records.`);

  // 6. Demo Drivers, Trips, and two extra Vehicles — gives the Safety
  //    Officer's /drivers, /trips, and /dashboard pages something real to
  //    show, since no Dispatcher module exists yet to create this data.
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

  // Reuses the `vehicleMap` declared in step 3 — keyed there by
  // registrationNumber, keyed here by name; different key strings, same map,
  // no collision.
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
