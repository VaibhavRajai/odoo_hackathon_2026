import * as vehicleService from "./vehicle.service.js";

/**
 * @desc    Register a new vehicle
 * @route   POST /api/vehicles
 * @access  Private - Fleet Manager
 */
export const createVehicle = async (req, res, next) => {
  try {
    const vehicle = await vehicleService.registerVehicle(
      req.body
    );

    return res.status(201).json({
      success: true,
      message: "Vehicle registered successfully",
      data: vehicle,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all registered vehicles
 * @route   GET /api/vehicles
 * @access  Private
 */
export const getAllVehicles = async (
  req,
  res,
  next
) => {
  try {
    const vehicles =
      await vehicleService.getAllVehicles();

    return res.status(200).json({
      success: true,
      count: vehicles.length,
      data: vehicles,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get vehicle details by ID
 * @route   GET /api/vehicles/:id
 * @access  Private
 */
export const getVehicleById = async (
  req,
  res,
  next
) => {
  try {
    const vehicle =
      await vehicleService.getVehicleById(req.params.id);

    return res.status(200).json({
      success: true,
      data: vehicle,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update vehicle master information
 * @route   PATCH /api/vehicles/:id
 * @access  Private - Fleet Manager
 */
export const updateVehicle = async (
  req,
  res,
  next
) => {
  try {
    const vehicle =
      await vehicleService.updateVehicle(
        req.params.id,
        req.body
      );

    return res.status(200).json({
      success: true,
      message: "Vehicle updated successfully",
      data: vehicle,
    });
  } catch (error) {
    next(error);
  }
};