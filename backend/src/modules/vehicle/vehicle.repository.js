import prisma from "../../config/prisma";

/**
 * @desc    Create a new vehicle in the database
 * @param   {Object} vehicleData - Vehicle information
 * @returns {Promise<Object>} Created vehicle
 */
export const createVehicle = async (vehicleData) => {
  return prisma.vehicle.create({
    data: vehicleData,
  });
};

/**
 * @desc    Find a vehicle by registration number
 * @param   {String} registrationNumber - Unique vehicle registration number
 * @returns {Promise<Object|null>} Vehicle if found, otherwise null
 */
export const findVehicleByRegistrationNumber = async (
  registrationNumber
) => {
  return prisma.vehicle.findUnique({
    where: {
      registrationNumber,
    },
  });
};

/**
 * @desc    Get all vehicles from the database
 * @returns {Promise<Array>} List of vehicles
 */
export const findAllVehicles = async () => {
  return prisma.vehicle.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });
};

/**
 * @desc    Find a vehicle by its unique ID
 * @param   {String} vehicleId - Vehicle ID
 * @returns {Promise<Object|null>} Vehicle if found, otherwise null
 */
export const findVehicleById = async (vehicleId) => {
  return prisma.vehicle.findUnique({
    where: {
      id: vehicleId,
    },
  });
};

/**
 * @desc    Update an existing vehicle
 * @param   {String} vehicleId - Vehicle ID
 * @param   {Object} vehicleData - Fields to update
 * @returns {Promise<Object>} Updated vehicle
 */
export const updateVehicleById = async (
  vehicleId,
  vehicleData
) => {
  return prisma.vehicle.update({
    where: {
      id: vehicleId,
    },
    data: vehicleData,
  });
};