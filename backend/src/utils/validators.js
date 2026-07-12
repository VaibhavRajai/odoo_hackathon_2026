/**
 * TransitOps — shared field validators.
 * Hand-rolled, no external validation library.
 */

/** Letters, spaces, and common name punctuation only — rejects digits (e.g. a pasted phone number). */
export const NAME_REGEX = /^[A-Za-z][A-Za-z\s.'-]{1,49}$/;

/** Indian mobile number: optional +91/0 prefix, then a 6-9 leading digit and 9 more digits. */
export const CONTACT_REGEX = /^(?:\+91|0)?[6-9]\d{9}$/;

/** Indian driving license number: 2-letter state code, 2-digit RTO code, 4-digit year, 7-digit serial. Spaces/hyphens allowed as input, stripped before matching. */
export const LICENSE_NUMBER_REGEX = /^[A-Z]{2}[0-9]{2}(19|20)[0-9]{2}[0-9]{7}$/;

/** Standard email shape check — not RFC-exhaustive, just enough to catch typos. */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const LICENSE_CATEGORIES = ["LMV_TR", "MGV", "HMV"];
export const DRIVER_STATUSES = ["AVAILABLE", "ON_TRIP", "OFF_DUTY", "SUSPENDED"];

function fail(message) {
  const error = new Error(message);
  error.statusCode = 400;
  throw error;
}

export function normalizeLicenseNumber(licenseNumber) {
  return (licenseNumber || "").replace(/[\s-]/g, "").toUpperCase();
}

export function validateDriverName(name) {
  if (!name?.trim()) fail("Driver name is required.");
  if (!NAME_REGEX.test(name.trim())) {
    fail("Driver name must contain letters only (no digits) and be 2-50 characters.");
  }
}

export function validateContactNumber(contactNumber) {
  if (!contactNumber?.trim()) fail("Contact number is required.");
  if (!CONTACT_REGEX.test(contactNumber.trim())) {
    fail("Contact number must be a valid 10-digit Indian mobile number (optionally prefixed with +91).");
  }
}

export function validateLicenseNumber(licenseNumber) {
  if (!licenseNumber?.trim()) fail("License number is required.");
  const normalized = normalizeLicenseNumber(licenseNumber);
  if (!LICENSE_NUMBER_REGEX.test(normalized)) {
    fail("License number must follow the Indian DL format (e.g. MH1220110012345).");
  }
  return normalized;
}

export function validateLicenseCategory(licenseCategory) {
  if (!LICENSE_CATEGORIES.includes(licenseCategory)) {
    fail(`License category must be one of: ${LICENSE_CATEGORIES.join(", ")}.`);
  }
}

export function validateLicenseExpiry(licenseExpiry) {
  const date = new Date(licenseExpiry);
  if (Number.isNaN(date.getTime())) fail("License expiry date is invalid.");
  // Past dates are allowed deliberately — recording an already-expired
  // license is valid data entry; getExpiryStatus()/isEligible in
  // driver.service.js are what actually gate dispatch, not this check.
  return date;
}

export function validateDriverEmail(email) {
  if (!email?.trim()) fail("Email address is required.");
  if (!EMAIL_REGEX.test(email.trim())) {
    fail("Email address is invalid.");
  }
}

export function validateSafetyRatingScore(score) {
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    fail("Safety rating score must be an integer between 1 and 5.");
  }
}
