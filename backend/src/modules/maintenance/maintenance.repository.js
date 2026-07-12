import prisma from "../../config/prisma.js";

/**
 * Find a vehicle by its primary key.
 *
 * Used by the maintenance service to validate the target vehicle
 * before creating or closing a maintenance record.
 *
 * @param {string} id - Vehicle UUID.
 * @returns {Promise<Object|null>}
 */
export async function findVehicleById(id) {
  return prisma.vehicle.findUnique({
    where: { id },
  });
}

/**
 * Count how many ACTIVE maintenance records exist for a vehicle.
 *
 * Used to enforce the rule that a vehicle cannot have more than one
 * ACTIVE maintenance record at a time.
 *
 * @param {string} vehicleId - Vehicle UUID.
 * @returns {Promise<number>}
 */
export async function countActiveMaintenanceForVehicle(vehicleId) {
  return prisma.maintenance.count({
    where: { vehicleId, status: "ACTIVE" },
  });
}

/**
 * Atomically create a maintenance record and set the vehicle status to IN_SHOP.
 *
 * Uses a Prisma transaction so both operations either succeed or both fail,
 * preventing data inconsistency.
 *
 * @param {string} vehicleId - Vehicle UUID.
 * @param {Object} maintenanceData - Validated maintenance fields.
 * @returns {Promise<Object>} The newly created maintenance record (with vehicle).
 */
export async function createMaintenanceWithVehicleUpdate(
  vehicleId,
  maintenanceData,
) {
  const [, maintenance] = await prisma.$transaction([
    // 1. Set vehicle status to IN_SHOP
    prisma.vehicle.update({
      where: { id: vehicleId },
      data: { status: "IN_SHOP" },
    }),
    // 2. Create the maintenance record
    prisma.maintenance.create({
      data: {
        vehicleId,
        ...maintenanceData,
      },
      include: {
        vehicle: {
          select: {
            id: true,
            registrationNumber: true,
            name: true,
            type: true,
            status: true,
          },
        },
      },
    }),
  ]);

  return maintenance;
}

/**
 * Retrieve maintenance records with optional filters and pagination.
 *
 * @param {Object} where - Prisma where conditions.
 * @param {number} skip - Offset.
 * @param {number} take - Limit.
 * @returns {Promise<Array>}
 */
export async function findMaintenanceRecords(where = {}, skip = 0, take = 10) {
  return prisma.maintenance.findMany({
    where,
    skip,
    take,
    include: {
      vehicle: {
        select: {
          id: true,
          registrationNumber: true,
          name: true,
          type: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Count total maintenance records matching criteria.
 *
 * @param {Object} where - Prisma where conditions.
 * @returns {Promise<number>}
 */
export async function countMaintenanceRecords(where = {}) {
  return prisma.maintenance.count({
    where,
  });
}


/**
 * Find a single maintenance record by its primary key.
 *
 * @param {string} id - Maintenance record UUID.
 * @returns {Promise<Object|null>}
 */
export async function findMaintenanceById(id) {
  return prisma.maintenance.findUnique({
    where: { id },
    include: {
      vehicle: {
        select: {
          id: true,
          registrationNumber: true,
          name: true,
          type: true,
          status: true,
        },
      },
    },
  });
}

/**
 * Atomically close a maintenance record and restore the vehicle status to AVAILABLE.
 *
 * Only called when the vehicle is not RETIRED. The service layer enforces this.
 * Uses a Prisma transaction to guarantee consistency.
 *
 * @param {string} maintenanceId - Maintenance record UUID.
 * @param {string} vehicleId - Vehicle UUID.
 * @returns {Promise<Object>} The updated (closed) maintenance record.
 */
export async function closeMaintenanceWithVehicleUpdate(
  maintenanceId,
  vehicleId,
) {
  const [, maintenance] = await prisma.$transaction([
    // 1. Restore vehicle to AVAILABLE
    prisma.vehicle.update({
      where: { id: vehicleId },
      data: { status: "AVAILABLE" },
    }),
    // 2. Close the maintenance record
    prisma.maintenance.update({
      where: { id: maintenanceId },
      data: {
        status: "CLOSED",
        completedDate: new Date(),
      },
      include: {
        vehicle: {
          select: {
            id: true,
            registrationNumber: true,
            name: true,
            type: true,
            status: true,
          },
        },
      },
    }),
  ]);

  return maintenance;
}
