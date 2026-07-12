/**
 * Client-side mirror of backend/src/utils/validators.js.
 * Kept in sync manually — two separate runtimes (Next.js / Express), no shared package.
 * Gives instant popup feedback; the backend re-validates as the source of truth.
 */

export const NAME_REGEX = /^[A-Za-z][A-Za-z\s.'-]{1,49}$/;
export const CONTACT_REGEX = /^(?:\+91|0)?[6-9]\d{9}$/;
export const LICENSE_NUMBER_REGEX = /^[A-Z]{2}[0-9]{2}(19|20)[0-9]{2}[0-9]{7}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeLicenseNumber(licenseNumber: string): string {
  return (licenseNumber || "").replace(/[\s-]/g, "").toUpperCase();
}

export function validateDriverName(name: string): string | null {
  if (!name.trim()) return "Driver name is required.";
  if (!NAME_REGEX.test(name.trim())) {
    return "Driver name must contain letters only (no digits) and be 2-50 characters.";
  }
  return null;
}

export function validateContactNumber(contactNumber: string): string | null {
  if (!contactNumber.trim()) return "Contact number is required.";
  if (!CONTACT_REGEX.test(contactNumber.trim())) {
    return "Contact number must be a valid 10-digit Indian mobile number (optionally prefixed with +91).";
  }
  return null;
}

export function validateLicenseNumber(licenseNumber: string): string | null {
  if (!licenseNumber.trim()) return "License number is required.";
  if (!LICENSE_NUMBER_REGEX.test(normalizeLicenseNumber(licenseNumber))) {
    return "License number must follow the Indian DL format (e.g. MH1220110012345).";
  }
  return null;
}

export function validateDriverEmail(email: string): string | null {
  if (!email.trim()) return "Email address is required.";
  if (!EMAIL_REGEX.test(email.trim())) return "Email address is invalid.";
  return null;
}

export function validateLicenseExpiry(licenseExpiry: string): string | null {
  if (!licenseExpiry) return "License expiry date is required.";
  const date = new Date(licenseExpiry);
  if (Number.isNaN(date.getTime())) return "License expiry date is invalid.";
  // Past dates allowed — an already-expired license is valid data entry.
  return null;
}
