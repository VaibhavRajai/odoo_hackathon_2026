import express from "express";
import { authenticate, requireRole } from "../../middleware/authenticate.js";
import {
  createDriver,
  getDrivers,
  getAvailableDrivers,
  getDriverById,
  updateDriver,
  updateDriverStatus,
  deleteDriver,
  getDashboardStats,
  validateLicenses,
  addSafetyRating,
} from "./driver.controller.js";

const router = express.Router();

// Static paths declared before "/:id" so they aren't swallowed by the param route.

/** GET /api/drivers/stats — Safety Officer dashboard KPIs. */
router.get("/stats", authenticate, requireRole("Safety Officer"), getDashboardStats);

/** GET /api/drivers/available — eligible drivers for the Dispatcher's trip-create form. */
router.get("/available", authenticate, requireRole("Dispatcher", "Fleet Manager"), getAvailableDrivers);

/** POST /api/drivers/validate-licenses — sweep + auto-suspend expired licenses. */
router.post("/validate-licenses", authenticate, requireRole("Safety Officer"), validateLicenses);

/** POST /api/drivers — register a driver profile. Safety Officer only. */
router.post("/", authenticate, requireRole("Safety Officer"), createDriver);

/** GET /api/drivers — list drivers with optional status/licenseCategory/search/expiryStatus filters. */
router.get("/", authenticate, getDrivers);

/** GET /api/drivers/:id — full driver detail (ID-card view). */
router.get("/:id", authenticate, getDriverById);

/** PATCH /api/drivers/:id — update profile fields. Safety Officer only. */
router.patch("/:id", authenticate, requireRole("Safety Officer"), updateDriver);

/** PATCH /api/drivers/:id/status — manual status change. Safety Officer only. */
router.patch("/:id/status", authenticate, requireRole("Safety Officer"), updateDriverStatus);

/** DELETE /api/drivers/:id — remove a driver profile. Safety Officer only. */
router.delete("/:id", authenticate, requireRole("Safety Officer"), deleteDriver);

/** POST /api/drivers/:id/safety-rating — post-trip 1-5 rating. Dispatcher only. */
router.post("/:id/safety-rating", authenticate, requireRole("Dispatcher"), addSafetyRating);

export default router;
