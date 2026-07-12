import * as driverRepository from "./driver.repository.js";
import { sendLicenseRenewalEmail } from "./driver.mailer.js";
import { licenseCovers } from "../../utils/licenseRules.js";
import {
  validateDriverName,
  validateContactNumber,
  validateLicenseNumber,
  validateLicenseCategory,
  validateLicenseExpiry,
  validateDriverEmail,
  validateSafetyRatingScore,
  DRIVER_STATUSES,
} from "../../utils/validators.js";

const EXPIRY_WARNING_WINDOW_DAYS = 30;
const RENEWAL_REMINDER_DAYS = 5;

function fail(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}

function daysUntil(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.floor((target - today) / (1000 * 60 * 60 * 24));
}

/**
 * Derives the license validity flag used for the Green/Yellow/Red badge.
 * Computed on read — never stored, so it's always accurate.
 */
export function getExpiryStatus(licenseExpiry) {
  const daysRemaining = daysUntil(licenseExpiry);
  if (daysRemaining < 0) return "EXPIRED";
  if (daysRemaining <= EXPIRY_WARNING_WINDOW_DAYS) return "EXPIRING_SOON";
  return "VALID";
}

/**
 * Sends (or clears) the license-renewal reminder for a single driver.
 * Called right after create/update; the "Validate Now" sweep also uses it
 * per-candidate so there is exactly one place that decides send-vs-clear.
 */
async function maybeSendRenewalReminder(driver) {
  if (!driver.email) return;
  const days = daysUntil(driver.licenseExpiry);

  if (days <= RENEWAL_REMINDER_DAYS) {
    if (!driver.renewalEmailSentAt) {
      await sendLicenseRenewalEmail(driver, days < 0);
      await driverRepository.markRenewalEmailSent(driver.id);
    }
  } else if (driver.renewalEmailSentAt) {
    await driverRepository.updateDriver(driver.id, { renewalEmailSentAt: null });
  }
}

/**
 * Attaches derived, read-only fields to a driver record for API responses.
 * `isEligible` is the single source of truth the (future) Trip/Dispatcher
 * module must read to filter the dispatch selection pool.
 */
function withDerivedFields(driver) {
  const expiryStatus = getExpiryStatus(driver.licenseExpiry);
  return {
    ...driver,
    expiryStatus,
    isEligible: driver.status !== "SUSPENDED" && expiryStatus !== "EXPIRED",
  };
}

export async function registerDriver(data) {
  const { name, licenseNumber, licenseCategory, licenseExpiry, contactNumber, email } = data;

  validateDriverName(name);
  validateContactNumber(contactNumber);
  validateDriverEmail(email);
  validateLicenseCategory(licenseCategory);
  const expiryDate = validateLicenseExpiry(licenseExpiry);
  const normalizedLicenseNumber = validateLicenseNumber(licenseNumber);

  const existing = await driverRepository.findDriverByLicenseNumber(normalizedLicenseNumber);
  if (existing) fail("A driver with this license number already exists.", 409);

  const driver = await driverRepository.createDriver({
    name: name.trim(),
    licenseNumber: normalizedLicenseNumber,
    licenseCategory,
    licenseExpiry: expiryDate,
    contactNumber: contactNumber.trim(),
    email: email.trim(),
    status: "AVAILABLE",
  });

  // Covers "past date added while creating a new driver" — sends
  // immediately since daysUntil() is already negative.
  await maybeSendRenewalReminder(driver);

  return withDerivedFields(driver);
}

export async function updateDriverProfile(id, data) {
  const existing = await driverRepository.findDriverById(id);
  if (!existing) fail("Driver not found.", 404);

  const { name, licenseNumber, licenseCategory, licenseExpiry, contactNumber, email } = data;

  validateDriverName(name);
  validateContactNumber(contactNumber);
  validateDriverEmail(email);
  validateLicenseCategory(licenseCategory);
  const expiryDate = validateLicenseExpiry(licenseExpiry);
  const normalizedLicenseNumber = validateLicenseNumber(licenseNumber);

  if (normalizedLicenseNumber !== existing.licenseNumber) {
    const duplicate = await driverRepository.findDriverByLicenseNumber(normalizedLicenseNumber);
    if (duplicate) fail("A driver with this license number already exists.", 409);
  }

  const updateData = {
    name: name.trim(),
    licenseNumber: normalizedLicenseNumber,
    licenseCategory,
    licenseExpiry: expiryDate,
    contactNumber: contactNumber.trim(),
    email: email.trim(),
  };

  // Auto-clear a suspension that was caused by the now-fixed expired license.
  // Only when the prior expiry had actually lapsed — a suspension for a
  // safety incident (prior expiry still valid) is left untouched here.
  const wasExpired = getExpiryStatus(existing.licenseExpiry) === "EXPIRED";
  const isNowExpired = getExpiryStatus(expiryDate) === "EXPIRED";
  if (existing.status === "SUSPENDED" && wasExpired && !isNowExpired) {
    updateData.status = "AVAILABLE";
  }

  // Editing the expiry can move a driver into (or out of) the reminder
  // window right now — check with the just-updated row.
  const driver = await driverRepository.updateDriver(id, updateData);
  await maybeSendRenewalReminder(driver);

  return withDerivedFields(driver);
}

// Statuses the Safety Officer may set by hand. ON_TRIP is deliberately
// excluded — it is only ever a side effect of a Dispatcher dispatching or
// completing/cancelling a real Trip row, never a manual toggle.
const MANUALLY_SETTABLE_STATUSES = ["AVAILABLE", "OFF_DUTY", "SUSPENDED"];

export async function updateDriverStatus(id, status) {
  if (!DRIVER_STATUSES.includes(status)) {
    fail(`Status must be one of: ${DRIVER_STATUSES.join(", ")}.`, 400);
  }

  const existing = await driverRepository.findDriverById(id);
  if (!existing) fail("Driver not found.", 404);

  // A driver already On Trip is tied to a live Trip row — only completing
  // or cancelling that trip may move them off it, never a manual override.
  if (existing.status === "ON_TRIP") {
    fail(
      "Driver is currently on a dispatched trip — status changes only when the trip is completed or cancelled.",
      409
    );
  }

  if (!MANUALLY_SETTABLE_STATUSES.includes(status)) {
    fail("On Trip can only be set automatically when a trip is dispatched, not changed manually.", 400);
  }

  const driver = await driverRepository.updateDriver(id, { status });
  return withDerivedFields(driver);
}

export async function removeDriver(id) {
  const existing = await driverRepository.findDriverById(id);
  if (!existing) fail("Driver not found.", 404);
  await driverRepository.deleteDriver(id);
}

export async function getDriverById(id) {
  const driver = await driverRepository.findDriverById(id);
  if (!driver) fail("Driver not found.", 404);
  return withDerivedFields(driver);
}

/**
 * Retrieve drivers for the Drivers screen.
 *
 * Supported filters: status, licenseCategory, search (name or license number),
 * expiryStatus (VALID/EXPIRING_SOON/EXPIRED — derived, applied after fetch).
 */
export async function getDrivers(filters = {}) {
  const { status, licenseCategory, search, expiryStatus } = filters;

  const where = {};

  if (status && status !== "All") {
    const normalizedStatus = status.trim().toUpperCase();
    if (!DRIVER_STATUSES.includes(normalizedStatus)) {
      fail(`Invalid driver status. Allowed values are ${DRIVER_STATUSES.join(", ")}.`, 400);
    }
    where.status = normalizedStatus;
  }

  if (licenseCategory && licenseCategory !== "All") {
    where.licenseCategory = licenseCategory;
  }

  if (search?.trim()) {
    where.OR = [
      { name: { contains: search.trim(), mode: "insensitive" } },
      { licenseNumber: { contains: search.trim(), mode: "insensitive" } },
    ];
  }

  const drivers = (await driverRepository.findDrivers(where)).map(withDerivedFields);

  if (expiryStatus && expiryStatus !== "All") {
    return drivers.filter((d) => d.expiryStatus === expiryStatus);
  }

  return drivers;
}

/**
 * Drivers eligible for trip assignment, optionally narrowed to those
 * licensed for a specific vehicle, ranked into a recommendation.
 *
 * Ranking: safety score first (small penalty if the license is expiring
 * soon — still eligible, just not the first choice), then rating count
 * (more completed/rated trips) as an experience tie-break. The top result
 * is flagged `recommended: true` for the dispatch-create form to
 * auto-select and badge.
 *
 * @param {string} [vehicleId] - If given, drivers whose license category
 *   doesn't cover this vehicle's weight class are excluded entirely.
 */
export async function getAvailableDrivers(vehicleId) {
  let vehicle = null;
  if (vehicleId) {
    vehicle = await driverRepository.findVehicleById(vehicleId);
    if (!vehicle) fail("Vehicle not found.", 404);
  }

  const drivers = await getDrivers({ status: "AVAILABLE" });
  let eligible = drivers.filter((d) => d.isEligible);

  if (vehicle) {
    eligible = eligible.filter((d) => licenseCovers(d.licenseCategory, vehicle));
  }

  const rankScore = (d) => d.safetyScore - (d.expiryStatus === "EXPIRING_SOON" ? 0.5 : 0);

  const ranked = [...eligible].sort((a, b) => {
    const diff = rankScore(b) - rankScore(a);
    if (diff !== 0) return diff;
    return b.safetyRatingCount - a.safetyRatingCount;
  });

  return ranked.map((d, index) => ({ ...d, recommended: index === 0 }));
}

/**
 * KPI counts for the Safety Officer dashboard.
 */
export async function getDashboardStats() {
  const [total, byStatus, drivers] = await Promise.all([
    driverRepository.countAllDrivers(),
    driverRepository.countDriversByStatus(),
    driverRepository.findDrivers(),
  ]);

  const expiry = { VALID: 0, EXPIRING_SOON: 0, EXPIRED: 0 };
  for (const driver of drivers) {
    expiry[getExpiryStatus(driver.licenseExpiry)] += 1;
  }

  return {
    totalDrivers: total,
    available: byStatus.AVAILABLE || 0,
    onTrip: byStatus.ON_TRIP || 0,
    offDuty: byStatus.OFF_DUTY || 0,
    suspended: byStatus.SUSPENDED || 0,
    licenseValid: expiry.VALID,
    licenseExpiringSoon: expiry.EXPIRING_SOON,
    licenseExpired: expiry.EXPIRED,
  };
}

/**
 * "Validate Now" sweep — the one action that actually writes a status
 * change from an expiry check, and the mechanism (no cron installed) for
 * catching drivers who drift into the 5-day renewal window between edits.
 * The Green/Yellow/Red badge itself is always derived live and needs no sweep.
 */
export async function validateLicenses() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const suspendedCount = await driverRepository.suspendExpiredDrivers(today);

  const threshold = new Date(today);
  threshold.setDate(threshold.getDate() + RENEWAL_REMINDER_DAYS);

  const candidates = await driverRepository.findDriversNeedingRenewalEmail(threshold);
  for (const driver of candidates) {
    await maybeSendRenewalReminder(driver);
  }
  await driverRepository.clearStaleRenewalFlags(threshold);

  return { suspendedCount, remindersSent: candidates.length };
}

/**
 * Records a post-trip safety rating and recomputes the driver's cached
 * average score. Called by the Dispatcher's trip-completion flow.
 */
export async function addSafetyRating({ driverId, tripId, score }) {
  validateSafetyRatingScore(score);

  const driver = await driverRepository.findDriverById(driverId);
  if (!driver) fail("Driver not found.", 404);

  const trip = await driverRepository.findTripById(tripId);
  if (!trip) fail("Trip not found.", 404);
  if (trip.driverId !== driverId) fail("This trip was not assigned to this driver.", 400);

  try {
    await driverRepository.createSafetyRating({ driverId, tripId, score });
  } catch (error) {
    if (error.code === "P2002") fail("A safety rating already exists for this trip.", 409);
    throw error;
  }

  // SafetyRating rows are the source of truth — recompute from the full
  // history rather than incrementing a cached figure, so the cache can
  // never drift from the underlying data.
  const { average, count } = await driverRepository.aggregateSafetyRatings(driverId);

  const updated = await driverRepository.updateDriver(driverId, {
    safetyScore: average,
    safetyRatingCount: count,
  });

  return withDerivedFields(updated);
}
