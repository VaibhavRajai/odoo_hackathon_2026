import express from "express";

import {
  authenticate,
  requireRole,
} from "../../middleware/authenticate.js";

import {
  createVehicle,
  getAllVehicles,
  getVehicleById,
  updateVehicle,
} from "./vehicle.controller.js";

const router = express.Router();

/**
 * @route   POST /api/vehicles
 * @desc    Register a new vehicle
 * @access  Private - Fleet Manager only
 */
router.post(
  "/",
  authenticate,
  requireRole("Fleet Manager"),
  createVehicle
);

/**
 * @route   GET /api/vehicles
 * @desc    Get all vehicles
 * @access  Private - Authenticated users
 */
router.get(
  "/",
  authenticate,
  getAllVehicles
);

/**
 * @route   GET /api/vehicles/:id
 * @desc    Get a vehicle by ID
 * @access  Private - Authenticated users
 */
router.get(
  "/:id",
  authenticate,
  getVehicleById
);

/**
 * @route   PATCH /api/vehicles/:id
 * @desc    Update vehicle details
 * @access  Private - Fleet Manager only
 */
router.patch(
  "/:id",
  authenticate,
  requireRole("Fleet Manager"),
  updateVehicle
);

export default router;