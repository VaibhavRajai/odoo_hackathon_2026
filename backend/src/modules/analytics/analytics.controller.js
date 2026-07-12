import { execFile } from "child_process";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import ExcelJS from "exceljs";
import * as analyticsService from "./analytics.service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * @route   GET /api/analytics/fleet
 * @desc    Get filtered fleet reports and operational analytics
 * @access  Private — Financial Analyst, Fleet Manager
 *
 * Query params:
 *   startDate, endDate, vehicleId, type, status, region
 */
export async function getFleetAnalytics(req, res, next) {
  try {
    const data = await analyticsService.getFleetAnalytics(req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/analytics/fleet/export/csv
 * @desc    Export per-vehicle fleet analytics as a CSV file
 * @access  Private — Financial Analyst, Fleet Manager
 *
 * The CSV represents the currently filtered data.
 * Filename includes the active date range when provided.
 */
export async function exportFleetCSV(req, res, next) {
  try {
    const data = await analyticsService.getFleetAnalytics(req.query);

    const { startDate, endDate } = data.filters;
    const dateStr = new Date().toISOString().slice(0, 10);
    let filenameParts = ["transitops-fleet-analytics", dateStr];
    if (startDate) filenameParts = ["transitops-fleet-analytics", startDate, "to", endDate ?? dateStr];

    const filename = filenameParts.join("-") + ".csv";

    // ── CSV Headers ──────────────────────────────────────────────────────────
    const headers = [
      "Registration Number",
      "Vehicle Name",
      "Vehicle Type",
      "Region",
      "Status",
      "Completed Trips",
      "Distance Travelled (km)",
      "Fuel Consumed (L)",
      "Fuel Efficiency (km/L)",
      "Fuel Cost (INR)",
      "Maintenance Cost (INR)",
      "Operational Cost (INR)",
      "Other Expenses (INR)",
      "Revenue (INR)",
      "Acquisition Cost (INR)",
      "ROI (%)",
    ];

    /**
     * Escape a value for CSV: wrap in double-quotes, escape internal quotes.
     * Handles commas, newlines, and embedded double-quotes correctly.
     */
    const escapeCSV = (val) => {
      if (val === null || val === undefined) return "";
      const str = String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = data.vehicles.map((v) => [
      escapeCSV(v.registrationNumber),
      escapeCSV(v.name),
      escapeCSV(v.type),
      escapeCSV(v.region),
      escapeCSV(v.status),
      escapeCSV(v.tripCount),
      escapeCSV(v.totalDistance),
      escapeCSV(v.totalLiters),
      escapeCSV(v.fuelEfficiency ?? "N/A"),
      escapeCSV(v.totalFuelCost),
      escapeCSV(v.totalMaintenanceCost),
      escapeCSV(v.operationalCost),
      escapeCSV(v.totalExpenses),
      escapeCSV(v.totalRevenue),
      escapeCSV(v.acquisitionCost),
      escapeCSV(v.roi !== null ? v.roi + "%" : "N/A"),
    ]);

    const csvLines = [
      headers.join(","),
      ...rows.map((r) => r.join(",")),
    ];

    // Add a summary footer
    const { summary } = data;
    csvLines.push("");
    csvLines.push("FLEET SUMMARY");
    csvLines.push(`Fleet Fuel Efficiency (km/L),${summary.fuelEfficiency}`);
    csvLines.push(`Fleet Utilization (%),${summary.fleetUtilization}`);
    csvLines.push(`Total Distance (km),${summary.totalDistance}`);
    csvLines.push(`Total Fuel Consumed (L),${summary.totalLiters}`);
    csvLines.push(`Total Fuel Cost (INR),${summary.fuelCost}`);
    csvLines.push(`Total Maintenance Cost (INR),${summary.maintenanceCost}`);
    csvLines.push(`Total Operational Cost (INR),${summary.operationalCost}`);
    csvLines.push(`Other Expenses (INR),${summary.otherExpenses}`);
    csvLines.push(`Total Revenue (INR),${summary.revenue}`);
    csvLines.push(`Fleet ROI (%),${summary.vehicleROI !== null ? summary.vehicleROI : "N/A"}`);

    const csv = csvLines.join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(csv);
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/analytics/fleet/export/excel
 * @desc    Export fleet analytics as a multi-sheet Excel workbook
 * @access  Private — Financial Analyst, Fleet Manager
 */
export async function exportFleetExcel(req, res, next) {
  try {
    const data = await analyticsService.getFleetAnalytics(req.query);
    const { summary, vehicles, charts, filters } = data;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "TransitOps";
    workbook.created = new Date();

    const headerStyle = {
      font: { bold: true, color: { argb: "FFFFFFFF" }, size: 11 },
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF547CF5" } },
      alignment: { horizontal: "center" },
      border: { bottom: { style: "thin", color: { argb: "FFE0E0E0" } } },
    };
    const currencyFmt = "₹#,##0";
    const pctFmt = '0.00"%"';

    // ── Sheet 1: Summary ──────────────────────────────────────────────────────
    const summarySheet = workbook.addWorksheet("Analytics Summary");
    summarySheet.columns = [
      { key: "label", width: 36 },
      { key: "value", width: 24 },
    ];

    const addRow = (ws, label, value) => {
      const r = ws.addRow([label, value]);
      r.getCell(1).font = { bold: true };
    };

    summarySheet.addRow(["TransitOps — Fleet Analytics Report"]).font = { bold: true, size: 14 };
    summarySheet.addRow(["Generated:", new Date().toLocaleString("en-IN")]);
    summarySheet.addRow([]);

    const filterSummary = [
      filters.startDate ? `Start: ${filters.startDate}` : null,
      filters.endDate ? `End: ${filters.endDate}` : null,
      filters.type ? `Type: ${filters.type}` : null,
      filters.status ? `Status: ${filters.status}` : null,
      filters.region ? `Region: ${filters.region}` : null,
    ].filter(Boolean).join(" | ") || "All Vehicles";

    addRow(summarySheet, "Active Filters", filterSummary);
    summarySheet.addRow([]);

    summarySheet.addRow(["KEY PERFORMANCE INDICATORS"]).font = { bold: true, size: 12, color: { argb: "FF547CF5" } };
    addRow(summarySheet, "Fleet Fuel Efficiency (km/L)", summary.fuelEfficiency);
    addRow(summarySheet, "Fleet Utilization (%)", summary.fleetUtilization);
    addRow(summarySheet, "Total Distance (km)", summary.totalDistance);
    addRow(summarySheet, "Total Fuel Consumed (L)", summary.totalLiters);
    addRow(summarySheet, "Total Fuel Cost (₹)", summary.fuelCost);
    addRow(summarySheet, "Total Maintenance Cost (₹)", summary.maintenanceCost);
    addRow(summarySheet, "Operational Cost (₹)", summary.operationalCost);
    addRow(summarySheet, "Other Expenses (₹)", summary.otherExpenses);
    addRow(summarySheet, "Total Revenue (₹)", summary.revenue);
    addRow(summarySheet, "Fleet ROI (%)", summary.vehicleROI !== null ? summary.vehicleROI : "N/A");

    // ── Sheet 2: Per-Vehicle Analytics ────────────────────────────────────────
    const vehicleSheet = workbook.addWorksheet("Per-Vehicle Analytics");
    vehicleSheet.columns = [
      { header: "Registration #", key: "reg", width: 18 },
      { header: "Name", key: "name", width: 22 },
      { header: "Type", key: "type", width: 14 },
      { header: "Region", key: "region", width: 12 },
      { header: "Status", key: "status", width: 12 },
      { header: "Trips", key: "trips", width: 8 },
      { header: "Distance (km)", key: "dist", width: 16 },
      { header: "Fuel (L)", key: "liters", width: 12 },
      { header: "Efficiency (km/L)", key: "eff", width: 18 },
      { header: "Fuel Cost (₹)", key: "fuelCost", width: 16 },
      { header: "Maint. Cost (₹)", key: "maintCost", width: 16 },
      { header: "Op. Cost (₹)", key: "opCost", width: 16 },
      { header: "Revenue (₹)", key: "revenue", width: 16 },
      { header: "Acq. Cost (₹)", key: "acqCost", width: 16 },
      { header: "ROI (%)", key: "roi", width: 10 },
    ];

    ["A1","B1","C1","D1","E1","F1","G1","H1","I1","J1","K1","L1","M1","N1","O1"].forEach((c) => {
      vehicleSheet.getCell(c).style = headerStyle;
    });

    for (const v of vehicles) {
      vehicleSheet.addRow({
        reg: v.registrationNumber,
        name: v.name,
        type: v.type,
        region: v.region,
        status: v.status,
        trips: v.tripCount,
        dist: v.totalDistance,
        liters: v.totalLiters,
        eff: v.fuelEfficiency ?? "N/A",
        fuelCost: v.totalFuelCost,
        maintCost: v.totalMaintenanceCost,
        opCost: v.operationalCost,
        revenue: v.totalRevenue,
        acqCost: v.acquisitionCost,
        roi: v.roi !== null ? v.roi : "N/A",
      });
    }

    const dateStr = new Date().toISOString().slice(0, 10);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="transitops-analytics-${dateStr}.xlsx"`
    );

    await workbook.xlsx.write(res);
    return res.end();
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/analytics/fleet/export/pdf
 * @desc    Export fleet analytics as a PDF report via Puppeteer
 * @access  Private — Financial Analyst, Fleet Manager
 */
export async function exportFleetPDF(req, res, next) {
  let tempHtmlPath = null;
  try {
    const data = await analyticsService.getFleetAnalytics(req.query);
    const html = buildAnalyticsPDFHTML(data);

    const tempFileName = `analytics-${crypto.randomUUID()}.html`;
    tempHtmlPath = path.join("/tmp", tempFileName);
    fs.writeFileSync(tempHtmlPath, html, "utf8");

    // Reuse the same Puppeteer worker used by the dashboard module
    const workerPath = path.join(__dirname, "../dashboard/pdf_worker.js");

    execFile(
      "node",
      [workerPath, tempHtmlPath],
      {
        maxBuffer: 10 * 1024 * 1024,
        env: { ...process.env },
        encoding: "buffer",
      },
      (error, stdout, stderr) => {
        try {
          if (tempHtmlPath && fs.existsSync(tempHtmlPath)) {
            fs.unlinkSync(tempHtmlPath);
          }
        } catch (e) {}

        if (error) {
          console.error("Analytics PDF worker error:", stderr?.toString() ?? error.message);
          return next(error);
        }

        const dateStr = new Date().toISOString().slice(0, 10);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="transitops-analytics-${dateStr}.pdf"`
        );
        return res.send(stdout);
      }
    );
  } catch (error) {
    try {
      if (tempHtmlPath && fs.existsSync(tempHtmlPath)) {
        fs.unlinkSync(tempHtmlPath);
      }
    } catch (e) {}
    next(error);
  }
}

// ─── PDF HTML Builder ─────────────────────────────────────────────────────────

function buildAnalyticsPDFHTML(data) {
  const { summary, vehicles, filters } = data;
  const dateStr = new Date().toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" });

  const filterSummary = [
    filters.startDate ? `Date: ${filters.startDate} – ${filters.endDate ?? "now"}` : null,
    filters.type ? `Type: ${filters.type}` : null,
    filters.status ? `Status: ${filters.status}` : null,
    filters.region ? `Region: ${filters.region}` : null,
  ].filter(Boolean).join(" | ") || "All Vehicles";

  const fmt = (n) => `₹${Number(n).toLocaleString("en-IN")}`;
  const fmtPct = (n) => (n !== null && n !== undefined ? `${n}%` : "N/A");
  const fmtNum = (n) => Number(n).toLocaleString("en-IN");

  const kpiCards = [
    { label: "Fleet Fuel Efficiency", value: `${summary.fuelEfficiency} km/L` },
    { label: "Fleet Utilization", value: fmtPct(summary.fleetUtilization) },
    { label: "Operational Cost", value: fmt(summary.operationalCost) },
    { label: "Fleet ROI", value: fmtPct(summary.vehicleROI) },
    { label: "Total Revenue", value: fmt(summary.revenue) },
    { label: "Total Distance", value: `${fmtNum(summary.totalDistance)} km` },
  ];

  const topVehicles = [...vehicles]
    .filter((v) => v.roi !== null)
    .sort((a, b) => (b.roi ?? 0) - (a.roi ?? 0))
    .slice(0, 15);

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
  .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
  .kpi-card { background: #f0f4ff; border: 1px solid #c7d2fe; border-radius: 8px; padding: 14px 16px; }
  .kpi-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; font-weight: 600; }
  .kpi-value { font-size: 20px; font-weight: 800; color: #1e3a5f; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 10px; }
  thead tr { background: #547cf5; color: #fff; }
  thead th { padding: 6px 8px; text-align: left; font-size: 10px; font-weight: 700; }
  tbody tr:nth-child(even) { background: #f8faff; }
  tbody td { padding: 5px 8px; border-bottom: 1px solid #e8edf5; color: #374151; }
  .footer { margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 12px; font-size: 10px; color: #9ca3af; text-align: center; }
  .pos { color: #16a34a; font-weight: 600; }
  .neg { color: #dc2626; font-weight: 600; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <h1>TransitOps</h1>
      <div style="font-size:13px;font-weight:600;color:#374151;margin-top:2px;">Fleet Reports & Analytics</div>
    </div>
    <div class="meta">
      <div>Generated: ${dateStr}</div>
      <div>Confidential — Internal Use Only</div>
    </div>
  </div>

  <div class="filter-badge">Filters: ${filterSummary}</div>

  <h2>Key Performance Indicators</h2>
  <div class="kpi-grid">
    ${kpiCards.map((k) => `<div class="kpi-card">
      <div class="kpi-label">${k.label}</div>
      <div class="kpi-value">${k.value}</div>
    </div>`).join("")}
  </div>

  <h2>Per-Vehicle Analytics (Top ${topVehicles.length} by ROI)</h2>
  <table>
    <thead><tr>
      <th>Reg #</th><th>Name</th><th>Type</th><th>Distance</th>
      <th>Fuel (L)</th><th>Eff (km/L)</th><th>Op. Cost</th>
      <th>Revenue</th><th>ROI %</th>
    </tr></thead>
    <tbody>
      ${topVehicles.map((v) => `<tr>
        <td>${v.registrationNumber}</td>
        <td>${v.name}</td>
        <td>${v.type}</td>
        <td>${v.totalDistance} km</td>
        <td>${v.totalLiters}</td>
        <td>${v.fuelEfficiency ?? "N/A"}</td>
        <td>${fmt(v.operationalCost)}</td>
        <td>${fmt(v.totalRevenue)}</td>
        <td class="${(v.roi ?? 0) >= 0 ? "pos" : "neg"}">${v.roi !== null ? v.roi + "%" : "N/A"}</td>
      </tr>`).join("")}
    </tbody>
  </table>

  <div class="footer">
    This report was automatically generated by TransitOps Fleet Management System.
    Operational Cost = Fuel Cost + Maintenance Cost. ROI = (Revenue − Op. Cost) / Acquisition Cost × 100.
  </div>
</div>
</body>
</html>`;
}
