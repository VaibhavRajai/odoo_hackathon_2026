import prisma from "../../config/prisma.js";

// Get all vehicles
export const getAllVehicles = async (req, res) => {
  try {
    const vehicles = await prisma.vehicle.findMany();
    return res.status(200).json({ success: true, data: vehicles });
  } catch (error) {
    console.error("Error fetching vehicles:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

export const getAvailableVehicles = async (req, res) => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      where: { status: "Available" }
    });
    return res.status(200).json({ success: true, data: vehicles });
  } catch (error) {
    console.error("Error fetching available vehicles:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// Calculate Vehicle Analytics (Fuel + Maintenance costs)
export const getVehicleAnalytics = async (req, res) => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      include: {
        fuelLogs: true,
        maintenanceLogs: true
      }
    });

    const analytics = vehicles.map(v => {
      const totalFuelCost = v.fuelLogs.reduce((sum, log) => sum + log.cost, 0);
      const totalMaintenanceCost = v.maintenanceLogs.reduce((sum, log) => sum + log.cost, 0);
      const totalOperationalCost = totalFuelCost + totalMaintenanceCost;
      
      let roi = null;
      if (v.acquisitionCost) {
        // Mock revenue logic since Revenue isn't tracked yet in trips (we only have weight).
        // Let's assume standard $5 per km * odometer for revenue.
        const mockRevenue = (v.odometer || 0) * 5; 
        roi = (mockRevenue - totalOperationalCost) / v.acquisitionCost;
      }

      return {
        id: v.id,
        registrationNum: v.registrationNum,
        name: v.name,
        type: v.type,
        status: v.status,
        odometer: v.odometer,
        totalFuelCost,
        totalMaintenanceCost,
        totalOperationalCost,
        roi
      };
    });

    return res.status(200).json({ success: true, data: analytics });
  } catch (error) {
    console.error("Error fetching vehicle analytics:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

export const addFuelLog = async (req, res) => {
  try {
    const { id } = req.params;
    const { liters, cost, tripId } = req.body;

    const vehicle = await prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle) return res.status(404).json({ success: false, message: "Vehicle not found." });

    const fuelLog = await prisma.fuelLog.create({
      data: {
        liters: parseFloat(liters),
        cost: parseFloat(cost),
        vehicleId: id,
        tripId: tripId || null
      }
    });

    return res.status(201).json({ success: true, data: fuelLog });
  } catch (error) {
    console.error("Error adding fuel log:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

