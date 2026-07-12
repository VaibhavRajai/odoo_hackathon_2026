import prisma from "../../config/prisma.js";

/**
 * ─────────────────────────────────────────────────────────────────
 * analytics.repository.js
 *
 * All Prisma queries for the Reports & Analytics module.
 * No business logic here — only data access.
 * ─────────────────────────────────────────────────────────────────
 */

/**
 * Fetch all vehicles matching the given WHERE clause,
 * including their aggregated fuel, maintenance, and expense data.
 *
 * Returns the raw vehicle records; aggregations are done in the service.
 *
 * @param {Object} vehicleWhere - Prisma WHERE clause for vehicles.
 * @returns {Promise<Array>} Raw vehicle rows with associations.
 */
export async function getVehiclesWithCosts(vehicleWhere = {}) {
  return prisma.vehicle.findMany({
    where: vehicleWhere,
    select: {
      id: true,
      registrationNumber: true,
      name: true,
      type: true,
      region: true,
      status: true,
      acquisitionCost: true,
      odometer: true,
    },
    orderBy: { registrationNumber: "asc" },
  });
}

/**
 * Sum FuelLog.liters and FuelLog.cost per vehicle for the given
 * vehicle ID set and optional date range.
 *
 * @param {string[]} vehicleIds - Vehicle IDs to scope the query.
 * @param {Date|null} startDate - Optional start date filter on FuelLog.date.
 * @param {Date|null} endDate   - Optional end date filter on FuelLog.date.
 * @returns {Promise<Array<{vehicleId, totalLiters, totalFuelCost}>>}
 */
export async function getFuelAggregatesByVehicle(vehicleIds, startDate, endDate) {
  const dateWhere = buildDateWhere(startDate, endDate);

  const rows = await prisma.fuelLog.groupBy({
    by: ["vehicleId"],
    where: {
      vehicleId: { in: vehicleIds },
      ...(Object.keys(dateWhere).length > 0 ? { date: dateWhere } : {}),
    },
    _sum: { liters: true, cost: true },
  });

  return rows.map((r) => ({
    vehicleId: r.vehicleId,
    totalLiters: r._sum.liters ?? 0,
    totalFuelCost: r._sum.cost ?? 0,
  }));
}

/**
 * Sum Maintenance.cost (CLOSED records) per vehicle for the given
 * vehicle ID set and optional date range (on completedDate).
 *
 * @param {string[]} vehicleIds - Vehicle IDs to scope the query.
 * @param {Date|null} startDate - Optional start date filter on Maintenance.completedDate.
 * @param {Date|null} endDate   - Optional end date filter.
 * @returns {Promise<Array<{vehicleId, totalMaintenanceCost, maintenanceCount}>>}
 */
export async function getMaintenanceCostsByVehicle(vehicleIds, startDate, endDate) {
  const dateWhere = buildDateWhere(startDate, endDate);

  const rows = await prisma.maintenance.groupBy({
    by: ["vehicleId"],
    where: {
      vehicleId: { in: vehicleIds },
      status: "CLOSED",
      ...(Object.keys(dateWhere).length > 0 ? { completedDate: dateWhere } : {}),
    },
    _sum: { cost: true },
    _count: { _all: true },
  });

  return rows.map((r) => ({
    vehicleId: r.vehicleId,
    totalMaintenanceCost: r._sum.cost ?? 0,
    maintenanceCount: r._count._all,
  }));
}

/**
 * Sum Expense.amount per vehicle for the given vehicle ID set and
 * optional date range (on Expense.date).
 *
 * Expenses are separate from fuel and maintenance per spec — they represent
 * tolls, parking, fines, and other miscellaneous operational costs.
 *
 * @param {string[]} vehicleIds - Vehicle IDs to scope the query.
 * @param {Date|null} startDate - Optional start date filter.
 * @param {Date|null} endDate   - Optional end date filter.
 * @returns {Promise<Array<{vehicleId, totalExpenses}>>}
 */
export async function getOtherExpensesByVehicle(vehicleIds, startDate, endDate) {
  const dateWhere = buildDateWhere(startDate, endDate);

  const rows = await prisma.expense.groupBy({
    by: ["vehicleId"],
    where: {
      vehicleId: { in: vehicleIds },
      ...(Object.keys(dateWhere).length > 0 ? { date: dateWhere } : {}),
    },
    _sum: { amount: true },
  });

  return rows.map((r) => ({
    vehicleId: r.vehicleId,
    totalExpenses: r._sum.amount ?? 0,
  }));
}

/**
 * Sum Trip.plannedDistance and Trip.revenue for COMPLETED trips
 * per vehicle, within the given vehicle ID set and optional date range.
 *
 * Filter semantics:
 * - Date range filters on Trip.createdAt (trip start time).
 * - Only COMPLETED trips contribute distance and revenue.
 * - CANCELLED trips are excluded.
 *
 * @param {string[]} vehicleIds - Vehicle IDs to scope the query.
 * @param {Date|null} startDate - Optional start date filter on Trip.createdAt.
 * @param {Date|null} endDate   - Optional end date filter.
 * @returns {Promise<Array<{vehicleId, totalDistance, totalRevenue, tripCount}>>}
 */
export async function getTripAggregatesByVehicle(vehicleIds, startDate, endDate) {
  const dateWhere = buildDateWhere(startDate, endDate);

  const rows = await prisma.trip.groupBy({
    by: ["vehicleId"],
    where: {
      vehicleId: { in: vehicleIds },
      status: "COMPLETED",
      ...(Object.keys(dateWhere).length > 0 ? { createdAt: dateWhere } : {}),
    },
    _sum: { plannedDistance: true, revenue: true },
    _count: { _all: true },
  });

  return rows.map((r) => ({
    vehicleId: r.vehicleId,
    totalDistance: r._sum.plannedDistance ?? 0,
    totalRevenue: r._sum.revenue ?? 0,
    tripCount: r._count._all,
  }));
}

/**
 * Get vehicle status counts (for fleet utilization KPI).
 * Reuses the same formula as the Fleet Manager dashboard:
 *   Fleet Utilization (%) = ON_TRIP / (non-RETIRED) × 100
 *
 * @param {Object} vehicleWhere - Base vehicle filter (without status).
 * @returns {Promise<{AVAILABLE, ON_TRIP, IN_SHOP, RETIRED}>}
 */
export async function getVehicleStatusCounts(vehicleWhere = {}) {
  const counts = await prisma.vehicle.groupBy({
    by: ["status"],
    where: vehicleWhere,
    _count: { _all: true },
  });

  const result = { AVAILABLE: 0, ON_TRIP: 0, IN_SHOP: 0, RETIRED: 0 };
  for (const row of counts) {
    result[row.status] = row._count._all;
  }
  return result;
}

/**
 * Get vehicle status grouped by type (for utilization by type chart).
 *
 * @param {Object} baseWhere - Vehicle filter (excluding status for correct totals).
 * @returns {Promise<Array<{type, onTrip, total, utilization}>>}
 */
export async function getUtilizationByType(baseWhere = {}) {
  const { status: _excluded, ...filterWithoutStatus } = baseWhere;

  const activeWhere = { ...filterWithoutStatus, status: { not: "RETIRED" } };
  const onTripWhere = { ...filterWithoutStatus, status: "ON_TRIP" };

  const [activeCounts, onTripCounts] = await Promise.all([
    prisma.vehicle.groupBy({ by: ["type"], where: activeWhere, _count: { _all: true } }),
    prisma.vehicle.groupBy({ by: ["type"], where: onTripWhere, _count: { _all: true } }),
  ]);

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
 * Get operational cost trend grouped by month (for cost-over-time chart).
 * Groups FuelLog and Maintenance costs by calendar month.
 *
 * @param {string[]} vehicleIds - Vehicle IDs to scope the query.
 * @param {Date|null} startDate - Optional start date.
 * @param {Date|null} endDate   - Optional end date.
 * @returns {Promise<Array<{month, fuelCost, maintenanceCost}>>}
 */
export async function getCostTrendByMonth(vehicleIds, startDate, endDate) {
  const dateWhere = buildDateWhere(startDate, endDate);
  const vehicleFilter = { in: vehicleIds };

  // Raw fuel cost grouped by month using Prisma's raw-ish approach
  // We do this via groupBy with createdAt in memory grouping (no native month groupBy in Prisma)
  const [fuelLogs, maintenanceRecords] = await Promise.all([
    prisma.fuelLog.findMany({
      where: {
        vehicleId: vehicleFilter,
        ...(Object.keys(dateWhere).length > 0 ? { date: dateWhere } : {}),
      },
      select: { date: true, cost: true },
    }),
    prisma.maintenance.findMany({
      where: {
        vehicleId: vehicleFilter,
        status: "CLOSED",
        ...(Object.keys(dateWhere).length > 0 ? { completedDate: dateWhere } : {}),
      },
      select: { completedDate: true, cost: true },
    }),
  ]);

  // Group by YYYY-MM
  const monthMap = {};

  for (const f of fuelLogs) {
    const key = toMonthKey(f.date);
    monthMap[key] = monthMap[key] || { fuelCost: 0, maintenanceCost: 0 };
    monthMap[key].fuelCost += f.cost;
  }

  for (const m of maintenanceRecords) {
    if (!m.completedDate) continue;
    const key = toMonthKey(m.completedDate);
    monthMap[key] = monthMap[key] || { fuelCost: 0, maintenanceCost: 0 };
    monthMap[key].maintenanceCost += m.cost;
  }

  return Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, costs]) => ({
      month,
      fuelCost: Math.round(costs.fuelCost),
      maintenanceCost: Math.round(costs.maintenanceCost),
      totalCost: Math.round(costs.fuelCost + costs.maintenanceCost),
    }));
}

/**
 * Get available filter option values (distinct types, regions, vehicle list).
 *
 * @returns {Promise<Object>} Filter options for the frontend dropdowns.
 */
export async function getAnalyticsFilterOptions() {
  const [types, regions, vehicles] = await Promise.all([
    prisma.vehicle.findMany({ distinct: ["type"], select: { type: true }, orderBy: { type: "asc" } }),
    prisma.vehicle.findMany({ distinct: ["region"], select: { region: true }, orderBy: { region: "asc" } }),
    prisma.vehicle.findMany({
      select: { id: true, registrationNumber: true, name: true, type: true },
      orderBy: { registrationNumber: "asc" },
    }),
  ]);

  return {
    vehicleTypes: types.map((r) => r.type),
    vehicleStatuses: ["AVAILABLE", "ON_TRIP", "IN_SHOP", "RETIRED"],
    regions: regions.map((r) => r.region),
    vehicles: vehicles.map((v) => ({
      id: v.id,
      label: `${v.registrationNumber} — ${v.name}`,
      type: v.type,
    })),
  };
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

/**
 * Build Prisma date range WHERE clause.
 *
 * @param {Date|null} startDate
 * @param {Date|null} endDate
 * @returns {Object} Prisma date filter (empty object if no dates provided).
 */
function buildDateWhere(startDate, endDate) {
  const where = {};
  if (startDate) where.gte = startDate;
  if (endDate) where.lte = endDate;
  return where;
}

/**
 * Convert a Date to a YYYY-MM string for time-series grouping.
 *
 * @param {Date} date
 * @returns {string}
 */
function toMonthKey(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
