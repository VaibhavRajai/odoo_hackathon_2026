import * as maintenanceService from "./maintenance.service.js";

/**
 * Create a new maintenance record.
 *
 * @route   POST /api/maintenance
 * @access  Private — Fleet Manager only
 */
export async function createMaintenance(req, res, next) {
  try {
    const maintenance = await maintenanceService.createMaintenance(req.body);

    return res.status(201).json({
      success: true,
      message: "Maintenance record created. Vehicle status set to IN_SHOP.",
      data: maintenance,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get the list of maintenance records with optional filters.
 *
 * Supported query parameters:
 * - vehicleId  : filter by vehicle UUID
 * - status     : ACTIVE | CLOSED
 * - search     : partial registration number match
 *
 * @route   GET /api/maintenance
 * @access  Private — Authenticated users
 */
export async function getMaintenanceRecords(req, res, next) {
  try {
    const result = await maintenanceService.getMaintenanceRecords({
      vehicleId: req.query.vehicleId,
      status: req.query.status,
      search: req.query.search,
      page: req.query.page,
      limit: req.query.limit,
    });

    return res.status(200).json({
      success: true,
      count: result.records.length,
      pagination: result.pagination,
      data: result.records,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Close an active maintenance record.
 *
 * Restores vehicle status to AVAILABLE (unless RETIRED).
 *
 * @route   PATCH /api/maintenance/:id/close
 * @access  Private — Fleet Manager only
 */
export async function closeMaintenanceRecord(req, res, next) {
  try {
    const maintenance = await maintenanceService.closeMaintenance(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Maintenance record closed. Vehicle status restored to AVAILABLE.",
      data: maintenance,
    });
  } catch (error) {
    next(error);
  }
}
