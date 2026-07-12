import express from "express";
import { getMaintenanceLogs, createMaintenanceLog, closeMaintenanceLog } from "./maintenance.controller.js";
import { authenticate, requireRole } from "../../middleware/authenticate.js";

const router = express.Router();

// Fleet Manager gets all maintenance logs
router.get("/", authenticate, requireRole("Fleet Manager", "Financial Analyst"), getMaintenanceLogs);

// Create a log (send to shop)
router.post("/", authenticate, requireRole("Fleet Manager"), createMaintenanceLog);

// Close maintenance
router.post("/:id/close", authenticate, requireRole("Fleet Manager"), closeMaintenanceLog);

export default router;
