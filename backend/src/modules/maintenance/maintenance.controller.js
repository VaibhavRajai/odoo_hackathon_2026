import prisma from "../../config/prisma.js";

// Get all maintenance logs
export const getMaintenanceLogs = async (req, res) => {
  try {
    const logs = await prisma.maintenanceLog.findMany({
      include: { vehicle: true },
      orderBy: { createdAt: 'desc' }
    });
    return res.status(200).json({ success: true, data: logs });
  } catch (error) {
    console.error("Error fetching maintenance logs:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// Add a vehicle to maintenance (creates log, sets vehicle to "In Shop")
export const createMaintenanceLog = async (req, res) => {
  try {
    const { vehicleId, type, description, cost } = req.body;

    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) return res.status(404).json({ success: false, message: "Vehicle not found." });
    if (vehicle.status !== "Available") {
      return res.status(400).json({ success: false, message: "Vehicle must be Available to be sent to shop." });
    }

    const log = await prisma.$transaction(async (tx) => {
      // Create the log
      const newLog = await tx.maintenanceLog.create({
        data: {
          vehicleId,
          type,
          description,
          cost: parseFloat(cost),
          status: "Active"
        }
      });
      // Update vehicle status
      await tx.vehicle.update({
        where: { id: vehicleId },
        data: { status: "In Shop" }
      });
      return newLog;
    });

    return res.status(201).json({ success: true, data: log });
  } catch (error) {
    console.error("Error creating maintenance log:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// Close maintenance (sets log to Completed, vehicle to "Available")
export const closeMaintenanceLog = async (req, res) => {
  try {
    const { id } = req.params;

    const log = await prisma.maintenanceLog.findUnique({ where: { id } });
    if (!log) return res.status(404).json({ success: false, message: "Maintenance log not found." });
    if (log.status !== "Active") {
      return res.status(400).json({ success: false, message: "Maintenance log is already completed." });
    }

    const updatedLog = await prisma.$transaction(async (tx) => {
      // Close the log
      const closedLog = await tx.maintenanceLog.update({
        where: { id },
        data: { status: "Completed" }
      });
      // Restore vehicle status
      await tx.vehicle.update({
        where: { id: log.vehicleId },
        data: { status: "Available" }
      });
      return closedLog;
    });

    return res.status(200).json({ success: true, data: updatedLog });
  } catch (error) {
    console.error("Error closing maintenance log:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};
