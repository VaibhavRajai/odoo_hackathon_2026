import express from "express";
import { authenticate, requireRole } from "../../middleware/authenticate.js";
import {
  getFleetAnalytics,
  exportFleetCSV,
  exportFleetExcel,
  exportFleetPDF,
} from "./analytics.controller.js";

const router = express.Router();

/**
 * @route   GET /api/analytics/fleet
 * @desc    Get filtered fleet reports and operational analytics
 * @access  Private — Financial Analyst, Fleet Manager
 *
 * Optional query parameters:
 * - startDate : ISO date string (e.g. "2026-01-01")
 * - endDate   : ISO date string (e.g. "2026-07-12")
 * - vehicleId : UUID of a specific vehicle
 * - type      : Vehicle type (e.g. "Van", "Truck")
 * - status    : Vehicle status (e.g. "AVAILABLE", "ON_TRIP")
 * - region    : Region name (e.g. "North", "South")
 *
 * Examples:
 * GET /api/analytics/fleet
 * GET /api/analytics/fleet?type=Truck
 * GET /api/analytics/fleet?startDate=2026-01-01&endDate=2026-07-12
 * GET /api/analytics/fleet?type=Truck&region=West
 */
router.get(
  "/fleet",
  authenticate,
  requireRole("Financial Analyst", "Fleet Manager"),
  getFleetAnalytics
);

/**
 * @route   GET /api/analytics/fleet/export/csv
 * @desc    Export fleet analytics as CSV (currently filtered data)
 * @access  Private — Financial Analyst, Fleet Manager
 */
router.get(
  "/fleet/export/csv",
  authenticate,
  requireRole("Financial Analyst", "Fleet Manager"),
  exportFleetCSV
);

/**
 * @route   GET /api/analytics/fleet/export/excel
 * @desc    Export fleet analytics as Excel workbook
 * @access  Private — Financial Analyst, Fleet Manager
 */
router.get(
  "/fleet/export/excel",
  authenticate,
  requireRole("Financial Analyst", "Fleet Manager"),
  exportFleetExcel
);

/**
 * @route   GET /api/analytics/fleet/export/pdf
 * @desc    Export fleet analytics as PDF via Puppeteer
 * @access  Private — Financial Analyst, Fleet Manager
 */
router.get(
  "/fleet/export/pdf",
  authenticate,
  requireRole("Financial Analyst", "Fleet Manager"),
  exportFleetPDF
);

export default router;
