import * as vehicleRepository from "./vehicle.repository.js";
import prisma from "../../config/prisma.js";

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
  if (!Number.isFinite(maxLoadCapacity) || maxLoadCapacity <= 0 || maxLoadCapacity > 30000) {
    const error = new Error(
      "Maximum load capacity must be a positive number up to 30,000 kg."
    );
    error.statusCode = 400;
    throw error;
  }

  if (!Number.isFinite(odometer) || odometer < 0 || odometer > 1500000) {
    const error = new Error(
      "Odometer must be a number between 0 and 1,500,000 km."
    );
    error.statusCode = 400;
    throw error;
  }

  if (!Number.isFinite(acquisitionCost) || acquisitionCost < 0 || acquisitionCost > 100000000) {
    const error = new Error(
      "Acquisition cost must be a number between 0 and ₹10,00,00,000."
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
 * @returns {Promise<Object>} Matching vehicles.
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

  // 3.7: total operational cost (Fuel + Maintenance) computed per vehicle,
  // automatically attached to every vehicle in the response.
  const costTotals = await vehicleRepository.getCostTotalsForVehicles(vehicles.map((v) => v.id));
  const vehiclesWithCosts = vehicles.map((v) => ({
    ...v,
    ...(costTotals[v.id] ?? { totalFuelCost: 0, totalMaintenanceCost: 0, totalOperationalCost: 0 }),
  }));

  return {
    vehicles: vehiclesWithCosts,
    pagination: {
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit),
    },
  };
}

/**
 * Remove a vehicle and its associated records from the registry.
 *
 * @param {string} id - Vehicle ID.
 * @returns {Promise<Object>} The deleted vehicle.
 * @throws {Error} When vehicle is not found.
 */
export async function removeVehicle(id) {
  const vehicle = await vehicleRepository.findVehicleById(id);
  if (!vehicle) {
    const error = new Error("Vehicle not found.");
    error.statusCode = 404;
    throw error;
  }

  // Delete all maintenance records first
  await prisma.maintenance.deleteMany({
    where: { vehicleId: id },
  });

  return vehicleRepository.deleteVehicle(id);
}

/**
 * Update an existing vehicle's details.
 *
 * @param {string} id - Vehicle ID.
 * @param {Object} updateData - Vehicle details to update.
 * @returns {Promise<Object>} Updated vehicle.
 * @throws {Error} When validation or business rules fail.
 */
export async function editVehicle(id, updateData) {
  const vehicle = await vehicleRepository.findVehicleById(id);
  if (!vehicle) {
    const error = new Error("Vehicle not found.");
    error.statusCode = 404;
    throw error;
  }

  const {
    registrationNumber,
    name,
    type,
    maxLoadCapacity,
    odometer,
    acquisitionCost,
    status,
  } = updateData;

  // Validate required string fields
  if (registrationNumber !== undefined && !registrationNumber.trim()) {
    const error = new Error("Registration number is required.");
    error.statusCode = 400;
    throw error;
  }

  if (name !== undefined && !name.trim()) {
    const error = new Error("Vehicle name/model is required.");
    error.statusCode = 400;
    throw error;
  }

  if (type !== undefined && !type.trim()) {
    const error = new Error("Vehicle type is required.");
    error.statusCode = 400;
    throw error;
  }

  // Validate numeric fields
  if (maxLoadCapacity !== undefined) {
    if (!Number.isFinite(maxLoadCapacity) || maxLoadCapacity <= 0 || maxLoadCapacity > 30000) {
      const error = new Error("Maximum load capacity must be a positive number up to 30,000 kg.");
      error.statusCode = 400;
      throw error;
    }
  }

  if (odometer !== undefined) {
    if (!Number.isFinite(odometer) || odometer < 0 || odometer > 1500000) {
      const error = new Error("Odometer must be a number between 0 and 1,500,000 km.");
      error.statusCode = 400;
      throw error;
    }
  }

  if (acquisitionCost !== undefined) {
    if (!Number.isFinite(acquisitionCost) || acquisitionCost < 0 || acquisitionCost > 100000000) {
      const error = new Error("Acquisition cost must be a number between 0 and ₹10,00,00,000.");
      error.statusCode = 400;
      throw error;
    }
  }

  const payload = {};

  if (name !== undefined) payload.name = name.trim();
  if (type !== undefined) payload.type = type.trim();
  if (maxLoadCapacity !== undefined) payload.maxLoadCapacity = maxLoadCapacity;
  if (odometer !== undefined) payload.odometer = odometer;
  if (acquisitionCost !== undefined) payload.acquisitionCost = acquisitionCost;

  if (registrationNumber !== undefined) {
    const normalizedRegistrationNumber = registrationNumber.trim().toUpperCase();
    const regRegex = /^[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}$/;
    if (!regRegex.test(normalizedRegistrationNumber)) {
      const error = new Error(
        "Registration number must follow the format (e.g. GJ01AB7432) and end with exactly 4 digits."
      );
      error.statusCode = 400;
      throw error;
    }

    if (normalizedRegistrationNumber !== vehicle.registrationNumber) {
      const existingVehicle = await vehicleRepository.findVehicleByRegistrationNumber(
        normalizedRegistrationNumber
      );
      if (existingVehicle) {
        const error = new Error("A vehicle with this registration number already exists.");
        error.statusCode = 409;
        throw error;
      }
    }
    payload.registrationNumber = normalizedRegistrationNumber;
  }

  if (status !== undefined) {
    const validStatuses = ["AVAILABLE", "ON_TRIP", "IN_SHOP", "RETIRED"];
    const normalizedStatus = status.trim().toUpperCase();
    if (!validStatuses.includes(normalizedStatus)) {
      const error = new Error("Invalid vehicle status.");
      error.statusCode = 400;
      throw error;
    }
    payload.status = normalizedStatus;
  }

  return vehicleRepository.updateVehicle(id, payload);
}
