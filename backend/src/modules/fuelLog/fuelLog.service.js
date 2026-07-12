import * as fuelLogRepository from "./fuelLog.repository.js";

function fail(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}

/**
 * Record a fuel log — a routine refuel, not just the one auto-created on
 * trip completion. Standalone so a vehicle can be refueled outside of any
 * specific trip (e.g. topped up in the yard).
 */
export async function createFuelLog(data) {
  const { vehicleId, liters, cost, date, tripId } = data;

  if (!vehicleId) fail("vehicleId is required.", 400);

  const parsedLiters = Number(liters);
  if (!Number.isFinite(parsedLiters) || parsedLiters <= 0) {
    fail("Liters must be a number greater than 0.", 400);
  }

  const parsedCost = Number(cost);
  if (!Number.isFinite(parsedCost) || parsedCost <= 0) {
    fail("Cost must be a number greater than 0.", 400);
  }

  const vehicle = await fuelLogRepository.findVehicleById(vehicleId);
  if (!vehicle) fail("Vehicle not found.", 404);

  let parsedDate = new Date();
  if (date) {
    parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) fail("Date is invalid.", 400);
  }

  if (tripId) {
    const trip = await fuelLogRepository.findTripById(tripId);
    if (!trip) fail("Trip not found.", 404);
  }

  return fuelLogRepository.createFuelLog({
    vehicleId,
    liters: parsedLiters,
    cost: parsedCost,
    date: parsedDate,
    tripId: tripId || null,
  });
}

/**
 * List fuel logs, optionally filtered by vehicle/trip.
 */
export async function getFuelLogs(filters = {}) {
  const { vehicleId, tripId } = filters;
  const where = {};

  if (vehicleId) where.vehicleId = vehicleId;
  if (tripId) where.tripId = tripId;

  return fuelLogRepository.findFuelLogs(where);
}
