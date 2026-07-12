import * as vehicleRepository from "./vehicle.repository.js";

/**
 * Register a new vehicle in the TransitOps vehicle registry.
 *
 * Business Rules:
 * 1. Registration number is required.
 * 2. Registration number must be unique.
 * 3. Vehicle name/model is required.
 * 4. Vehicle type is required.
 * 5. Maximum load capacity cannot be negative.
 * 6. Odometer cannot be negative.
 * 7. Acquisition cost cannot be negative.
 * 8. Every newly registered vehicle starts with AVAILABLE status.
 *
 * @param {Object} vehicleData - Vehicle data received from the controller.
 * @returns {Promise<Object>} Newly registered vehicle.
 * @throws {Error} When validation or business rules fail.
 */
export async function registerVehicle(vehicleData) {
  const {
    registrationNumber,
    name,
    type,
    maxLoadCapacity,
    odometer,
    acquisitionCost,
  } = vehicleData;

  /**
   * Validate required string fields.
   */
  if (!registrationNumber?.trim()) {
    const error = new Error("Registration number is required.");
    error.statusCode = 400;
    throw error;
  }

  if (!name?.trim()) {
    const error = new Error("Vehicle name/model is required.");
    error.statusCode = 400;
    throw error;
  }

  if (!type?.trim()) {
    const error = new Error("Vehicle type is required.");
    error.statusCode = 400;
    throw error;
  }

  /**
   * Validate numeric fields.
   *
   * Number.isFinite() ensures values such as undefined, null,
   * NaN, and Infinity are not accepted as valid vehicle data.
   */
  if (!Number.isFinite(maxLoadCapacity) || maxLoadCapacity <= 0) {
    const error = new Error(
      "Maximum load capacity must be a number greater than 0."
    );
    error.statusCode = 400;
    throw error;
  }

  if (!Number.isFinite(odometer) || odometer < 0) {
    const error = new Error(
      "Odometer must be a number greater than or equal to 0."
    );
    error.statusCode = 400;
    throw error;
  }

  if (!Number.isFinite(acquisitionCost) || acquisitionCost < 0) {
    const error = new Error(
      "Acquisition cost must be a number greater than or equal to 0."
    );
    error.statusCode = 400;
    throw error;
  }

  /**
   * Normalize the registration number before storing it.
   *
   * Example:
   * " gj01ab5432 " → "GJ01AB5432"
   *
   * This prevents logically identical registration numbers from
   * being stored with different casing.
   */
  const normalizedRegistrationNumber =
    registrationNumber.trim().toUpperCase();

  /**
   * Check whether the registration number already exists.
   *
   * The problem statement explicitly requires vehicle
   * registration numbers to be unique.
   */
  const existingVehicle =
    await vehicleRepository.findVehicleByRegistrationNumber(
      normalizedRegistrationNumber
    );

  if (existingVehicle) {
    const error = new Error(
      "A vehicle with this registration number already exists."
    );
    error.statusCode = 409;
    throw error;
  }

  /**
   * Create the vehicle.
   *
   * Status is intentionally NOT accepted from the client.
   * Every newly registered vehicle starts as AVAILABLE.
   */
  return vehicleRepository.createVehicle({
    registrationNumber: normalizedRegistrationNumber,
    name: name.trim(),
    type: type.trim(),
    maxLoadCapacity,
    odometer,
    acquisitionCost,
    status: "AVAILABLE",
  });
}

/**
 * Retrieve vehicles for the Vehicle Registry screen.
 *
 * Supported query filters:
 * - type
 * - status
 * - search
 *
 * Example:
 * GET /api/vehicles?type=Van&status=AVAILABLE&search=GJ01
 *
 * @param {Object} filters - Query parameters received from the controller.
 * @returns {Promise<Array>} Matching vehicles.
 * @throws {Error} When an invalid status is provided.
 */
export async function getVehicles(filters = {}) {
  const { type, status, search } = filters;

  /**
   * Valid vehicle statuses defined by the TransitOps requirements.
   */
  const validStatuses = [
    "AVAILABLE",
    "ON_TRIP",
    "IN_SHOP",
    "RETIRED",
  ];

  /**
   * Build the Prisma WHERE condition dynamically.
   *
   * An empty object means:
   * "Return all vehicles."
   */
  const where = {};

  /**
   * Apply vehicle type filter.
   *
   * Example:
   * GET /api/vehicles?type=Van
   */
  if (type && type !== "All") {
    where.type = {
      equals: type,
      mode: "insensitive",
    };
  }

  /**
   * Apply vehicle status filter.
   *
   * The frontend may send values such as:
   * AVAILABLE
   * ON_TRIP
   * IN_SHOP
   * RETIRED
   */
  if (status && status !== "All") {
    const normalizedStatus = status.trim().toUpperCase();

    if (!validStatuses.includes(normalizedStatus)) {
      const error = new Error(
        "Invalid vehicle status. Allowed values are AVAILABLE, ON_TRIP, IN_SHOP, and RETIRED."
      );
      error.statusCode = 400;
      throw error;
    }

    where.status = normalizedStatus;
  }

  /**
   * Apply registration number search.
   *
   * Example:
   * GET /api/vehicles?search=GJ01
   *
   * This performs a partial, case-insensitive search.
   */
  if (search?.trim()) {
    where.registrationNumber = {
      contains: search.trim(),
      mode: "insensitive",
    };
  }

  return vehicleRepository.findVehicles(where);
}