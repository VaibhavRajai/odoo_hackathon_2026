import express from "express";
import { authenticate, requireRole } from "../../middleware/authenticate.js";
import {
  getTrips,
  getTripById,
  createTrip,
  dispatchTrip,
  completeTrip,
  cancelTrip,
} from "./trip.controller.js";

const router = express.Router();

/** GET /api/trips — list, optional ?status= and ?driverId= filters. Read-only. */
router.get("/", authenticate, getTrips);

/** GET /api/trips/:id */
router.get("/:id", authenticate, getTripById);

/** POST /api/trips — create a Draft trip. */
router.post("/", authenticate, requireRole("Dispatcher", "Fleet Manager"), createTrip);

/** POST /api/trips/:id/dispatch */
router.post("/:id/dispatch", authenticate, requireRole("Dispatcher", "Fleet Manager"), dispatchTrip);

/** POST /api/trips/:id/complete */
router.post("/:id/complete", authenticate, requireRole("Dispatcher", "Fleet Manager"), completeTrip);

/** POST /api/trips/:id/cancel */
router.post("/:id/cancel", authenticate, requireRole("Dispatcher", "Fleet Manager"), cancelTrip);

export default router;
