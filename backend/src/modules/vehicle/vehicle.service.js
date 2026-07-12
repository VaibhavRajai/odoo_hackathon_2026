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
   * Validate registration number format using regex.
   * Format: 2 letters (state), 2 digits (RTO), 1-2 letters (series), 4 digits (number)
   */
  const regRegex = /^[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}$/;
  if (!regRegex.test(normalizedRegistrationNumber)) {
    const error = new Error(
      "Registration number must follow the format (e.g. GJ01AB7432) and end with exactly 4 digits."
    );
    error.statusCode = 400;
    throw error;
  }

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
  const { type, status, search, page = 1, limit = 10 } = filters;

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
  const skip = (parsedPage - 1) * parsedLimit;

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
   */
  const where = {};

  /**
   * Apply vehicle type filter.
   */
  if (type && type !== "All") {
    where.type = {
      equals: type,
      mode: "insensitive",
    };
  }

  /**
   * Apply vehicle status filter.
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
   */
  if (search?.trim()) {
    where.registrationNumber = {
      contains: search.trim(),
      mode: "insensitive",
    };
  }

  const [vehicles, total] = await Promise.all([
    vehicleRepository.findVehicles(where, skip, parsedLimit),
    vehicleRepository.countVehicles(where),
  ]);

  return {
    vehicles,
    pagination: {
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit),
    },
  };
}