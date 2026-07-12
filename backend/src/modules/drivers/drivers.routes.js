import express from "express";
import { getAvailableDrivers } from "./drivers.controller.js";
import { authenticate, requireRole } from "../../middleware/authenticate.js";

const router = express.Router();

router.get("/available", authenticate, requireRole("Driver", "Fleet Manager"), getAvailableDrivers);

export default router;
