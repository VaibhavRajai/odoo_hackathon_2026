import express from "express";
import { authenticate, requireRole } from "../../middleware/authenticate.js";
import {
  getFleetDashboard,
  exportFleetPDF,
  exportFleetExcel,
} from "./dashboard.controller.js";

const router = express.Router();

/**
 * @route   GET /api/dashboard/fleet
 * @desc    Get Fleet Manager dashboard KPIs, chart data, and filter options
 * @access  Private — Fleet Manager
 *
 * Optional query parameters:
 * - type   : Vehicle type filter (e.g. "Van", "Truck")
 * - status : Vehicle status filter (e.g. "AVAILABLE", "ON_TRIP")
 * - region : Region filter (e.g. "North", "South")
 *
 * Examples:
 * GET /api/dashboard/fleet
 * GET /api/dashboard/fleet?type=Van
 * GET /api/dashboard/fleet?status=AVAILABLE
 * GET /api/dashboard/fleet?region=West
 * GET /api/dashboard/fleet?type=Truck&region=North
 */
router.get("/fleet", authenticate, requireRole("Fleet Manager"), getFleetDashboard);

/**
 * @route   GET /api/dashboard/fleet/export/pdf
 * @desc    Export Fleet Manager dashboard as a PDF (via Puppeteer headless Chromium)
 * @access  Private — Fleet Manager
 *
 * Supports same query params as /fleet endpoint.
 * Returns a binary PDF download.
 */
router.get(
  "/fleet/export/pdf",
  authenticate,
  requireRole("Fleet Manager"),
  exportFleetPDF
);

/**
 * @route   GET /api/dashboard/fleet/export/excel
 * @desc    Export Fleet Manager dashboard as an Excel workbook (multi-sheet)
 * @access  Private — Fleet Manager
 *
 * Supports same query params as /fleet endpoint.
 * Returns an .xlsx binary download.
 */
router.get(
  "/fleet/export/excel",
  authenticate,
  requireRole("Fleet Manager"),
  exportFleetExcel
);

export default router;
