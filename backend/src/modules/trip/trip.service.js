import prisma from "../../config/prisma.js";
import * as tripRepository from "./trip.repository.js";
import { getExpiryStatus } from "../driver/driver.service.js";
import { licenseCovers, requiredLicenseCategory } from "../../utils/licenseRules.js";

const include = {
  vehicle: { select: { id: true, registrationNumber: true, name: true } },
  driver: { select: { id: true, name: true, status: true } },
};

function fail(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}

/**
 * Every condition that must hold before a driver+vehicle pair can be
 * assigned to a trip:
 *  - vehicle not RETIRED/IN_SHOP/ON_TRIP (must be AVAILABLE)
 *  - driver not SUSPENDED/OFF_DUTY/ON_TRIP (must be AVAILABLE)
 *  - driver's license not expired
 *  - driver's license category covers the vehicle's weight class
 *  - cargo weight within the vehicle's max load capacity
 * Checked at both create and dispatch time — either could have changed
 * between the two (e.g. driver got suspended after the Draft was made).
 */
function assertAssignable({ vehicle, driver, cargoWeight }) {
  if (vehicle.status !== "AVAILABLE") {
    fail(`Vehicle is not available (currently ${vehicle.status}).`, 422);
  }
  if (cargoWeight !== undefined && cargoWeight > vehicle.maxLoadCapacity) {
    fail(`Cargo weight (${cargoWeight}kg) exceeds vehicle capacity (${vehicle.maxLoadCapacity}kg).`, 422);
  }

  if (driver.status !== "AVAILABLE") {
    fail(`Driver is not available (currently ${driver.status}).`, 422);
  }
  if (getExpiryStatus(driver.licenseExpiry) === "EXPIRED") {
    fail("Driver's license has expired and cannot be assigned to a trip.", 422);
  }
  if (!licenseCovers(driver.licenseCategory, vehicle)) {
    fail(
      `Driver's ${driver.licenseCategory.replace("_", "-")} license cannot operate this vehicle ` +
        `(requires ${requiredLicenseCategory(vehicle).replace("_", "-")} or higher).`,
      422
    );
  }
}

/**
 * Create a Draft trip. Validation only — creating a Draft doesn't lock the
 * vehicle/driver, so no transaction is needed here (locking happens at
 * dispatch).
 */
export async function createTrip(data) {
  const { source, destination, cargoWeight, plannedDistance, vehicleId, driverId } = data;

  if (!source?.trim()) fail("Source is required.", 400);
  if (!destination?.trim()) fail("Destination is required.", 400);
  if (!vehicleId) fail("vehicleId is required.", 400);
  if (!driverId) fail("driverId is required.", 400);

  const weight = Number(cargoWeight);
  if (!Number.isFinite(weight) || weight <= 0) fail("Cargo weight must be a number greater than 0.", 400);

  const distance = Number(plannedDistance);
  if (!Number.isFinite(distance) || distance <= 0) fail("Planned distance must be a number greater than 0.", 400);

  const vehicle = await tripRepository.findVehicleById(vehicleId);
  if (!vehicle) fail("Vehicle not found.", 404);

  const driver = await tripRepository.findDriverById(driverId);
  if (!driver) fail("Driver not found.", 404);

  assertAssignable({ vehicle, driver, cargoWeight: weight });

  return tripRepository.createTrip({
    source: source.trim(),
    destination: destination.trim(),
    cargoWeight: weight,
    plannedDistance: distance,
    vehicleId,
    driverId,
    status: "DRAFT",
  });
}

/**
 * Dispatch a Draft trip.
 *
 * The whole check-and-lock sequence runs inside one interactive
 * transaction using conditional `updateMany` calls (vehicle/driver/trip
 * each guarded by their expected current status). If two dispatch
 * requests race for the same driver or vehicle, the second one's
 * conditional update affects zero rows — we throw, and Prisma rolls back
 * everything it already changed in this transaction. Without this, two
 * concurrent dispatches could both pass a plain read-then-write check and
 * double-book the same driver/vehicle onto two trips at once.
 */
export async function dispatchTrip(id) {
  const trip = await tripRepository.findTripById(id);
  if (!trip) fail("Trip not found.", 404);
  if (trip.status !== "DRAFT") fail("Only Draft trips can be dispatched.", 422);

  const vehicle = await tripRepository.findVehicleById(trip.vehicleId);
  const driver = await tripRepository.findDriverById(trip.driverId);
  assertAssignable({ vehicle, driver, cargoWeight: trip.cargoWeight });

  return prisma.$transaction(async (tx) => {
    const vehicleLock = await tx.vehicle.updateMany({
      where: { id: trip.vehicleId, status: "AVAILABLE" },
      data: { status: "ON_TRIP" },
    });
    if (vehicleLock.count === 0) fail("Vehicle was assigned to another trip in the meantime. Please retry.", 409);

    const driverLock = await tx.driver.updateMany({
      where: { id: trip.driverId, status: "AVAILABLE" },
      data: { status: "ON_TRIP" },
    });
    if (driverLock.count === 0) fail("Driver was assigned to another trip in the meantime. Please retry.", 409);

    const tripLock = await tx.trip.updateMany({
      where: { id, status: "DRAFT" },
      data: { status: "DISPATCHED" },
    });
    if (tripLock.count === 0) fail("Trip was already dispatched or cancelled. Please refresh.", 409);

    return tx.trip.findUnique({ where: { id }, include });
  });
}

/**
 * Complete a Dispatched trip — records the final odometer reading and an
 * optional fuel log, restores vehicle+driver to AVAILABLE. Same
 * conditional-update-inside-a-transaction pattern as dispatch, guarding
 * against a trip being completed/cancelled twice concurrently.
 *
 * Safety score is intentionally NOT touched here — that's a separate step
 * via POST /api/drivers/:id/safety-rating, left for the Dispatcher's
 * post-trip rating UI to call once built.
 */
export async function completeTrip(id, { finalOdometer, fuelLiters, fuelCost }) {
  const trip = await tripRepository.findTripById(id);
  if (!trip) fail("Trip not found.", 404);
  if (trip.status !== "DISPATCHED") fail("Only Dispatched trips can be completed.", 422);

  const vehicleUpdateData = { status: "AVAILABLE" };
  if (finalOdometer !== undefined && finalOdometer !== null && finalOdometer !== "") {
    const odometer = Number(finalOdometer);
    if (!Number.isFinite(odometer) || odometer < 0) fail("Final odometer must be a non-negative number.", 400);
    vehicleUpdateData.odometer = odometer;
  }

  let liters, cost;
  if (fuelLiters !== undefined && fuelLiters !== null && fuelLiters !== "") {
    liters = Number(fuelLiters);
    cost = Number(fuelCost);
    if (!Number.isFinite(liters) || liters <= 0) fail("Fuel liters must be a positive number.", 400);
    if (!Number.isFinite(cost) || cost < 0) fail("Fuel cost must be a non-negative number.", 400);
  }

  return prisma.$transaction(async (tx) => {
    const tripLock = await tx.trip.updateMany({
      where: { id, status: "DISPATCHED" },
      data: { status: "COMPLETED" },
    });
    if (tripLock.count === 0) fail("Trip was already completed or cancelled. Please refresh.", 409);

    await tx.vehicle.update({ where: { id: trip.vehicleId }, data: vehicleUpdateData });
    await tx.driver.update({ where: { id: trip.driverId }, data: { status: "AVAILABLE" } });

    if (liters !== undefined) {
      await tx.fuelLog.create({ data: { vehicleId: trip.vehicleId, tripId: id, liters, cost } });
    }

    return tx.trip.findUnique({ where: { id }, include });
  });
}

/**
 * Cancel a Draft or Dispatched trip. Only a Dispatched trip needs its
 * vehicle/driver restored — a Draft trip never locked them in the first
 * place.
 */
export async function cancelTrip(id) {
  const trip = await tripRepository.findTripById(id);
  if (!trip) fail("Trip not found.", 404);
  if (trip.status !== "DRAFT" && trip.status !== "DISPATCHED") {
    fail("Only Draft or Dispatched trips can be cancelled.", 422);
  }

  const wasDispatched = trip.status === "DISPATCHED";

  return prisma.$transaction(async (tx) => {
    const tripLock = await tx.trip.updateMany({
      where: { id, status: trip.status },
      data: { status: "CANCELLED" },
    });
    if (tripLock.count === 0) fail("Trip was already completed or cancelled. Please refresh.", 409);

    if (wasDispatched) {
      await tx.vehicle.update({ where: { id: trip.vehicleId }, data: { status: "AVAILABLE" } });
      await tx.driver.update({ where: { id: trip.driverId }, data: { status: "AVAILABLE" } });
    }

    return tx.trip.findUnique({ where: { id }, include });
  });
}
