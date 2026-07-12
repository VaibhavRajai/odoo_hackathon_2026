import * as repo from "./analytics.repository.js";

/**
 * ─────────────────────────────────────────────────────────────────
 * analytics.service.js
 *
 * Business logic, formula definitions, and response composition
 * for the Reports & Analytics module.
 *
 * Formula Reference:
 * ─────────────────────────────────────────────────────────────────
 * Fuel Efficiency (km/L)
 *   = totalCompletedDistance / totalFuelConsumed
 *   Source: Sum of Trip.plannedDistance (COMPLETED) / Sum of FuelLog.liters
 *   Authoritative unit: planDistance is in km; liters is in litres.
 *   Protected against division by zero → returns 0 when liters = 0.
 *
 * Fleet Utilization (%)
 *   = ON_TRIP vehicles / (AVAILABLE + ON_TRIP + IN_SHOP) × 100
 *   Identical to the Fleet Manager dashboard formula — no new definition.
 *   Protected against division by zero → returns 0 when total active = 0.
 *
 * Operational Cost (₹)
 *   = Sum(FuelLog.cost) + Sum(Maintenance.cost where CLOSED)
 *   This is the spec-defined formula: Fuel Cost + Maintenance Cost.
 *   Other expenses (Expense model: tolls, parking) are reported separately
 *   as "otherExpenses" and are NOT included in the required formula.
 *
 * Vehicle ROI (%)
 *   = (Revenue - (FuelCost + MaintenanceCost)) / AcquisitionCost × 100
 *   Revenue = Sum(Trip.revenue where COMPLETED) for the vehicle/period.
 *   Protected against AcquisitionCost = 0 → returns null.
 *
 * Fleet ROI (%)
 *   = (TotalRevenue - (TotalFuelCost + TotalMaintenanceCost)) / TotalAcquisitionCost × 100
 *   Uses aggregate totals — NOT an average of per-vehicle ROI percentages.
 *
 * Date Filter Semantics:
 *   - Applied to: FuelLog.date, Maintenance.completedDate, Trip.createdAt, Expense.date
 *   - NOT applied to: Vehicle.acquisitionCost (it is a denominator, not time-scoped)
 * ─────────────────────────────────────────────────────────────────
 */

const VALID_STATUSES = ["AVAILABLE", "ON_TRIP", "IN_SHOP", "RETIRED"];

/**
 * Parse and validate analytics query filters.
 *
 * @param {Object} rawQuery - Raw query params from the HTTP request.
 * @returns {{ vehicleWhere, vehicleId, startDate, endDate, normalizedFilters }}
 * @throws {Error} 400 if invalid dates or status values are provided.
 */
export function parseFilters(rawQuery = {}) {
  const { startDate, endDate, vehicleId, type, status, region } = rawQuery;

  // ── Date validation ──────────────────────────────────────────────────────
  let parsedStart = null;
  let parsedEnd = null;

  if (startDate) {
    parsedStart = new Date(startDate);
    if (isNaN(parsedStart.getTime())) {
      const err = new Error("Invalid startDate format. Use ISO 8601 (YYYY-MM-DD).");
      err.statusCode = 400;
      throw err;
    }
    parsedStart.setUTCHours(0, 0, 0, 0);
  }

  if (endDate) {
    parsedEnd = new Date(endDate);
    if (isNaN(parsedEnd.getTime())) {
      const err = new Error("Invalid endDate format. Use ISO 8601 (YYYY-MM-DD).");
      err.statusCode = 400;
      throw err;
    }
    parsedEnd.setUTCHours(23, 59, 59, 999);
  }

  if (parsedStart && parsedEnd && parsedStart > parsedEnd) {
    const err = new Error("startDate must be before or equal to endDate.");
    err.statusCode = 400;
    throw err;
  }

  // ── Vehicle WHERE clause ─────────────────────────────────────────────────
  const vehicleWhere = {};
  const normalizedFilters = {
    startDate: startDate || null,
    endDate: endDate || null,
    vehicleId: vehicleId || null,
    type: null,
    status: null,
    region: null,
  };

  if (vehicleId) {
    vehicleWhere.id = vehicleId;
    normalizedFilters.vehicleId = vehicleId;
  }

  if (type && type !== "All") {
    vehicleWhere.type = { equals: type.trim(), mode: "insensitive" };
    normalizedFilters.type = type.trim();
  }

  if (status && status !== "All") {
    const upper = status.trim().toUpperCase();
    if (!VALID_STATUSES.includes(upper)) {
      const err = new Error(
        "Invalid vehicle status. Allowed: AVAILABLE, ON_TRIP, IN_SHOP, RETIRED."
      );
      err.statusCode = 400;
      throw err;
    }
    vehicleWhere.status = upper;
    normalizedFilters.status = upper;
  }

  if (region && region !== "All") {
    vehicleWhere.region = { equals: region.trim(), mode: "insensitive" };
    normalizedFilters.region = region.trim();
  }

  return { vehicleWhere, startDate: parsedStart, endDate: parsedEnd, normalizedFilters };
}

/**
 * Compose the full fleet analytics payload.
 *
 * Fetches all required data in parallel and calculates analytics
 * on the service layer. No Prisma calls in this function.
 *
 * @param {Object} rawQuery - Raw query params from the HTTP request.
 * @returns {Promise<Object>} Full analytics response payload.
 */
export async function getFleetAnalytics(rawQuery = {}) {
  const { vehicleWhere, startDate, endDate, normalizedFilters } = parseFilters(rawQuery);

  // ── Fetch all vehicles matching the filter ───────────────────────────────
  const vehicles = await repo.getVehiclesWithCosts(vehicleWhere);
  const vehicleIds = vehicles.map((v) => v.id);

  if (vehicleIds.length === 0) {
    return await buildEmptyResponse(normalizedFilters);
  }

  // ── Parallel data fetches ─────────────────────────────────────────────────
  const [
    fuelAggs,
    maintenanceAggs,
    expenseAggs,
    tripAggs,
    statusCounts,
    utilizationByType,
    costTrend,
    filterOptions,
  ] = await Promise.all([
    repo.getFuelAggregatesByVehicle(vehicleIds, startDate, endDate),
    repo.getMaintenanceCostsByVehicle(vehicleIds, startDate, endDate),
    repo.getOtherExpensesByVehicle(vehicleIds, startDate, endDate),
    repo.getTripAggregatesByVehicle(vehicleIds, startDate, endDate),
    repo.getVehicleStatusCounts(vehicleWhere),
    repo.getUtilizationByType(vehicleWhere),
    repo.getCostTrendByMonth(vehicleIds, startDate, endDate),
    repo.getAnalyticsFilterOptions(),
  ]);

  // ── Build lookup maps for O(1) per-vehicle access ────────────────────────
  const fuelMap = Object.fromEntries(fuelAggs.map((r) => [r.vehicleId, r]));
  const maintMap = Object.fromEntries(maintenanceAggs.map((r) => [r.vehicleId, r]));
  const expMap = Object.fromEntries(expenseAggs.map((r) => [r.vehicleId, r]));
  const tripMap = Object.fromEntries(tripAggs.map((r) => [r.vehicleId, r]));

  // ── Per-vehicle analytics ────────────────────────────────────────────────
  const vehicleAnalytics = vehicles.map((v) => {
    const fuel = fuelMap[v.id];
    const maint = maintMap[v.id];
    const exp = expMap[v.id];
    const trip = tripMap[v.id];

    const totalLiters = fuel?.totalLiters ?? 0;
    const totalFuelCost = fuel?.totalFuelCost ?? 0;
    const totalMaintenanceCost = maint?.totalMaintenanceCost ?? 0;
    const totalExpenses = exp?.totalExpenses ?? 0;
    const totalDistance = trip?.totalDistance ?? 0;
    const totalRevenue = trip?.totalRevenue ?? 0;
    const tripCount = trip?.tripCount ?? 0;

    /**
     * Fuel Efficiency = totalDistance / totalLiters
     * Protected against division by zero.
     */
    const fuelEfficiency =
      totalLiters > 0
        ? Math.round((totalDistance / totalLiters) * 100) / 100
        : null;

    /**
     * Operational Cost = Fuel Cost + Maintenance Cost
     * (per hackathon spec — Expense is reported separately)
     */
    const operationalCost = totalFuelCost + totalMaintenanceCost;

    /**
     * Vehicle ROI (%) = (Revenue - OperationalCost) / AcquisitionCost × 100
     * Protected against AcquisitionCost = 0.
     */
    const roi =
      v.acquisitionCost > 0
        ? Math.round(
            ((totalRevenue - operationalCost) / v.acquisitionCost) * 10000
          ) / 100
        : null;

    return {
      id: v.id,
      registrationNumber: v.registrationNumber,
      name: v.name,
      type: v.type,
      region: v.region,
      status: v.status,
      acquisitionCost: v.acquisitionCost,
      tripCount,
      totalDistance,
      totalLiters,
      fuelEfficiency,
      totalFuelCost,
      totalMaintenanceCost,
      operationalCost,
      totalExpenses,
      totalRevenue,
      roi,
    };
  });

  // ── Fleet-level KPI aggregations ──────────────────────────────────────────

  const totalDistance = vehicleAnalytics.reduce((s, v) => s + v.totalDistance, 0);
  const totalLiters = vehicleAnalytics.reduce((s, v) => s + v.totalLiters, 0);
  const totalFuelCost = vehicleAnalytics.reduce((s, v) => s + v.totalFuelCost, 0);
  const totalMaintenanceCost = vehicleAnalytics.reduce((s, v) => s + v.totalMaintenanceCost, 0);
  const totalExpenses = vehicleAnalytics.reduce((s, v) => s + v.totalExpenses, 0);
  const totalRevenue = vehicleAnalytics.reduce((s, v) => s + v.totalRevenue, 0);
  const totalOperationalCost = totalFuelCost + totalMaintenanceCost;

  /**
   * Fleet Fuel Efficiency = total distance / total liters
   * Uses aggregate formula — not average of individual ratios.
   */
  const fleetFuelEfficiency =
    totalLiters > 0
      ? Math.round((totalDistance / totalLiters) * 100) / 100
      : 0;

  /**
   * Fleet Utilization (%) = ON_TRIP / (non-RETIRED) × 100
   * Same formula as the Fleet Manager dashboard.
   */
  const activeVehicles =
    statusCounts.AVAILABLE + statusCounts.ON_TRIP + statusCounts.IN_SHOP;
  const fleetUtilization =
    activeVehicles > 0
      ? Math.round((statusCounts.ON_TRIP / activeVehicles) * 10000) / 100
      : 0;

  /**
   * Fleet ROI (%) = (TotalRevenue - TotalOperationalCost) / TotalAcquisitionCost × 100
   * Uses sum of acquisition costs — NOT average of per-vehicle ROI.
   */
  const totalAcquisitionCost = vehicles.reduce(
    (s, v) => s + (v.acquisitionCost ?? 0),
    0
  );
  const fleetROI =
    totalAcquisitionCost > 0
      ? Math.round(
          ((totalRevenue - totalOperationalCost) / totalAcquisitionCost) * 10000
        ) / 100
      : null;

  // ── Chart datasets ────────────────────────────────────────────────────────

  // Fuel efficiency by vehicle — sorted best first, top 15
  const fuelEfficiencyByVehicle = vehicleAnalytics
    .filter((v) => v.fuelEfficiency !== null)
    .sort((a, b) => (b.fuelEfficiency ?? 0) - (a.fuelEfficiency ?? 0))
    .slice(0, 15)
    .map((v) => ({
      label: v.registrationNumber,
      name: v.name,
      value: v.fuelEfficiency,
    }));

  // Operational cost breakdown (doughnut)
  const operationalCostBreakdown = [
    { label: "Fuel Cost", value: Math.round(totalFuelCost), color: "#547cf5" },
    { label: "Maintenance Cost", value: Math.round(totalMaintenanceCost), color: "#f59e0b" },
  ];

  // Operational cost by vehicle — top 10 most expensive
  const operationalCostByVehicle = vehicleAnalytics
    .filter((v) => v.operationalCost > 0)
    .sort((a, b) => b.operationalCost - a.operationalCost)
    .slice(0, 10)
    .map((v) => ({
      label: v.registrationNumber,
      name: v.name,
      fuelCost: Math.round(v.totalFuelCost),
      maintenanceCost: Math.round(v.totalMaintenanceCost),
      total: Math.round(v.operationalCost),
    }));

  // ROI by vehicle — sorted best first, show all (include negatives)
  const roiByVehicle = vehicleAnalytics
    .filter((v) => v.roi !== null)
    .sort((a, b) => (b.roi ?? 0) - (a.roi ?? 0))
    .map((v) => ({
      label: v.registrationNumber,
      name: v.name,
      roi: v.roi,
    }));

  return {
    filters: normalizedFilters,
    summary: {
      fuelEfficiency: fleetFuelEfficiency,
      fleetUtilization,
      totalDistance: Math.round(totalDistance),
      totalLiters: Math.round(totalLiters * 10) / 10,
      fuelCost: Math.round(totalFuelCost),
      maintenanceCost: Math.round(totalMaintenanceCost),
      operationalCost: Math.round(totalOperationalCost),
      otherExpenses: Math.round(totalExpenses),
      revenue: Math.round(totalRevenue),
      vehicleROI: fleetROI,
      totalVehicles: vehicles.length,
    },
    charts: {
      fuelEfficiencyByVehicle,
      operationalCostBreakdown,
      operationalCostByVehicle,
      roiByVehicle,
      utilizationByType: utilizationByType.map((r) => ({
        label: r.type,
        onTrip: r.onTrip,
        total: r.total,
        utilization: r.utilization,
      })),
      costTrend,
    },
    vehicles: vehicleAnalytics,
    filterOptions,
  };
}

/**
 * Build a safe empty response when no vehicles match the filter.
 *
 * @param {Object} normalizedFilters
 * @returns {Promise<Object>}
 */
async function buildEmptyResponse(normalizedFilters) {
  return {
    filters: normalizedFilters,
    summary: {
      fuelEfficiency: 0,
      fleetUtilization: 0,
      totalDistance: 0,
      totalLiters: 0,
      fuelCost: 0,
      maintenanceCost: 0,
      operationalCost: 0,
      otherExpenses: 0,
      revenue: 0,
      vehicleROI: null,
      totalVehicles: 0,
    },
    charts: {
      fuelEfficiencyByVehicle: [],
      operationalCostBreakdown: [
        { label: "Fuel Cost", value: 0, color: "#547cf5" },
        { label: "Maintenance Cost", value: 0, color: "#f59e0b" },
      ],
      operationalCostByVehicle: [],
      roiByVehicle: [],
      utilizationByType: [],
      costTrend: [],
    },
    vehicles: [],
    filterOptions: await repo.getAnalyticsFilterOptions(),
  };
}
