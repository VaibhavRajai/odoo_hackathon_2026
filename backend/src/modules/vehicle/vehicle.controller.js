import * as vehicleService from "./vehicle.service.js";

/**
 * Register a new vehicle.
 *
 * Receives vehicle information from the request body,
 * delegates business logic to the service layer,
 * and returns the created vehicle to the client.
 *
 * @route   POST /api/vehicles
 * @access  Private - Fleet Manager only
 *
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
export async function createVehicle(req, res, next) {
  try {
    const vehicle = await vehicleService.registerVehicle(req.body);

    return res.status(201).json({
      success: true,
      message: "Vehicle registered successfully.",
      data: vehicle,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get the master list of vehicles.
 *
 * Supports filtering and searching through query parameters.
 *
 * Examples:
 * GET /api/vehicles
 * GET /api/vehicles?type=Van
 * GET /api/vehicles?status=AVAILABLE
 * GET /api/vehicles?search=GJ01
 * GET /api/vehicles?type=Van&status=AVAILABLE&search=GJ01
 *
 * @route   GET /api/vehicles
 * @access  Private - Authenticated users
 *
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
export async function getVehicles(req, res, next) {
  try {
    /**
     * Query parameters are passed to the service layer.
     *
     * The service decides how the filters should be interpreted.
     */
    const result = await vehicleService.getVehicles({
      type: req.query.type,
      status: req.query.status,
      search: req.query.search,
      page: req.query.page,
      limit: req.query.limit,
    });

    return res.status(200).json({
      success: true,
      count: result.vehicles.length,
      pagination: result.pagination,
      data: result.vehicles,
    });
  } catch (error) {
    next(error);
  }
}