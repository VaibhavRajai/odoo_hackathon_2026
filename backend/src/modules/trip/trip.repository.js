import prisma from "../../config/prisma.js";

const include = {
  vehicle: { select: { id: true, registrationNumber: true, name: true } },
  driver: { select: { id: true, name: true, status: true } },
};

export async function findTrips(where = {}) {
  return prisma.trip.findMany({
    where,
    include,
    orderBy: { createdAt: "desc" },
  });
}

export async function findTripById(id) {
  return prisma.trip.findUnique({ where: { id }, include });
}

export async function createTrip(data) {
  return prisma.trip.create({ data, include });
}

export async function findVehicleById(id) {
  return prisma.vehicle.findUnique({ where: { id } });
}

export async function findDriverById(id) {
  return prisma.driver.findUnique({ where: { id } });
}
