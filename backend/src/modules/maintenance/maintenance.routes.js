import express from "express";
import { authenticate, requireRole } from "../../middleware/authenticate.js";
import {
  createMaintenance,
  getMaintenanceRecords,
  closeMaintenanceRecord,
  updateMaintenanceRecord,
} from "./maintenance.controller.js";

const router = express.Router();

/**
 * @route   POST /api/maintenance
 * @desc    Create a new maintenance record (vehicle becomes IN_SHOP)
 * @access  Private — Fleet Manager only
 *
 * Middleware flow:
 * 1. authenticate     — validates session cookie via Redis
 * 2. requireRole(...)  — ensures Fleet Manager role
 * 3. createMaintenance — business logic + DB write
 */
router.post(
  "/",
  authenticate,
  requireRole("Fleet Manager"),
  createMaintenance
);

/**
 * @route   GET /api/maintenance
 * @desc    Get maintenance records with optional filters
 * @access  Private — Authenticated users (all roles can view)
 *
 * Supported query parameters:
 *   vehicleId - Filter by vehicle UUID
 *   status    - ACTIVE | CLOSED
 *   search    - Partial registration number search
 *
 * Examples:
 *   GET /api/maintenance
 *   GET /api/maintenance?status=ACTIVE
 *   GET /api/maintenance?vehicleId=uuid
 *   GET /api/maintenance?search=GJ01
 */
router.get(
  "/",
  authenticate,
  getMaintenanceRecords
);

/**
 * @route   PATCH /api/maintenance/:id/close
 * @desc    Close an active maintenance record (vehicle returns to AVAILABLE)
 * @access  Private — Fleet Manager only
 */
router.patch(
  "/:id/close",
  authenticate,
  requireRole("Fleet Manager"),
  closeMaintenanceRecord
);

/**
 * @route   PUT /api/maintenance/:id
 * @desc    Update any field of a maintenance record at any time
 * @access  Private — Fleet Manager only
 */
router.put(
  "/:id",
  authenticate,
  requireRole("Fleet Manager"),
  updateMaintenanceRecord
);

export default router;
