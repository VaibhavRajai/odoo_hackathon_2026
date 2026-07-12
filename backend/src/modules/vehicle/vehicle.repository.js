import prisma from "../../config/prisma.js";

/**
 * Find a vehicle by its unique registration number.
 *
 * Used before vehicle creation to check whether another vehicle
 * with the same registration number already exists.
 *
 * @param {string} registrationNumber - Unique vehicle registration number.
 * @returns {Promise<Object|null>} Matching vehicle or null if not found.
 */
export async function findVehicleByRegistrationNumber(registrationNumber) {
  return prisma.vehicle.findUnique({
    where: {
      registrationNumber,
    },
  });
}

/**
 * Create a new vehicle in the database.
 *
 * This repository function only performs the database operation.
 * Business rules such as default vehicle status and duplicate
 * registration checks are handled by the service layer.
 *
 * @param {Object} vehicleData - Validated vehicle data.
 * @returns {Promise<Object>} Newly created vehicle.
 */
export async function createVehicle(vehicleData) {
  return prisma.vehicle.create({
    data: vehicleData,
  });
}

/**
 * Retrieve vehicles from the master vehicle registry with pagination.
 *
 * @param {Object} where - Prisma filtering conditions.
 * @param {number} skip - Offset.
 * @param {number} take - Limit.
 * @returns {Promise<Array>} List of matching vehicles.
 */
export async function findVehicles(where = {}, skip = 0, take = 10) {
  return prisma.vehicle.findMany({
    where,
    skip,
    take,
    orderBy: {
      createdAt: "desc",
    },
  });
}

/**
 * Count total number of vehicles matching criteria.
 *
 * @param {Object} where - Prisma filtering conditions.
 * @returns {Promise<number>}
 */
export async function countVehicles(where = {}) {
  return prisma.vehicle.count({
    where,
  });
}

/**
 * Total fuel + maintenance cost per vehicle, for a given set of vehicle IDs.
 * One grouped aggregate query per cost source (not N+1 per vehicle).
 *
 * Maintenance cost sums ALL records regardless of ACTIVE/CLOSED — the cost
 * was incurred when logged, not when the record closes.
 *
 * @param {string[]} vehicleIds
 * @returns {Promise<Record<string, { totalFuelCost: number, totalMaintenanceCost: number, totalOperationalCost: number }>>}
 */
export async function getCostTotalsForVehicles(vehicleIds) {
  if (vehicleIds.length === 0) return {};

  const [fuelSums, maintenanceSums] = await Promise.all([
    prisma.fuelLog.groupBy({
      by: ["vehicleId"],
      where: { vehicleId: { in: vehicleIds } },
      _sum: { cost: true },
    }),
    prisma.maintenance.groupBy({
      by: ["vehicleId"],
      where: { vehicleId: { in: vehicleIds } },
      _sum: { cost: true },
    }),
  ]);

  const fuelMap = Object.fromEntries(fuelSums.map((r) => [r.vehicleId, r._sum.cost ?? 0]));
  const maintenanceMap = Object.fromEntries(maintenanceSums.map((r) => [r.vehicleId, r._sum.cost ?? 0]));

  return Object.fromEntries(
    vehicleIds.map((id) => {
      const totalFuelCost = fuelMap[id] ?? 0;
      const totalMaintenanceCost = maintenanceMap[id] ?? 0;
      return [id, { totalFuelCost, totalMaintenanceCost, totalOperationalCost: totalFuelCost + totalMaintenanceCost }];
    })
  );
}

/**
 * Find a vehicle by its unique ID.
 *
 * @param {string} id - Vehicle ID.
 * @returns {Promise<Object|null>} Matching vehicle or null.
 */
export async function findVehicleById(id) {
  return prisma.vehicle.findUnique({
    where: { id },
  });
}

/**
 * Delete a vehicle by its ID.
 *
 * @param {string} id - Vehicle ID.
 * @returns {Promise<Object>} Deleted vehicle.
 */
export async function deleteVehicle(id) {
  return prisma.vehicle.delete({
    where: { id },
  });
}

/**
 * Update a vehicle's data by its ID.
 *
 * @param {string} id - Vehicle ID.
 * @param {Object} data - Fields to update.
 * @returns {Promise<Object>} Updated vehicle object.
 */
export async function updateVehicle(id, data) {
  return prisma.vehicle.update({
    where: { id },
    data,
  });
}