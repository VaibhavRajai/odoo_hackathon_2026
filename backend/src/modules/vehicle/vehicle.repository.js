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
 * Retrieve vehicles from the master vehicle registry.
 *
 * Supports optional filtering by:
 * - Vehicle type
 * - Vehicle status
 * - Registration number search
 *
 * The filter object is prepared by the service layer and passed
 * to this repository for database execution.
 *
 * @param {Object} where - Prisma filtering conditions.
 * @returns {Promise<Array>} List of matching vehicles.
 */
export async function findVehicles(where = {}) {
  return prisma.vehicle.findMany({
    where,

    orderBy: {
      createdAt: "desc",
    },
  });
}