import express from "express";
import { createTrip, listTrips, dispatchTrip, completeTrip, cancelTrip } from "./trips.controller.js";
import { authenticate, requireRole } from "../../middleware/authenticate.js";

const router = express.Router();

router.get("/", authenticate, requireRole("Driver", "Fleet Manager"), listTrips);
router.post("/", authenticate, requireRole("Driver", "Fleet Manager"), createTrip);
router.post("/:id/dispatch", authenticate, requireRole("Driver", "Fleet Manager"), dispatchTrip);
router.post("/:id/complete", authenticate, requireRole("Driver", "Fleet Manager"), completeTrip);
router.post("/:id/cancel", authenticate, requireRole("Driver", "Fleet Manager"), cancelTrip);

export default router;
