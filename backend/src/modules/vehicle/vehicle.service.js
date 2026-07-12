import * as vehicleRepository from "./vehicle.repository";

/**
 * @desc    Register a new vehicle
 * @param   {Object} vehicleData - Vehicle registration data
 * @returns {Promise<Object>} Newly created vehicle
 * @throws  {Error} If registration number already exists
 */
export const registerVehicle = async (vehicleData) => {
  const existingVehicle =
    await vehicleRepository.findVehicleByRegistrationNumber(
      vehicleData.registrationNumber
    );

  if (existingVehicle) {
    const error = new Error(
      "Vehicle with this registration number already exists"
    );

    error.statusCode = 409;
    throw error;
  }

  return vehicleRepository.createVehicle({
    registrationNumber: vehicleData.registrationNumber,
    name: vehicleData.name,
    type: vehicleData.type,
    maxLoadCapacity: vehicleData.maxLoadCapacity,
    odometer: vehicleData.odometer,
    acquisitionCost: vehicleData.acquisitionCost,

    // New vehicles always enter the fleet as AVAILABLE.
    status: "AVAILABLE",
  });
};

/**
 * @desc    Get the complete vehicle registry
 * @returns {Promise<Array>} List of all registered vehicles
 */
export const getAllVehicles = async () => {
  return vehicleRepository.findAllVehicles();
};

/**
 * @desc    Get a single vehicle by ID
 * @param   {String} vehicleId - Vehicle ID
 * @returns {Promise<Object>} Vehicle details
 * @throws  {Error} If vehicle does not exist
 */
export const getVehicleById = async (vehicleId) => {
  const vehicle =
    await vehicleRepository.findVehicleById(vehicleId);

  if (!vehicle) {
    const error = new Error("Vehicle not found");
    error.statusCode = 404;
    throw error;
  }

  return vehicle;
};

/**
 * @desc    Update vehicle master information
 * @param   {String} vehicleId - Vehicle ID
 * @param   {Object} vehicleData - Updated vehicle information
 * @returns {Promise<Object>} Updated vehicle
 * @throws  {Error} If vehicle does not exist
 */
export const updateVehicle = async (
  vehicleId,
  vehicleData
) => {
  const vehicle =
    await vehicleRepository.findVehicleById(vehicleId);

  if (!vehicle) {
    const error = new Error("Vehicle not found");
    error.statusCode = 404;
    throw error;
  }

  return vehicleRepository.updateVehicleById(
    vehicleId,
    vehicleData
  );
};