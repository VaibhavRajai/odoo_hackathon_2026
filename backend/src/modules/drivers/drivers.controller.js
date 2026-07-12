import prisma from "../../config/prisma.js";

export const getAvailableDrivers = async (req, res) => {
  try {
    const drivers = await prisma.driverProfile.findMany({
      where: { status: "Available" }
    });
    return res.status(200).json({ success: true, data: drivers });
  } catch (error) {
    console.error("Error fetching drivers:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};
