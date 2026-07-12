import prisma from "../../config/prisma.js";

/**
 * Find a driver by their unique license number.
 */
export async function findDriverByLicenseNumber(licenseNumber) {
  return prisma.driver.findUnique({ where: { licenseNumber } });
}

export async function findDriverById(id) {
  return prisma.driver.findUnique({ where: { id } });
}

export async function createDriver(driverData) {
  return prisma.driver.create({ data: driverData });
}

export async function updateDriver(id, driverData) {
  return prisma.driver.update({ where: { id }, data: driverData });
}

export async function deleteDriver(id) {
  return prisma.driver.delete({ where: { id } });
}

/**
 * Retrieve drivers from the master driver registry.
 *
 * @param {Object} where - Prisma filtering conditions prepared by the service layer.
 */
export async function findDrivers(where = {}) {
  return prisma.driver.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Aggregate counts used by the Safety Officer dashboard KPIs.
 */
export async function countDriversByStatus() {
  const rows = await prisma.driver.groupBy({
    by: ["status"],
    _count: { status: true },
  });
  return rows.reduce((acc, row) => {
    acc[row.status] = row._count.status;
    return acc;
  }, {});
}

export async function countAllDrivers() {
  return prisma.driver.count();
}

/**
 * Auto-suspend every non-suspended driver whose license has expired.
 * Used by the "Validate Now" sweep.
 *
 * @returns {Promise<number>} Number of drivers suspended.
 */
export async function suspendExpiredDrivers(today) {
  const result = await prisma.driver.updateMany({
    where: {
      status: { not: "SUSPENDED" },
      licenseExpiry: { lt: today },
    },
    data: { status: "SUSPENDED" },
  });
  return result.count;
}

export async function createSafetyRating({ driverId, tripId, score }) {
  return prisma.safetyRating.create({ data: { driverId, tripId, score } });
}

/**
 * Recomputes a driver's average safety score directly from their full
 * SafetyRating history — the table is the source of truth, this is
 * never derived incrementally.
 */
export async function aggregateSafetyRatings(driverId) {
  const result = await prisma.safetyRating.aggregate({
    where: { driverId },
    _avg: { score: true },
    _count: { score: true },
  });
  return { average: result._avg.score ?? 5, count: result._count.score };
}

export async function findTripById(tripId) {
  return prisma.trip.findUnique({ where: { id: tripId } });
}

/**
 * Drivers whose license expires within the renewal-reminder window
 * (including already expired) that haven't been emailed for this expiry yet.
 * Used by the "Validate Now" sweep.
 */
export async function findDriversNeedingRenewalEmail(thresholdDate) {
  return prisma.driver.findMany({
    where: {
      email: { not: null },
      licenseExpiry: { lte: thresholdDate },
      renewalEmailSentAt: null,
    },
  });
}

export async function markRenewalEmailSent(id) {
  return prisma.driver.update({ where: { id }, data: { renewalEmailSentAt: new Date() } });
}

/**
 * Clears the reminder flag once a license is renewed well past the window,
 * so a future re-expiry can trigger a fresh email instead of staying silent.
 */
export async function clearStaleRenewalFlags(thresholdDate) {
  return prisma.driver.updateMany({
    where: {
      licenseExpiry: { gt: thresholdDate },
      renewalEmailSentAt: { not: null },
    },
    data: { renewalEmailSentAt: null },
  });
}
