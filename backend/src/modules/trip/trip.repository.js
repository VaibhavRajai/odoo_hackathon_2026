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
