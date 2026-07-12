import redis from "../../config/redis.js";
import prisma from "../../config/prisma.js";
import * as maintenanceRepository from "./maintenance.repository.js";

/**
 * Redis cache TTL for maintenance list queries (60 seconds).
 * Short TTL ensures near-real-time data while reducing DB load.
 */
const CACHE_TTL = 60;

/**
 * Build a deterministic Redis cache key from filter parameters.
 *
 * @param {Object} filters
 * @returns {string}
 */
function buildCacheKey(filters = {}) {
  const { vehicleId = "all", status = "all", search = "", page = 1, limit = 10 } = filters;
  return `maintenance:list:v:${vehicleId}:s:${status}:q:${search}:p:${page}:l:${limit}`;
}

/**
 * Invalidate all maintenance list cache keys.
 *
 * Called after any write operation (create or close) so subsequent
 * GET requests always reflect the latest data.
 *
 * @returns {Promise<void>}
 */
async function invalidateMaintenanceCache() {
  try {
    const keys = await redis.keys("maintenance:list:*");
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {
    // Cache errors must never block the primary operation
  }
}

// ─── Maintenance Statuses ─────────────────────────────────────────────────────
const VALID_MAINTENANCE_STATUSES = ["ACTIVE", "CLOSED"];

/**
 * Create a new maintenance record for a vehicle.
 *
 * Business Rules:
 * 1. vehicleId is required.
 * 2. type is required.
 * 3. startDate is required and must be a valid date.
 * 4. cost must be >= 0 (defaults to 0 if not provided).
 * 5. Vehicle must exist.
 * 6. Vehicle cannot be RETIRED.
 * 7. Vehicle cannot be ON_TRIP.
 * 8. Vehicle cannot already have an ACTIVE maintenance record (already IN_SHOP).
 * 9. Record creation and vehicle status update are atomic (transaction).
 * 10. Invalidates the maintenance list cache after creation.
 *
 * @param {Object} data - Maintenance fields from the controller.
 * @returns {Promise<Object>} Newly created maintenance record with vehicle.
 * @throws {Error} With appropriate statusCode when a rule is violated.
 */
export async function createMaintenance(data) {
  const { vehicleId, type, description, cost, startDate } = data;

  // ── 1. Required field validation ─────────────────────────────────────────
  if (!vehicleId?.trim()) {
    const error = new Error("vehicleId is required.");
    error.statusCode = 400;
    throw error;
  }

  if (!type?.trim()) {
    const error = new Error("Maintenance type is required.");
    error.statusCode = 400;
    throw error;
  }

  if (!startDate) {
    const error = new Error("Start date is required.");
    error.statusCode = 400;
    throw error;
  }

  const parsedStartDate = new Date(startDate);
  if (isNaN(parsedStartDate.getTime())) {
    const error = new Error("Start date must be a valid ISO date (e.g. 2026-07-12).");
    error.statusCode = 400;
    throw error;
  }

  // ── 2. Cost validation ───────────────────────────────────────────────────
  const parsedCost = cost !== undefined ? Number(cost) : 0;
  if (!Number.isFinite(parsedCost) || parsedCost < 0) {
    const error = new Error("Cost must be a number greater than or equal to 0.");
    error.statusCode = 400;
    throw error;
  }

  // ── 3. Vehicle existence check ───────────────────────────────────────────
  const vehicle = await maintenanceRepository.findVehicleById(vehicleId.trim());
  if (!vehicle) {
    const error = new Error("Vehicle not found.");
    error.statusCode = 404;
    throw error;
  }

  // ── 4. Vehicle status checks ─────────────────────────────────────────────
  if (vehicle.status === "RETIRED") {
    const error = new Error("Cannot create a maintenance record for a RETIRED vehicle.");
    error.statusCode = 422;
    throw error;
  }

  if (vehicle.status === "ON_TRIP") {
    const error = new Error("Cannot create a maintenance record for a vehicle that is ON_TRIP. Wait for the trip to complete.");
    error.statusCode = 422;
    throw error;
  }

  // ── 5. Duplicate active maintenance check ────────────────────────────────
  const activeCount = await maintenanceRepository.countActiveMaintenanceForVehicle(vehicleId.trim());
  if (activeCount > 0) {
    const error = new Error("This vehicle already has an ACTIVE maintenance record. Close it before creating a new one.");
    error.statusCode = 409;
    throw error;
  }

  // ── 6. Create atomically ─────────────────────────────────────────────────
  const maintenance = await maintenanceRepository.createMaintenanceWithVehicleUpdate(
    vehicleId.trim(),
    {
      type: type.trim(),
      description: description?.trim() || null,
      cost: parsedCost,
      startDate: parsedStartDate,
    }
  );

  // Invalidate cache after write
  await invalidateMaintenanceCache();

  return maintenance;
}

/**
 * Retrieve maintenance records with optional filters.
 *
 * Results are cached in Redis for CACHE_TTL seconds per unique filter combination.
 * Cache is invalidated on every write (create / close).
 *
 * @param {Object} filters - Query parameters from the controller.
 * @returns {Promise<Object>} Object containing records and pagination metadata.
 */
export async function getMaintenanceRecords(filters = {}) {
  const { vehicleId, status, search, page = 1, limit = 10 } = filters;

  // ── Try cache first ───────────────────────────────────────────────────────
  const cacheKey = buildCacheKey(filters);
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {
    // Cache miss or Redis error — fall through to DB
  }

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
  const skip = (parsedPage - 1) * parsedLimit;

  // ── Build Prisma WHERE ────────────────────────────────────────────────────
  const where = {};

  if (vehicleId?.trim()) {
    where.vehicleId = vehicleId.trim();
  }

  if (status?.trim() && status !== "All") {
    const normalizedStatus = status.trim().toUpperCase();
    if (!VALID_MAINTENANCE_STATUSES.includes(normalizedStatus)) {
      const error = new Error(
        "Invalid maintenance status. Allowed values are ACTIVE and CLOSED."
      );
      error.statusCode = 400;
      throw error;
    }
    where.status = normalizedStatus;
  }

  if (search?.trim()) {
    where.vehicle = {
      registrationNumber: {
        contains: search.trim(),
        mode: "insensitive",
      },
    };
  }

  const [records, total] = await Promise.all([
    maintenanceRepository.findMaintenanceRecords(where, skip, parsedLimit),
    maintenanceRepository.countMaintenanceRecords(where),
  ]);

  const result = {
    records,
    pagination: {
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit),
    },
  };

  // ── Store in cache ────────────────────────────────────────────────────────
  try {
    await redis.set(cacheKey, JSON.stringify(result), "EX", CACHE_TTL);
  } catch {
    // Cache write error is non-fatal
  }

  return result;
}

/**
 * Close an ACTIVE maintenance record.
 *
 * Business Rules:
 * 1. Record must exist.
 * 2. Record must be ACTIVE (cannot close an already CLOSED record).
 * 3. Sets completedDate to now().
 * 4. If the vehicle is not RETIRED, sets vehicle status back to AVAILABLE.
 * 5. Close operation and vehicle status update are atomic (transaction).
 * 6. Invalidates the maintenance list cache after closing.
 *
 * @param {string} maintenanceId - UUID of the maintenance record to close.
 * @returns {Promise<Object>} The closed maintenance record with vehicle.
 * @throws {Error} With appropriate statusCode when a rule is violated.
 */
export async function closeMaintenance(maintenanceId) {
  if (!maintenanceId?.trim()) {
    const error = new Error("maintenanceId is required.");
    error.statusCode = 400;
    throw error;
  }

  // ── 1. Fetch the record ───────────────────────────────────────────────────
  const record = await maintenanceRepository.findMaintenanceById(maintenanceId.trim());
  if (!record) {
    const error = new Error("Maintenance record not found.");
    error.statusCode = 404;
    throw error;
  }

  // ── 2. Must be ACTIVE ─────────────────────────────────────────────────────
  if (record.status === "CLOSED") {
    const error = new Error("This maintenance record is already CLOSED.");
    error.statusCode = 409;
    throw error;
  }

  // ── 3. RETIRED vehicles stay RETIRED — only restore AVAILABLE for non-RETIRED ──
  const vehicleIsRetired = record.vehicle.status === "RETIRED";

  let closed;
  if (vehicleIsRetired) {
    // Close record only — do not change vehicle status back to AVAILABLE
    closed = await prisma.maintenance.update({
      where: { id: maintenanceId.trim() },
      data: { status: "CLOSED", completedDate: new Date() },
      include: {
        vehicle: {
          select: {
            id: true,
            registrationNumber: true,
            name: true,
            type: true,
            status: true,
          },
        },
      },
    });
  } else {
    // ── 4. Atomically close record + restore vehicle to AVAILABLE ─────────────
    closed = await maintenanceRepository.closeMaintenanceWithVehicleUpdate(
      maintenanceId.trim(),
      record.vehicleId
    );
  }

  // Invalidate cache after write
  await invalidateMaintenanceCache();

  return closed;
}

/**
 * Update an existing maintenance record at any time.
 * Automatically synchronizes related vehicle statuses atomically.
 *
 * @param {string} id - Maintenance record UUID.
 * @param {Object} data - Update data.
 * @returns {Promise<Object>} Updated maintenance record with vehicle details.
 */
export async function updateMaintenance(id, data) {
  const { vehicleId, type, description, cost, startDate, status } = data;

  if (!id?.trim()) {
    const error = new Error("maintenance id is required.");
    error.statusCode = 400;
    throw error;
  }

  // 1. Fetch existing record
  const record = await prisma.maintenance.findUnique({
    where: { id: id.trim() },
    include: { vehicle: true }
  });
  if (!record) {
    const error = new Error("Maintenance record not found.");
    error.statusCode = 404;
    throw error;
  }

  const oldVehicleId = record.vehicleId;
  const oldStatus = record.status;

  const targetVehicleId = vehicleId?.trim() || oldVehicleId;
  const targetStatus = status?.trim().toUpperCase() || oldStatus;

  // 2. Validate input fields
  if (cost !== undefined && cost !== null && cost !== "") {
    const parsedCost = Number(cost);
    if (!Number.isFinite(parsedCost) || parsedCost < 0) {
      const error = new Error("Cost must be a number greater than or equal to 0.");
      error.statusCode = 400;
      throw error;
    }
  }

  if (startDate) {
    const parsedStartDate = new Date(startDate);
    if (isNaN(parsedStartDate.getTime())) {
      const error = new Error("Start date must be a valid date.");
      error.statusCode = 400;
      throw error;
    }
  }

  if (status) {
    if (!VALID_MAINTENANCE_STATUSES.includes(targetStatus)) {
      const error = new Error("Status must be ACTIVE or CLOSED.");
      error.statusCode = 400;
      throw error;
    }
  }

  // 3. If vehicle changes, or status changes, check constraints
  const isVehicleChanged = targetVehicleId !== oldVehicleId;
  const isStatusChanged = targetStatus !== oldStatus;

  let targetVehicle = record.vehicle;
  if (isVehicleChanged) {
    targetVehicle = await prisma.vehicle.findUnique({
      where: { id: targetVehicleId }
    });
    if (!targetVehicle) {
      const error = new Error("Target vehicle not found.");
      error.statusCode = 404;
      throw error;
    }
    if (targetVehicle.status === "RETIRED") {
      const error = new Error("Cannot assign maintenance to a RETIRED vehicle.");
      error.statusCode = 422;
      throw error;
    }
    if (targetVehicle.status === "ON_TRIP") {
      const error = new Error("Cannot assign maintenance to an ON_TRIP vehicle.");
      error.statusCode = 422;
      throw error;
    }
  }

  // If status is ACTIVE, check if target vehicle already has an active record (excluding this record itself)
  if (targetStatus === "ACTIVE") {
    const otherActiveCount = await prisma.maintenance.count({
      where: {
        vehicleId: targetVehicleId,
        status: "ACTIVE",
        NOT: { id: id.trim() }
      }
    });
    if (otherActiveCount > 0) {
      const error = new Error("Target vehicle already has an ACTIVE maintenance record.");
      error.statusCode = 409;
      throw error;
    }
  }

  // Prepare updates to run in transaction
  const operations = [];

  // Update maintenance record itself
  const updateData = {};
  if (vehicleId) updateData.vehicleId = targetVehicleId;
  if (type) updateData.type = type.trim();
  if (description !== undefined) updateData.description = description?.trim() || null;
  if (cost !== undefined && cost !== null && cost !== "") {
    updateData.cost = Number(cost);
  }
  if (startDate) updateData.startDate = new Date(startDate);
  if (status) {
    updateData.status = targetStatus;
    // Set completedDate to now if closing, or null if reopening
    if (targetStatus === "CLOSED") {
      updateData.completedDate = new Date();
    } else {
      updateData.completedDate = null;
    }
  }

  operations.push(
    prisma.maintenance.update({
      where: { id: id.trim() },
      data: updateData,
      include: {
        vehicle: {
          select: {
            id: true,
            registrationNumber: true,
            name: true,
            type: true,
            status: true
          }
        }
      }
    })
  );

  // Determine vehicle status changes
  // Old vehicle:
  // If vehicle is changed, or status becomes CLOSED:
  // The old vehicle no longer has this active maintenance.
  // We check if it has other active maintenance records (excluding this one).
  // If it doesn't, and its status is IN_SHOP, we set it to AVAILABLE (unless it's retired).
  if (isVehicleChanged || (isStatusChanged && targetStatus === "CLOSED")) {
    if (record.vehicle.status !== "RETIRED") {
      // Find other active maintenance records
      const activeCount = await prisma.maintenance.count({
        where: {
          vehicleId: oldVehicleId,
          status: "ACTIVE",
          NOT: { id: id.trim() }
        }
      });
      if (activeCount === 0) {
        operations.push(
          prisma.vehicle.update({
            where: { id: oldVehicleId },
            data: { status: "AVAILABLE" }
          })
        );
      }
    }
  }

  // New/Target vehicle:
  // If status is ACTIVE, we set target vehicle to IN_SHOP (unless it is retired).
  if (targetStatus === "ACTIVE" && targetVehicle.status !== "RETIRED") {
    operations.push(
      prisma.vehicle.update({
        where: { id: targetVehicleId },
        data: { status: "IN_SHOP" }
      })
    );
  } else if (targetStatus === "CLOSED" && targetVehicle.status !== "RETIRED") {
    // If status becomes CLOSED, we set target vehicle to AVAILABLE if it doesn't have other active maintenance records
    const activeCount = await prisma.maintenance.count({
      where: {
        vehicleId: targetVehicleId,
        status: "ACTIVE",
        NOT: { id: id.trim() }
      }
    });
    if (activeCount === 0) {
      operations.push(
        prisma.vehicle.update({
          where: { id: targetVehicleId },
          data: { status: "AVAILABLE" }
        })
      );
    }
  }

  // Run transaction
  const results = await prisma.$transaction(operations);
  const updatedRecord = results[0]; // first operation is the update

  // Invalidate Cache
  await invalidateMaintenanceCache();

  return updatedRecord;
}
