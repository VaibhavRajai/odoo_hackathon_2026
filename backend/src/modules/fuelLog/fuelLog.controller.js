import * as fuelLogService from "./fuelLog.service.js";

/** @route POST /api/fuel-logs */
export async function createFuelLog(req, res, next) {
  try {
    const fuelLog = await fuelLogService.createFuelLog(req.body);
    return res.status(201).json({ success: true, message: "Fuel log recorded.", data: fuelLog });
  } catch (error) {
    next(error);
  }
}

/** @route GET /api/fuel-logs — optional ?vehicleId=, ?tripId= filters. */
export async function getFuelLogs(req, res, next) {
  try {
    const fuelLogs = await fuelLogService.getFuelLogs({
      vehicleId: req.query.vehicleId,
      tripId: req.query.tripId,
    });
    return res.status(200).json({ success: true, count: fuelLogs.length, data: fuelLogs });
  } catch (error) {
    next(error);
  }
}
