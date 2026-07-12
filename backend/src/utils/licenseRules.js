/**
 * License category vs. vehicle weight class.
 *
 * Thresholds match the Indian commercial-license classes:
 * LMV-TR (light, transport) up to 7,500kg GVW, MGV (medium goods) up to
 * 12,000kg, HMV/HGMV (heavy) above that. A higher class also covers every
 * class below it (an HMV holder may drive an MGV/LMV-TR vehicle).
 */

const CATEGORY_RANK = { LMV_TR: 0, MGV: 1, HMV: 2 };

const LMV_TR_MAX_KG = 7500;
const MGV_MAX_KG = 12000;

export function requiredLicenseCategory(vehicle) {
  if (vehicle.maxLoadCapacity <= LMV_TR_MAX_KG) return "LMV_TR";
  if (vehicle.maxLoadCapacity <= MGV_MAX_KG) return "MGV";
  return "HMV";
}

export function licenseCovers(driverLicenseCategory, vehicle) {
  const required = requiredLicenseCategory(vehicle);
  return CATEGORY_RANK[driverLicenseCategory] >= CATEGORY_RANK[required];
}
