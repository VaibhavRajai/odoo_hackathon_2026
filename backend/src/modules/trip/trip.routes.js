import express from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { getTrips, getTripById } from "./trip.controller.js";

const router = express.Router();

/** GET /api/trips — list, optional ?status= and ?driverId= filters. Read-only. */
router.get("/", authenticate, getTrips);

/** GET /api/trips/:id */
router.get("/:id", authenticate, getTripById);

export default router;
