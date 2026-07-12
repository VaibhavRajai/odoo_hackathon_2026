import * as dashboardRepository from "./dashboard.repository.js";

/**
 * Valid vehicle statuses for validation.
 */
const VALID_STATUSES = ["AVAILABLE", "ON_TRIP", "IN_SHOP", "RETIRED"];

/**
 * Build a Prisma WHERE clause for vehicles from incoming filter params.
 *
 * Filter semantics:
 * - type    → vehicle.type (case-insensitive match)
 * - status  → vehicle.status (exact enum match)
 * - region  → vehicle.region (case-insensitive match)
 *
 * @param {Object} filters - Raw query params: { type, status, region }
 * @returns {{ vehicleWhere: Object, normalizedFilters: Object }}
 */
function buildVehicleWhere(filters = {}) {
  const { type, status, region } = filters;

  const vehicleWhere = {};
  const normalizedFilters = { type: null, status: null, region: null };

  if (type && type !== "All") {
    vehicleWhere.type = { equals: type.trim(), mode: "insensitive" };
    normalizedFilters.type = type.trim();
  }

  if (status && status !== "All") {
    const upper = status.trim().toUpperCase();
    if (VALID_STATUSES.includes(upper)) {
      vehicleWhere.status = upper;
      normalizedFilters.status = upper;
    } else {
      const error = new Error(
        "Invalid vehicle status. Allowed values are AVAILABLE, ON_TRIP, IN_SHOP, RETIRED."
      );
      error.statusCode = 400;
      throw error;
    }
  }

  if (region && region !== "All") {
    vehicleWhere.region = { equals: region.trim(), mode: "insensitive" };
    normalizedFilters.region = region.trim();
  }

  return { vehicleWhere, normalizedFilters };
}

/**
 * Compose the full Fleet Manager dashboard analytics payload.
 *
 * KPI Definitions:
 * - activeVehicles       = all non-RETIRED vehicles in filtered set
 * - availableVehicles    = status = AVAILABLE in filtered set
 * - vehiclesOnTrip       = status = ON_TRIP in filtered set
 * - vehiclesInMaintenance= status = IN_SHOP in filtered set
 * - retiredVehicles      = status = RETIRED in filtered set
 * - fleetUtilization     = (ON_TRIP / activeVehicles) * 100, protected against /0
 * - activeMaintenance    = ACTIVE maintenance records for vehicles in filtered set
 * - closedMaintenance    = CLOSED maintenance records for vehicles in filtered set
 * - totalMaintenanceCost = sum of cost for CLOSED records in filtered set
 *
 * Filter semantics:
 * - All vehicle KPIs apply the vehicle filter (type, status, region)
 * - Maintenance stats are scoped to the filtered vehicle population
 * - Charts are all scoped to the filtered vehicle population
 *
 * @param {Object} filters - Query params: { type, status, region }
 * @returns {Promise<Object>} Full dashboard payload.
 */
export async function getFleetDashboard(filters = {}) {
  const { vehicleWhere, normalizedFilters } = buildVehicleWhere(filters);

  // Fetch all data in parallel for efficiency
  const [
    statusCounts,
    vehiclesByType,
    utilizationByType,
    vehiclesByRegion,
    vehicleIds,
    filterOptions,
  ] = await Promise.all([
    dashboardRepository.getVehicleStatusCounts(vehicleWhere),
    dashboardRepository.getVehicleCountByType(vehicleWhere),
    dashboardRepository.getUtilizationByType(vehicleWhere),
    dashboardRepository.getVehicleCountByRegion(vehicleWhere),
    dashboardRepository.getVehicleIds(vehicleWhere),
    dashboardRepository.getFilterOptions(),
  ]);

  // Maintenance stats scoped to the filtered vehicle set
  const maintenanceIds = vehicleIds.length > 0 ? vehicleIds : null;
  const [maintenanceStats, maintenanceCostByType] = await Promise.all([
    dashboardRepository.getMaintenanceStats(maintenanceIds),
    dashboardRepository.getMaintenanceCostByType(vehicleWhere),
  ]);

  // ─── KPI Calculations ────────────────────────────────────────────────────────

  const totalVehicles =
    statusCounts.AVAILABLE +
    statusCounts.ON_TRIP +
    statusCounts.IN_SHOP +
    statusCounts.RETIRED;

  const activeVehicles =
    statusCounts.AVAILABLE + statusCounts.ON_TRIP + statusCounts.IN_SHOP;

  /**
   * Fleet Utilization (%) = ON_TRIP vehicles / active (non-retired) vehicles × 100
   * Protected against division by zero.
   */
  const fleetUtilization =
    activeVehicles > 0
      ? Math.round((statusCounts.ON_TRIP / activeVehicles) * 10000) / 100
      : 0;

  return {
    filters: normalizedFilters,
    kpis: {
      totalVehicles,
      activeVehicles,
      availableVehicles: statusCounts.AVAILABLE,
      vehiclesOnTrip: statusCounts.ON_TRIP,
      vehiclesInMaintenance: statusCounts.IN_SHOP,
      retiredVehicles: statusCounts.RETIRED,
      fleetUtilization,
      activeMaintenance: maintenanceStats.active,
      closedMaintenance: maintenanceStats.closed,
      totalMaintenance: maintenanceStats.total,
      totalMaintenanceCost: maintenanceStats.totalClosedCost,
    },
    charts: {
      vehicleStatusDistribution: [
        { label: "Available", value: statusCounts.AVAILABLE, color: "#22c55e" },
        { label: "On Trip", value: statusCounts.ON_TRIP, color: "#547cf5" },
        { label: "In Shop", value: statusCounts.IN_SHOP, color: "#f59e0b" },
        { label: "Retired", value: statusCounts.RETIRED, color: "#6b7280" },
      ],
      vehiclesByType: vehiclesByType.map((r) => ({
        label: r.type,
        value: r.count,
      })),
      fleetUtilizationByType: utilizationByType.map((r) => ({
        label: r.type,
        onTrip: r.onTrip,
        total: r.total,
        utilization: r.utilization,
      })),
      regionalFleetDistribution: vehiclesByRegion.map((r) => ({
        label: r.region,
        value: r.count,
      })),
      maintenanceStatusOverview: [
        { label: "Active", value: maintenanceStats.active, color: "#f59e0b" },
        { label: "Closed", value: maintenanceStats.closed, color: "#22c55e" },
      ],
      maintenanceCostByType: maintenanceCostByType.map((r) => ({
        label: r.type,
        totalCost: r.totalCost,
        count: r.count,
      })),
    },
    filterOptions,
  };
}
