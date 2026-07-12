import prisma from "../../config/prisma.js";

export async function findVehicleById(id) {
  return prisma.vehicle.findUnique({ where: { id } });
}

export async function findTripById(id) {
  return prisma.trip.findUnique({ where: { id } });
}

export async function createFuelLog(data) {
  return prisma.fuelLog.create({
    data,
    include: { vehicle: { select: { id: true, registrationNumber: true, name: true } } },
  });
}

export async function findFuelLogs(where = {}) {
  return prisma.fuelLog.findMany({
    where,
    include: { vehicle: { select: { id: true, registrationNumber: true, name: true } } },
    orderBy: { date: "desc" },
  });
}
