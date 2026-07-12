import { execFile } from "child_process";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import ExcelJS from "exceljs";
import * as dashboardService from "./dashboard.service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * GET /api/dashboard/fleet
 *
 * Returns the full Fleet Manager dashboard payload:
 * KPIs, chart datasets, and filter option lists.
 *
 * Supports optional query parameters:
 * - type   (vehicle type filter)
 * - status (vehicle status filter)
 * - region (vehicle region filter)
 *
 * @route   GET /api/dashboard/fleet
 * @access  Private — Fleet Manager
 */
export async function getFleetDashboard(req, res, next) {
  try {
    const data = await dashboardService.getFleetDashboard({
      type: req.query.type,
      status: req.query.status,
      region: req.query.region,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/dashboard/fleet/export/pdf
 *
 * Uses Puppeteer (headless Chromium) via a separate worker child process to render
 * a styled HTML report of the current filtered dashboard data.
 *
 * @route   GET /api/dashboard/fleet/export/pdf
 * @access  Private — Fleet Manager
 */
export async function exportFleetPDF(req, res, next) {
  let tempHtmlPath = null;
  try {
    const data = await dashboardService.getFleetDashboard({
      type: req.query.type,
      status: req.query.status,
      region: req.query.region,
    });

    const html = buildPDFHTML(data, req.query);

    // Create a temp file path in /tmp
    const tempFileName = `report-${crypto.randomUUID()}.html`;
    tempHtmlPath = path.join("/tmp", tempFileName);
    fs.writeFileSync(tempHtmlPath, html, "utf8");

    const workerPath = path.join(__dirname, "pdf_worker.js");

    execFile(
      "node",
      [workerPath, tempHtmlPath],
      {
        maxBuffer: 10 * 1024 * 1024, // 10MB max buffer
        env: { ...process.env },
        encoding: "buffer", // Crucial: get stdout as binary buffer
      },
      (error, stdout, stderr) => {
        // Clean up temp file
        try {
          if (tempHtmlPath && fs.existsSync(tempHtmlPath)) {
            fs.unlinkSync(tempHtmlPath);
          }
        } catch (cleanupErr) {
          console.error("Temp HTML cleanup failed:", cleanupErr);
        }

        if (error) {
          console.error("PDF Worker child process error:", stderr ? stderr.toString() : error.message);
          return next(error);
        }

        const dateStr = new Date().toISOString().slice(0, 10);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="fleet-dashboard-${dateStr}.pdf"`
        );
        return res.send(stdout);
      }
    );
  } catch (error) {
    // Cleanup if pre-exec fails
    try {
      if (tempHtmlPath && fs.existsSync(tempHtmlPath)) {
        fs.unlinkSync(tempHtmlPath);
      }
    } catch (e) {}
    next(error);
  }
}

/**
 * GET /api/dashboard/fleet/export/excel
 *
 * Generates an Excel workbook with multiple sheets:
 * - Dashboard Summary (KPIs + filters)
 * - Vehicle Status Distribution
 * - Vehicle Type Distribution
 * - Fleet Utilization by Type
 * - Regional Fleet Distribution
 * - Maintenance Overview
 * - Maintenance Cost by Type
 *
 * @route   GET /api/dashboard/fleet/export/excel
 * @access  Private — Fleet Manager
 */
export async function exportFleetExcel(req, res, next) {
  try {
    const data = await dashboardService.getFleetDashboard({
      type: req.query.type,
      status: req.query.status,
      region: req.query.region,
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "TransitOps";
    workbook.created = new Date();

    const headerStyle = {
      font: { bold: true, color: { argb: "FFFFFFFF" }, size: 11 },
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF547CF5" } },
      alignment: { horizontal: "center" },
      border: {
        bottom: { style: "thin", color: { argb: "FFE0E0E0" } },
      },
    };
    const numberFmt = '#,##0';
    const currencyFmt = '₹#,##0';
    const percentFmt = '0.00"%"';

    // ── Sheet 1: Dashboard Summary ────────────────────────────────────────────
    const summary = workbook.addWorksheet("Dashboard Summary");
    summary.columns = [
      { header: "", key: "label", width: 30 },
      { header: "", key: "value", width: 25 },
    ];

    const addSummaryHeader = (ws, text) => {
      const row = ws.addRow([text]);
      row.font = { bold: true, size: 13, color: { argb: "FF547CF5" } };
      ws.mergeCells(`A${row.number}:B${row.number}`);
      ws.addRow([]);
    };

    const addSummaryRow = (ws, label, value) => {
      const row = ws.addRow([label, value]);
      row.getCell(1).font = { bold: true };
    };

    summary.addRow(["TransitOps — Fleet Manager Dashboard Export"]);
    summary.getRow(1).font = { bold: true, size: 14 };
    summary.addRow(["Generated:", new Date().toLocaleString("en-IN")]);
    summary.addRow([]);

    addSummaryHeader(summary, "Active Filters");
    addSummaryRow(summary, "Vehicle Type", data.filters.type ?? "All");
    addSummaryRow(summary, "Vehicle Status", data.filters.status ?? "All");
    addSummaryRow(summary, "Region", data.filters.region ?? "All");
    summary.addRow([]);

    addSummaryHeader(summary, "Fleet KPIs");
    addSummaryRow(summary, "Total Vehicles", data.kpis.totalVehicles);
    addSummaryRow(summary, "Active Vehicles (non-retired)", data.kpis.activeVehicles);
    addSummaryRow(summary, "Available Vehicles", data.kpis.availableVehicles);
    addSummaryRow(summary, "Vehicles on Trip", data.kpis.vehiclesOnTrip);
    addSummaryRow(summary, "Vehicles in Maintenance (IN_SHOP)", data.kpis.vehiclesInMaintenance);
    addSummaryRow(summary, "Retired Vehicles", data.kpis.retiredVehicles);
    addSummaryRow(summary, "Fleet Utilization (%)", `${data.kpis.fleetUtilization}%`);
    summary.addRow([]);

    addSummaryHeader(summary, "Maintenance KPIs");
    addSummaryRow(summary, "Active Maintenance Records", data.kpis.activeMaintenance);
    addSummaryRow(summary, "Closed Maintenance Records", data.kpis.closedMaintenance);
    addSummaryRow(summary, "Total Maintenance Records", data.kpis.totalMaintenance);
    addSummaryRow(summary, "Total Closed Maintenance Cost", `₹${data.kpis.totalMaintenanceCost.toLocaleString("en-IN")}`);

    // ── Sheet 2: Vehicle Status Distribution ──────────────────────────────────
    const statusSheet = workbook.addWorksheet("Vehicle Status");
    statusSheet.columns = [
      { header: "Status", key: "label", width: 20 },
      { header: "Vehicle Count", key: "value", width: 18 },
    ];
    ["A1", "B1"].forEach((c) => {
      statusSheet.getCell(c).style = headerStyle;
    });
    for (const row of data.charts.vehicleStatusDistribution) {
      statusSheet.addRow({ label: row.label, value: row.value });
    }

    // ── Sheet 3: Vehicle Type Distribution ────────────────────────────────────
    const typeSheet = workbook.addWorksheet("Vehicle Types");
    typeSheet.columns = [
      { header: "Vehicle Type", key: "label", width: 22 },
      { header: "Vehicle Count", key: "value", width: 18 },
    ];
    ["A1", "B1"].forEach((c) => { typeSheet.getCell(c).style = headerStyle; });
    for (const row of data.charts.vehiclesByType) {
      typeSheet.addRow({ label: row.label, value: row.value });
    }

    // ── Sheet 4: Fleet Utilization by Type ────────────────────────────────────
    const utilSheet = workbook.addWorksheet("Fleet Utilization");
    utilSheet.columns = [
      { header: "Vehicle Type", key: "label", width: 22 },
      { header: "Total (Active)", key: "total", width: 18 },
      { header: "On Trip", key: "onTrip", width: 14 },
      { header: "Utilization (%)", key: "utilization", width: 18 },
    ];
    ["A1", "B1", "C1", "D1"].forEach((c) => { utilSheet.getCell(c).style = headerStyle; });
    for (const row of data.charts.fleetUtilizationByType) {
      const r = utilSheet.addRow({
        label: row.label,
        total: row.total,
        onTrip: row.onTrip,
        utilization: row.utilization,
      });
      r.getCell(4).numFmt = '0.00"%"';
    }

    // ── Sheet 5: Regional Fleet Distribution ──────────────────────────────────
    const regionSheet = workbook.addWorksheet("Regional Distribution");
    regionSheet.columns = [
      { header: "Region", key: "label", width: 20 },
      { header: "Vehicle Count", key: "value", width: 18 },
    ];
    ["A1", "B1"].forEach((c) => { regionSheet.getCell(c).style = headerStyle; });
    for (const row of data.charts.regionalFleetDistribution) {
      regionSheet.addRow({ label: row.label, value: row.value });
    }

    // ── Sheet 6: Maintenance Overview ─────────────────────────────────────────
    const maintSheet = workbook.addWorksheet("Maintenance Overview");
    maintSheet.columns = [
      { header: "Status", key: "label", width: 20 },
      { header: "Record Count", key: "value", width: 18 },
    ];
    ["A1", "B1"].forEach((c) => { maintSheet.getCell(c).style = headerStyle; });
    for (const row of data.charts.maintenanceStatusOverview) {
      maintSheet.addRow({ label: row.label, value: row.value });
    }

    // ── Sheet 7: Maintenance Cost by Type ─────────────────────────────────────
    const costSheet = workbook.addWorksheet("Maintenance Cost by Type");
    costSheet.columns = [
      { header: "Vehicle Type", key: "label", width: 22 },
      { header: "Closed Records", key: "count", width: 18 },
      { header: "Total Cost (₹)", key: "totalCost", width: 20 },
    ];
    ["A1", "B1", "C1"].forEach((c) => { costSheet.getCell(c).style = headerStyle; });
    for (const row of data.charts.maintenanceCostByType) {
      const r = costSheet.addRow({
        label: row.label,
        count: row.count,
        totalCost: row.totalCost,
      });
      r.getCell(3).numFmt = currencyFmt;
    }

    const dateStr = new Date().toISOString().slice(0, 10);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="fleet-dashboard-${dateStr}.xlsx"`
    );

    await workbook.xlsx.write(res);
    return res.end();
  } catch (error) {
    next(error);
  }
}

/**
 * Build a styled HTML document for PDF generation by Puppeteer.
 *
 * @param {Object} data - Dashboard payload from the service.
 * @param {Object} queryFilters - Raw query filter params.
 * @returns {string} Full HTML string.
 */
function buildPDFHTML(data, queryFilters = {}) {
  const { kpis, charts, filters } = data;
  const dateStr = new Date().toLocaleString("en-IN", {
    dateStyle: "long",
    timeStyle: "short",
  });

  const filterSummary = [
    filters.type ? `Type: ${filters.type}` : null,
    filters.status ? `Status: ${filters.status}` : null,
    filters.region ? `Region: ${filters.region}` : null,
  ]
    .filter(Boolean)
    .join(" | ") || "All Vehicles";

  const kpiRows = [
    ["Total Vehicles", kpis.totalVehicles],
    ["Active Vehicles", kpis.activeVehicles],
    ["Available Vehicles", kpis.availableVehicles],
    ["Vehicles on Trip", kpis.vehiclesOnTrip],
    ["Vehicles in Maintenance", kpis.vehiclesInMaintenance],
    ["Retired Vehicles", kpis.retiredVehicles],
    ["Fleet Utilization", `${kpis.fleetUtilization}%`],
    ["Active Maintenance Records", kpis.activeMaintenance],
    ["Closed Maintenance Records", kpis.closedMaintenance],
    ["Total Maintenance Cost", `₹${(kpis.totalMaintenanceCost).toLocaleString("en-IN")}`],
  ];

  const renderTable = (headers, rows) => `
    <table>
      <thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
      <tbody>${rows
        .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`)
        .join("")}
      </tbody>
    </table>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; background: #fff; font-size: 12px; }
  .page { padding: 32px 36px; }
  .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #547cf5; padding-bottom: 16px; margin-bottom: 24px; }
  .header h1 { font-size: 22px; font-weight: 800; color: #547cf5; }
  .header .meta { text-align: right; color: #6b7280; font-size: 11px; line-height: 1.6; }
  .filter-badge { background: #eef2ff; color: #547cf5; border: 1px solid #c7d2fe; border-radius: 6px; padding: 4px 12px; font-size: 11px; font-weight: 600; display: inline-block; margin-bottom: 20px; }
  h2 { font-size: 14px; font-weight: 700; color: #1e3a5f; margin: 24px 0 10px; border-left: 3px solid #547cf5; padding-left: 10px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  thead tr { background: #547cf5; color: #fff; }
  thead th { padding: 8px 12px; text-align: left; font-size: 11px; font-weight: 700; }
  tbody tr:nth-child(even) { background: #f8faff; }
  tbody td { padding: 7px 12px; border-bottom: 1px solid #e8edf5; font-size: 11px; color: #374151; }
  .kpi-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 8px; }
  .kpi-card { background: #f0f4ff; border: 1px solid #c7d2fe; border-radius: 8px; padding: 14px 16px; }
  .kpi-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; font-weight: 600; }
  .kpi-value { font-size: 22px; font-weight: 800; color: #1e3a5f; margin-top: 4px; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .footer { margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 12px; font-size: 10px; color: #9ca3af; text-align: center; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <h1>TransitOps</h1>
      <div style="font-size:13px; font-weight:600; color:#374151; margin-top:2px;">Fleet Manager Dashboard Report</div>
    </div>
    <div class="meta">
      <div>Generated: ${dateStr}</div>
      <div>Confidential — Internal Use Only</div>
    </div>
  </div>

  <div class="filter-badge">Filters: ${filterSummary}</div>

  <h2>Fleet KPIs</h2>
  <div class="kpi-grid">
    ${kpiRows.slice(0, 8).map(([label, value]) => `
      <div class="kpi-card">
        <div class="kpi-label">${label}</div>
        <div class="kpi-value">${value}</div>
      </div>`).join("")}
  </div>

  <div class="two-col">
    <div>
      <h2>Vehicle Status Distribution</h2>
      ${renderTable(
        ["Status", "Count"],
        charts.vehicleStatusDistribution.map((r) => [r.label, r.value])
      )}
    </div>
    <div>
      <h2>Vehicles by Type</h2>
      ${renderTable(
        ["Type", "Count"],
        charts.vehiclesByType.map((r) => [r.label, r.value])
      )}
    </div>
  </div>

  <div class="two-col">
    <div>
      <h2>Fleet Utilization by Type</h2>
      ${renderTable(
        ["Type", "Active", "On Trip", "Utilization"],
        charts.fleetUtilizationByType.map((r) => [r.label, r.total, r.onTrip, `${r.utilization}%`])
      )}
    </div>
    <div>
      <h2>Regional Fleet Distribution</h2>
      ${renderTable(
        ["Region", "Vehicles"],
        charts.regionalFleetDistribution.map((r) => [r.label, r.value])
      )}
    </div>
  </div>

  <div class="two-col">
    <div>
      <h2>Maintenance Status Overview</h2>
      ${renderTable(
        ["Status", "Records"],
        charts.maintenanceStatusOverview.map((r) => [r.label, r.value])
      )}
    </div>
    <div>
      <h2>Maintenance Cost by Vehicle Type</h2>
      ${renderTable(
        ["Type", "Records", "Total Cost (₹)"],
        charts.maintenanceCostByType.map((r) => [r.label, r.count, `₹${r.totalCost.toLocaleString("en-IN")}`])
      )}
    </div>
  </div>

  <div class="footer">
    This report was automatically generated by TransitOps Fleet Management System.
    All data reflects the state of the database at the time of export.
  </div>
</div>
</body>
</html>`;
}
