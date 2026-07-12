import * as tripRepository from "./trip.repository.js";

const VALID_STATUSES = ["DRAFT", "DISPATCHED", "COMPLETED", "CANCELLED"];

/**
 * @route GET /api/trips
 * @desc  Read-only trip list — Safety Officer consumes this to view driver
 *        activity. Trip creation/dispatch belongs to the Dispatcher module.
 */
export async function getTrips(req, res, next) {
  try {
    const { status, driverId } = req.query;
    const where = {};

    if (status && status !== "All") {
      const normalized = status.trim().toUpperCase();
      if (!VALID_STATUSES.includes(normalized)) {
        return res.status(400).json({
          success: false,
          message: `Invalid trip status. Allowed values are ${VALID_STATUSES.join(", ")}.`,
        });
      }
      where.status = normalized;
    }

    if (driverId) where.driverId = driverId;

    const trips = await tripRepository.findTrips(where);
    return res.status(200).json({ success: true, count: trips.length, data: trips });
  } catch (error) {
    next(error);
  }
}

export async function getTripById(req, res, next) {
  try {
    const trip = await tripRepository.findTripById(req.params.id);
    if (!trip) {
      return res.status(404).json({ success: false, message: "Trip not found." });
    }
    return res.status(200).json({ success: true, data: trip });
  } catch (error) {
    next(error);
  }
}
