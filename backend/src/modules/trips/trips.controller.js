import prisma from "../../config/prisma.js";

export const createTrip = async (req, res) => {
  try {
    const { source, destination, cargoWeight, plannedDistance, vehicleId, driverId } = req.body;
    
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) return res.status(404).json({ success: false, message: "Vehicle not found." });
    if (cargoWeight > vehicle.maxLoadCapacity) {
      return res.status(400).json({ success: false, message: "Cargo weight exceeds vehicle capacity." });
    }

    const trip = await prisma.trip.create({
      data: {
        source,
        destination,
        cargoWeight: parseFloat(cargoWeight),
        plannedDistance: parseFloat(plannedDistance),
        status: "Draft",
        vehicleId,
        driverId
      }
    });
    
    return res.status(201).json({ success: true, data: trip });
  } catch (error) {
    console.error("Error creating trip:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

export const listTrips = async (req, res) => {
  try {
    const trips = await prisma.trip.findMany({
      include: { vehicle: true, driver: true },
      orderBy: { createdAt: 'desc' }
    });
    return res.status(200).json({ success: true, data: trips });
  } catch (error) {
    console.error("Error fetching trips:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

export const dispatchTrip = async (req, res) => {
  try {
    const { id } = req.params;
    
    const trip = await prisma.trip.findUnique({
      where: { id },
      include: { vehicle: true, driver: true }
    });
    
    if (!trip) return res.status(404).json({ success: false, message: "Trip not found." });
    if (trip.status !== "Draft") return res.status(400).json({ success: false, message: "Only Draft trips can be dispatched." });
    if (trip.vehicle.status !== "Available") return res.status(400).json({ success: false, message: "Vehicle is not available." });
    if (trip.driver.status !== "Available") return res.status(400).json({ success: false, message: "Driver is not available." });
    
    const updatedTrip = await prisma.$transaction(async (tx) => {
      await tx.vehicle.update({ where: { id: trip.vehicleId }, data: { status: "On Trip" } });
      await tx.driverProfile.update({ where: { id: trip.driverId }, data: { status: "On Trip" } });
      return tx.trip.update({ where: { id }, data: { status: "Dispatched" } });
    });
    
    return res.status(200).json({ success: true, data: updatedTrip });
  } catch (error) {
    console.error("Error dispatching trip:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

export const completeTrip = async (req, res) => {
  try {
    const { id } = req.params;
    const { finalOdometer, fuelLiters, fuelCost } = req.body;
    
    const trip = await prisma.trip.findUnique({ where: { id } });
    if (!trip) return res.status(404).json({ success: false, message: "Trip not found." });
    if (trip.status !== "Dispatched") return res.status(400).json({ success: false, message: "Only Dispatched trips can be completed." });
    
    const updatedTrip = await prisma.$transaction(async (tx) => {
      await tx.vehicle.update({ 
        where: { id: trip.vehicleId }, 
        data: { status: "Available", odometer: parseFloat(finalOdometer) } 
      });
      await tx.driverProfile.update({ where: { id: trip.driverId }, data: { status: "Available" } });
      
      if (fuelLiters && fuelCost) {
        await tx.fuelLog.create({
          data: {
            liters: parseFloat(fuelLiters),
            cost: parseFloat(fuelCost),
            vehicleId: trip.vehicleId,
            tripId: trip.id
          }
        });
      }
      
      return tx.trip.update({ where: { id }, data: { status: "Completed" } });
    });
    
    return res.status(200).json({ success: true, data: updatedTrip });
  } catch (error) {
    console.error("Error completing trip:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

export const cancelTrip = async (req, res) => {
  try {
    const { id } = req.params;
    
    const trip = await prisma.trip.findUnique({ where: { id } });
    if (!trip) return res.status(404).json({ success: false, message: "Trip not found." });
    if (trip.status !== "Dispatched" && trip.status !== "Draft") {
       return res.status(400).json({ success: false, message: "Cannot cancel a completed or already cancelled trip." });
    }
    
    const updatedTrip = await prisma.$transaction(async (tx) => {
      if (trip.status === "Dispatched") {
        await tx.vehicle.update({ where: { id: trip.vehicleId }, data: { status: "Available" } });
        await tx.driverProfile.update({ where: { id: trip.driverId }, data: { status: "Available" } });
      }
      return tx.trip.update({ where: { id }, data: { status: "Cancelled" } });
    });
    
    return res.status(200).json({ success: true, data: updatedTrip });
  } catch (error) {
    console.error("Error cancelling trip:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};
