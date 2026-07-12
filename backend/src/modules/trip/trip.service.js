import prisma from "../../config/prisma.js";
import * as tripRepository from "./trip.repository.js";
import { getExpiryStatus } from "../driver/driver.service.js";

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
 * A driver is eligible for dispatch only when AVAILABLE and their license
 * hasn't expired — same rule the Safety Officer's isEligible flag uses
 * (driver.service.js), checked again here so the Dispatcher can't bypass it.
 */
function assertDriverEligible(driver) {
  if (driver.status !== "AVAILABLE") fail("Driver is not available.", 422);
  if (getExpiryStatus(driver.licenseExpiry) === "EXPIRED") {
    fail("Driver's license has expired and cannot be assigned to a trip.", 422);
  }
}

/**
 * Create a Draft trip.
 *
 * Business rules: cargo weight must not exceed the vehicle's max load
 * capacity, and both vehicle and driver must be AVAILABLE (driver also
 * checked for license expiry) before they can be assigned.
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
  if (vehicle.status !== "AVAILABLE") fail("Vehicle is not available.", 422);
  if (weight > vehicle.maxLoadCapacity) {
    fail(`Cargo weight (${weight}kg) exceeds vehicle capacity (${vehicle.maxLoadCapacity}kg).`, 422);
  }

  const driver = await tripRepository.findDriverById(driverId);
  if (!driver) fail("Driver not found.", 404);
  assertDriverEligible(driver);

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
 * Dispatch a Draft trip — re-validates vehicle/driver availability at
 * dispatch time (not just at creation, since either could have changed
 * since), then atomically flips vehicle+driver to ON_TRIP and the trip
 * to DISPATCHED.
 */
export async function dispatchTrip(id) {
  const trip = await tripRepository.findTripById(id);
  if (!trip) fail("Trip not found.", 404);
  if (trip.status !== "DRAFT") fail("Only Draft trips can be dispatched.", 422);

  const vehicle = await tripRepository.findVehicleById(trip.vehicleId);
  if (vehicle.status !== "AVAILABLE") fail("Vehicle is no longer available.", 422);

  const driver = await tripRepository.findDriverById(trip.driverId);
  assertDriverEligible(driver);

  const [, , updatedTrip] = await prisma.$transaction([
    prisma.vehicle.update({ where: { id: trip.vehicleId }, data: { status: "ON_TRIP" } }),
    prisma.driver.update({ where: { id: trip.driverId }, data: { status: "ON_TRIP" } }),
    prisma.trip.update({ where: { id }, data: { status: "DISPATCHED" }, include }),
  ]);

  return updatedTrip;
}

/**
 * Complete a Dispatched trip — records the final odometer reading and an
 * optional fuel log, and restores vehicle+driver to AVAILABLE.
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

  const operations = [
    prisma.vehicle.update({ where: { id: trip.vehicleId }, data: vehicleUpdateData }),
    prisma.driver.update({ where: { id: trip.driverId }, data: { status: "AVAILABLE" } }),
    prisma.trip.update({ where: { id }, data: { status: "COMPLETED" }, include }),
  ];

  if (fuelLiters !== undefined && fuelLiters !== null && fuelLiters !== "") {
    const liters = Number(fuelLiters);
    const cost = Number(fuelCost);
    if (!Number.isFinite(liters) || liters <= 0) fail("Fuel liters must be a positive number.", 400);
    if (!Number.isFinite(cost) || cost < 0) fail("Fuel cost must be a non-negative number.", 400);
    operations.push(
      prisma.fuelLog.create({ data: { vehicleId: trip.vehicleId, tripId: id, liters, cost } })
    );
  }

  const results = await prisma.$transaction(operations);
  return results[2];
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

  const operations = [];
  if (trip.status === "DISPATCHED") {
    operations.push(prisma.vehicle.update({ where: { id: trip.vehicleId }, data: { status: "AVAILABLE" } }));
    operations.push(prisma.driver.update({ where: { id: trip.driverId }, data: { status: "AVAILABLE" } }));
  }
  operations.push(prisma.trip.update({ where: { id }, data: { status: "CANCELLED" }, include }));

  const results = await prisma.$transaction(operations);
  return results[results.length - 1];
}
