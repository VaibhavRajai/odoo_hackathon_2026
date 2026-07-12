import prisma from "../../config/prisma.js";

/**
 * Fetch vehicle KPI counts, optionally scoped to a vehicle type, status, and region.
 *
 * Returns counts for each VehicleStatus value within the filtered set.
 *
 * @param {Object} vehicleWhere - Prisma WHERE clause for vehicles.
 * @returns {Promise<Object>} Object with counts keyed by status.
 */
export async function getVehicleStatusCounts(vehicleWhere = {}) {
  const counts = await prisma.vehicle.groupBy({
    by: ["status"],
    where: vehicleWhere,
    _count: { _all: true },
  });

  const result = {
    AVAILABLE: 0,
    ON_TRIP: 0,
    IN_SHOP: 0,
    RETIRED: 0,
  };

  for (const row of counts) {
    result[row.status] = row._count._all;
  }

  return result;
}

/**
 * Fetch vehicle counts grouped by type, optionally filtered.
 *
 * @param {Object} vehicleWhere - Prisma WHERE clause for vehicles.
 * @returns {Promise<Array<{type: string, count: number}>>}
 */
export async function getVehicleCountByType(vehicleWhere = {}) {
  const rows = await prisma.vehicle.groupBy({
    by: ["type"],
    where: vehicleWhere,
    _count: { _all: true },
    orderBy: { _count: { type: "desc" } },
  });

  return rows.map((r) => ({ type: r.type, count: r._count._all }));
}

/**
 * Fetch ON_TRIP and total (non-RETIRED) vehicle counts per type for utilization chart.
 *
 * @param {Object} baseWhere - Base filter (excluding status).
 * @returns {Promise<Array<{type: string, onTrip: number, total: number}>>}
 */
export async function getUtilizationByType(baseWhere = {}) {
  // Get all distinct types matching the base filter (excluding status constraint)
  const { status: _excluded, ...filterWithoutStatus } = baseWhere;

  const activeWhere = { ...filterWithoutStatus, status: { not: "RETIRED" } };
  const onTripWhere = { ...filterWithoutStatus, status: "ON_TRIP" };

  const [activeCounts, onTripCounts] = await Promise.all([
    prisma.vehicle.groupBy({
      by: ["type"],
      where: activeWhere,
      _count: { _all: true },
    }),
    prisma.vehicle.groupBy({
      by: ["type"],
      where: onTripWhere,
      _count: { _all: true },
    }),
  ]);

  // Build lookup map for on-trip counts
  const onTripMap = {};
  for (const r of onTripCounts) {
    onTripMap[r.type] = r._count._all;
  }

  return activeCounts.map((r) => ({
    type: r.type,
    onTrip: onTripMap[r.type] ?? 0,
    total: r._count._all,
    utilization:
      r._count._all > 0
        ? Math.round(((onTripMap[r.type] ?? 0) / r._count._all) * 10000) / 100
        : 0,
  }));
}

/**
 * Fetch vehicle counts grouped by region, optionally filtered.
 *
 * @param {Object} vehicleWhere - Prisma WHERE clause for vehicles.
 * @returns {Promise<Array<{region: string, count: number}>>}
 */
export async function getVehicleCountByRegion(vehicleWhere = {}) {
  const rows = await prisma.vehicle.groupBy({
    by: ["region"],
    where: vehicleWhere,
    _count: { _all: true },
    orderBy: { _count: { region: "desc" } },
  });

  return rows.map((r) => ({ region: r.region, count: r._count._all }));
}

/**
 * Fetch maintenance KPI counts and cost summary,
 * optionally scoped to a set of vehicle IDs.
 *
 * @param {string[]|null} vehicleIds - Scope to specific vehicle IDs, or null for all.
 * @returns {Promise<Object>} Maintenance counts and total cost.
 */
export async function getMaintenanceStats(vehicleIds = null) {
  const maintenanceWhere = vehicleIds
    ? { vehicleId: { in: vehicleIds } }
    : {};

  const [statusCounts, costAgg] = await Promise.all([
    prisma.maintenance.groupBy({
      by: ["status"],
      where: maintenanceWhere,
      _count: { _all: true },
    }),
    prisma.maintenance.aggregate({
      where: { ...maintenanceWhere, status: "CLOSED" },
      _sum: { cost: true },
    }),
  ]);

  const active = statusCounts.find((r) => r.status === "ACTIVE")?._count._all ?? 0;
  const closed = statusCounts.find((r) => r.status === "CLOSED")?._count._all ?? 0;

  return {
    active,
    closed,
    total: active + closed,
    totalClosedCost: costAgg._sum.cost ?? 0,
  };
}

/**
 * Fetch maintenance cost grouped by vehicle type (for chart).
 * Only includes CLOSED records.
 *
 * @param {Object} vehicleWhere - Vehicle filter to determine the vehicle scope.
 * @returns {Promise<Array<{type: string, totalCost: number, count: number}>>}
 */
export async function getMaintenanceCostByType(vehicleWhere = {}) {
  // Get matching vehicle IDs from vehicle filter
  const vehicles = await prisma.vehicle.findMany({
    where: vehicleWhere,
    select: { id: true, type: true },
  });

  if (vehicles.length === 0) return [];

  // Group by vehicle type via raw join on vehicleId
  const typeToIds = {};
  for (const v of vehicles) {
    typeToIds[v.type] = typeToIds[v.type] || [];
    typeToIds[v.type].push(v.id);
  }

  const results = await Promise.all(
    Object.entries(typeToIds).map(async ([type, ids]) => {
      const agg = await prisma.maintenance.aggregate({
        where: { vehicleId: { in: ids }, status: "CLOSED" },
        _sum: { cost: true },
        _count: { _all: true },
      });
      return {
        type,
        totalCost: agg._sum.cost ?? 0,
        count: agg._count._all,
      };
    })
  );

  return results.sort((a, b) => b.totalCost - a.totalCost);
}

/**
 * Fetch the distinct set of filter options available in the database.
 * Used to populate the filter dropdowns on the frontend.
 *
 * @returns {Promise<Object>}
 */
export async function getFilterOptions() {
  const [types, regions] = await Promise.all([
    prisma.vehicle.findMany({
      distinct: ["type"],
      select: { type: true },
      orderBy: { type: "asc" },
    }),
    prisma.vehicle.findMany({
      distinct: ["region"],
      select: { region: true },
      orderBy: { region: "asc" },
    }),
  ]);

  return {
    vehicleTypes: types.map((r) => r.type),
    vehicleStatuses: ["AVAILABLE", "ON_TRIP", "IN_SHOP", "RETIRED"],
    regions: regions.map((r) => r.region),
  };
}

/**
 * Get all vehicles matching a filter (for scoping maintenance queries).
 *
 * @param {Object} vehicleWhere - Prisma WHERE clause.
 * @returns {Promise<string[]>} Array of vehicle IDs.
 */
export async function getVehicleIds(vehicleWhere = {}) {
  const vehicles = await prisma.vehicle.findMany({
    where: vehicleWhere,
    select: { id: true },
  });
  return vehicles.map((v) => v.id);
}
