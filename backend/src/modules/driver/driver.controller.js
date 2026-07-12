import * as driverService from "./driver.service.js";

export async function createDriver(req, res, next) {
  try {
    const driver = await driverService.registerDriver(req.body);
    return res.status(201).json({
      success: true,
      message: "Driver registered successfully.",
      data: driver,
    });
  } catch (error) {
    next(error);
  }
}

export async function getDrivers(req, res, next) {
  try {
    const drivers = await driverService.getDrivers({
      status: req.query.status,
      licenseCategory: req.query.licenseCategory,
      search: req.query.search,
      expiryStatus: req.query.expiryStatus,
    });
    return res.status(200).json({ success: true, count: drivers.length, data: drivers });
  } catch (error) {
    next(error);
  }
}

export async function getDriverById(req, res, next) {
  try {
    const driver = await driverService.getDriverById(req.params.id);
    return res.status(200).json({ success: true, data: driver });
  } catch (error) {
    next(error);
  }
}

export async function updateDriver(req, res, next) {
  try {
    const driver = await driverService.updateDriverProfile(req.params.id, req.body);
    return res.status(200).json({ success: true, message: "Driver updated successfully.", data: driver });
  } catch (error) {
    next(error);
  }
}

export async function updateDriverStatus(req, res, next) {
  try {
    const driver = await driverService.updateDriverStatus(req.params.id, req.body.status);
    return res.status(200).json({ success: true, message: "Driver status updated successfully.", data: driver });
  } catch (error) {
    next(error);
  }
}

export async function deleteDriver(req, res, next) {
  try {
    await driverService.removeDriver(req.params.id);
    return res.status(200).json({ success: true, message: "Driver deleted successfully." });
  } catch (error) {
    next(error);
  }
}

export async function getDashboardStats(req, res, next) {
  try {
    const stats = await driverService.getDashboardStats();
    return res.status(200).json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
}

export async function validateLicenses(req, res, next) {
  try {
    const result = await driverService.validateLicenses();
    return res.status(200).json({
      success: true,
      message: `License validation complete. ${result.suspendedCount} driver(s) suspended, ${result.remindersSent} renewal reminder(s) sent.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function addSafetyRating(req, res, next) {
  try {
    const driver = await driverService.addSafetyRating({
      driverId: req.params.id,
      tripId: req.body.tripId,
      score: req.body.score,
    });
    return res.status(201).json({ success: true, message: "Safety rating recorded.", data: driver });
  } catch (error) {
    next(error);
  }
}
