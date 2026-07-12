import express from "express";
import { authenticate, requireRole } from "../../middleware/authenticate.js";
import { createFuelLog, getFuelLogs } from "./fuelLog.controller.js";

const router = express.Router();

/** POST /api/fuel-logs — log a refuel. */
router.post("/", authenticate, requireRole("Dispatcher", "Fleet Manager"), createFuelLog);

/** GET /api/fuel-logs — optional ?vehicleId=, ?tripId= filters. Any authenticated role. */
router.get("/", authenticate, getFuelLogs);

export default router;
