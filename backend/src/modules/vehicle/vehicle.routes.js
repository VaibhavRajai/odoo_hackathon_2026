import express from "express";

import { authenticate, requireRole } from "../../middleware/authenticate.js";

import { createVehicle, getVehicles, deleteVehicle, updateVehicle } from "./vehicle.controller.js";

const router = express.Router();

/**
 * @route   POST /api/vehicles
 * @desc    Register a new vehicle in the master vehicle registry
 * @access  Private - Fleet Manager only
 *
 * Middleware Flow:
 * 1. authenticate
 *    - Reads the session cookie.
 *    - Validates the session in Redis.
 *    - Attaches the session data to req.user.
 *
 * 2. requireRole("Fleet Manager")
 *    - Checks whether the authenticated user has the Fleet Manager role.
 *
 * 3. createVehicle
 *    - Executes only when authentication and authorization succeed.
 */
router.post("/", authenticate, requireRole("Fleet Manager"), createVehicle);

/**
 * @route   GET /api/vehicles
 * @desc    Get the vehicle registry with optional search and filters
 * @access  Private - Authenticated users
 *
 * Supported Query Parameters:
 * - type
 * - status
 * - search
 *
 * Examples:
 * GET /api/vehicles
 * GET /api/vehicles?type=Van
 * GET /api/vehicles?status=AVAILABLE
 * GET /api/vehicles?search=GJ01
 */
router.get("/", authenticate, getVehicles);

/**
 * @route   DELETE /api/vehicles/:id
 * @desc    Remove a vehicle and its associated records from registry
 * @access  Private - Fleet Manager only
 */
router.delete("/:id", authenticate, requireRole("Fleet Manager"), deleteVehicle);

/**
 * @route   PUT /api/vehicles/:id
 * @desc    Update a vehicle's details
 * @access  Private - Fleet Manager only
 */
router.put("/:id", authenticate, requireRole("Fleet Manager"), updateVehicle);

export default router;
