import express from "express";
import { getAllVehicles, getAvailableVehicles, getVehicleAnalytics, addFuelLog } from "./vehicles.controller.js";
import { authenticate, requireRole } from "../../middleware/authenticate.js";

const router = express.Router();

router.get("/", authenticate, requireRole("Fleet Manager", "Financial Analyst"), getAllVehicles);
router.get("/available", authenticate, requireRole("Driver", "Fleet Manager"), getAvailableVehicles);
router.get("/analytics", authenticate, requireRole("Fleet Manager", "Financial Analyst"), getVehicleAnalytics);
router.post("/:id/fuel", authenticate, requireRole("Fleet Manager", "Driver"), addFuelLog);

export default router;
