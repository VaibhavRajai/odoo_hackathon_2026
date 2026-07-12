"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { apiFetch } from "../../../api-client";
import {
  Fuel,
  Wrench,
  TrendingUp,
  Activity,
  Download,
  Filter,
  X,
  Loader2,
  AlertCircle,
  ChevronDown,
  BarChart2,
  FileSpreadsheet,
  FileText,
  IndianRupee,
  Gauge,
  Route,
  Trophy,
  ArrowUpDown,
} from "lucide-react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  LineElement,
  Filler,
} from "chart.js";
import { Doughnut, Bar, Line } from "react-chartjs-2";

// ─── Register Chart.js ────────────────────────────────────────────────────────
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  LineElement,
  Filler
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnalyticsSummary {
  fuelEfficiency: number;
  fleetUtilization: number;
  totalDistance: number;
  totalLiters: number;
  fuelCost: number;
  maintenanceCost: number;
  operationalCost: number;
  otherExpenses: number;
  revenue: number;
  vehicleROI: number | null;
  totalVehicles: number;
}

interface VehicleAnalytics {
  id: string;
  registrationNumber: string;
  name: string;
  type: string;
  region: string;
  status: string;
  acquisitionCost: number;
  tripCount: number;
  totalDistance: number;
  totalLiters: number;
  fuelEfficiency: number | null;
  totalFuelCost: number;
  totalMaintenanceCost: number;
  operationalCost: number;
  totalExpenses: number;
  totalRevenue: number;
  roi: number | null;
}

interface ChartDataPoint {
  label: string;
  name?: string;
  value?: number;
  roi?: number;
  fuelCost?: number;
  maintenanceCost?: number;
  total?: number;
  color?: string;
  onTrip?: number;
  totalCount?: number;
  utilization?: number;
}

interface CostTrendPoint {
  month: string;
  fuelCost: number;
  maintenanceCost: number;
  totalCost: number;
}

interface AnalyticsData {
  filters: {
    startDate: string | null;
    endDate: string | null;
    vehicleId: string | null;
    type: string | null;
    status: string | null;
    region: string | null;
  };
  summary: AnalyticsSummary;
  charts: {
    fuelEfficiencyByVehicle: ChartDataPoint[];
    operationalCostBreakdown: ChartDataPoint[];
    operationalCostByVehicle: ChartDataPoint[];
    roiByVehicle: ChartDataPoint[];
    utilizationByType: ChartDataPoint[];
    costTrend: CostTrendPoint[];
  };
  vehicles: VehicleAnalytics[];
  filterOptions: {
    vehicleTypes: string[];
    vehicleStatuses: string[];
    regions: string[];
    vehicles: { id: string; label: string; type: string }[];
  };
}

type SortKey =
  | "roi"
  | "fuelEfficiency"
  | "operationalCost"
  | "totalRevenue"
  | "registrationNumber";

// ─── Formatting Helpers ───────────────────────────────────────────────────────

const fmtINR = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);

const fmtINRCompact = (n: number) => {
  if (n >= 10_00_000) return `₹${(n / 10_00_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(0)}K`;
  return `₹${n.toFixed(0)}`;
};

const fmtNum = (n: number, decimals = 0) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: decimals }).format(n);

// ─── Chart Theme ──────────────────────────────────────────────────────────────

const CHART_COLORS = {
  primary: "#547cf5",
  secondary: "#f59e0b",
  success: "#22c55e",
  danger: "#ef4444",
  purple: "#a855f7",
  cyan: "#06b6d4",
  grid: "rgba(255,255,255,0.07)",
};

const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: { color: "#94a3b8", font: { family: "Inter, sans-serif", size: 12 } },
    },
  },
  scales: {
    x: {
      ticks: { color: "#64748b", font: { size: 11 } },
      grid: { color: "rgba(100,116,139,0.08)" },
    },
    y: {
      ticks: { color: "#64748b", font: { size: 11 } },
      grid: { color: "rgba(100,116,139,0.08)" },
    },
  },
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FinancialAnalystReportsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Filter state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState("All");
  const [selectedType, setSelectedType] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedRegion, setSelectedRegion] = useState("All");

  // Active applied filters (sent to API)
  const [activeFilters, setActiveFilters] = useState({
    startDate: "",
    endDate: "",
    vehicleId: "All",
    type: "All",
    status: "All",
    region: "All",
  });

  // Table state
  const [sortKey, setSortKey] = useState<SortKey>("roi");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // ── Fetch Analytics ────────────────────────────────────────────────────────
  const fetchAnalytics = useCallback(async (filters = activeFilters) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);
      if (filters.vehicleId && filters.vehicleId !== "All")
        params.set("vehicleId", filters.vehicleId);
      if (filters.type && filters.type !== "All") params.set("type", filters.type);
      if (filters.status && filters.status !== "All")
        params.set("status", filters.status);
      if (filters.region && filters.region !== "All")
        params.set("region", filters.region);

      const res = await apiFetch(`/api/analytics/fleet?${params.toString()}`);
      if (res.success) setData(res.data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  }, [activeFilters]);

  useEffect(() => {
    fetchAnalytics();
    // Close export dropdown on outside click
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [fetchAnalytics]);

  // ── Apply / Reset Filters ──────────────────────────────────────────────────
  const applyFilters = () => {
    const filters = {
      startDate,
      endDate,
      vehicleId: selectedVehicle,
      type: selectedType,
      status: selectedStatus,
      region: selectedRegion,
    };
    setActiveFilters(filters);
    setFilterOpen(false);
    fetchAnalytics(filters);
  };

  const resetFilters = () => {
    setStartDate("");
    setEndDate("");
    setSelectedVehicle("All");
    setSelectedType("All");
    setSelectedStatus("All");
    setSelectedRegion("All");
    const reset = {
      startDate: "",
      endDate: "",
      vehicleId: "All",
      type: "All",
      status: "All",
      region: "All",
    };
    setActiveFilters(reset);
    setFilterOpen(false);
    fetchAnalytics(reset);
  };

  const activeFilterCount = Object.values(activeFilters).filter(
    (v) => v && v !== "All"
  ).length;

  // ── Export Helpers ─────────────────────────────────────────────────────────
  const buildExportParams = () => {
    const p = new URLSearchParams();
    if (activeFilters.startDate) p.set("startDate", activeFilters.startDate);
    if (activeFilters.endDate) p.set("endDate", activeFilters.endDate);
    if (activeFilters.vehicleId && activeFilters.vehicleId !== "All")
      p.set("vehicleId", activeFilters.vehicleId);
    if (activeFilters.type && activeFilters.type !== "All")
      p.set("type", activeFilters.type);
    if (activeFilters.status && activeFilters.status !== "All")
      p.set("status", activeFilters.status);
    if (activeFilters.region && activeFilters.region !== "All")
      p.set("region", activeFilters.region);
    return p.toString();
  };

  const downloadExport = (format: "csv" | "excel" | "pdf") => {
    const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
    const params = buildExportParams();
    const ext = format === "excel" ? "excel" : format;
    window.open(`${BASE_URL}/api/analytics/fleet/export/${ext}?${params}`, "_blank");
    setExportOpen(false);
  };

  // ── Table Sorting ──────────────────────────────────────────────────────────
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sortedVehicles = data
    ? [...data.vehicles].sort((a, b) => {
        const aVal = a[sortKey] ?? (sortDir === "desc" ? -Infinity : Infinity);
        const bVal = b[sortKey] ?? (sortDir === "desc" ? -Infinity : Infinity);
        return sortDir === "asc"
          ? (aVal as number) - (bVal as number)
          : (bVal as number) - (aVal as number);
      })
    : [];

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
            Reports &amp; Analytics
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm">
            Fleet performance, cost analysis, fuel efficiency, and ROI — all from live data.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Filter Button */}
          <button
            onClick={() => setFilterOpen((o) => !o)}
            className={`relative flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
              activeFilterCount > 0
                ? "border-blue-500/50 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/40 text-zinc-700 dark:text-zinc-300 hover:border-blue-500/30"
            }`}
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Export Dropdown */}
          <div ref={exportRef} className="relative">
            <button
              onClick={() => setExportOpen((o) => !o)}
              className="flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/40 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:border-blue-500/30 transition-all"
            >
              <Download className="h-4 w-4" />
              Export
              <ChevronDown className={`h-3 w-3 transition-transform ${exportOpen ? "rotate-180" : ""}`} />
            </button>
            {exportOpen && (
              <div className="absolute right-0 top-full mt-2 z-50 w-44 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl overflow-hidden">
                <button
                  onClick={() => downloadExport("csv")}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <BarChart2 className="h-4 w-4 text-emerald-500" />
                  Export CSV
                </button>
                <button
                  onClick={() => downloadExport("excel")}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <FileSpreadsheet className="h-4 w-4 text-blue-500" />
                  Export Excel
                </button>
                <button
                  onClick={() => downloadExport("pdf")}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <FileText className="h-4 w-4 text-red-500" />
                  Export PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Filter Panel ──────────────────────────────────────────────────── */}
      {filterOpen && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-5 backdrop-blur-sm shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Filter Analytics</h3>
            <button
              onClick={() => setFilterOpen(false)}
              className="rounded-lg p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                Vehicle Type
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white"
              >
                <option value="All">All Types</option>
                {data?.filterOptions.vehicleTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white"
              >
                <option value="All">All Statuses</option>
                {data?.filterOptions.vehicleStatuses.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                Region
              </label>
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white"
              >
                <option value="All">All Regions</option>
                {data?.filterOptions.regions.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                Specific Vehicle
              </label>
              <select
                value={selectedVehicle}
                onChange={(e) => setSelectedVehicle(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white"
              >
                <option value="All">All Vehicles</option>
                {data?.filterOptions.vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={resetFilters}
              className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Reset
            </button>
            <button
              onClick={applyFilters}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* ── Loading / Error states ─────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="ml-3 text-zinc-500 dark:text-zinc-400">Loading analytics…</span>
        </div>
      )}

      {error && !loading && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-900/10 p-4">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
          <span className="text-sm text-red-700 dark:text-red-400">{error}</span>
        </div>
      )}

      {data && !loading && (
        <>
          {/* ── KPI Cards ───────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              icon={<Fuel className="h-5 w-5" />}
              label="Avg Fuel Efficiency"
              value={`${data.summary.fuelEfficiency} km/L`}
              sub={`${fmtNum(data.summary.totalLiters, 0)} L consumed`}
              color="text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20"
            />
            <KPICard
              icon={<Activity className="h-5 w-5" />}
              label="Fleet Utilization"
              value={`${data.summary.fleetUtilization}%`}
              sub={`${data.summary.totalVehicles} vehicles in scope`}
              color="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
            />
            <KPICard
              icon={<IndianRupee className="h-5 w-5" />}
              label="Operational Cost"
              value={fmtINRCompact(data.summary.operationalCost)}
              sub={`Fuel + Maintenance`}
              color="text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20"
            />
            <KPICard
              icon={<TrendingUp className="h-5 w-5" />}
              label="Fleet ROI"
              value={
                data.summary.vehicleROI !== null
                  ? `${data.summary.vehicleROI}%`
                  : "N/A"
              }
              sub={`Revenue: ${fmtINRCompact(data.summary.revenue)}`}
              color={
                (data.summary.vehicleROI ?? 0) >= 0
                  ? "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20"
                  : "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20"
              }
            />
          </div>

          {/* ── Supporting metrics row ──────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total Distance", value: `${fmtNum(data.summary.totalDistance)} km`, icon: Route },
              { label: "Fuel Cost", value: fmtINRCompact(data.summary.fuelCost), icon: Fuel },
              { label: "Maint. Cost", value: fmtINRCompact(data.summary.maintenanceCost), icon: Wrench },
              { label: "Other Expenses", value: fmtINRCompact(data.summary.otherExpenses), icon: Gauge },
            ].map((m) => (
              <div
                key={m.label}
                className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 p-3"
              >
                <m.icon className="h-4 w-4 text-zinc-400 shrink-0" />
                <div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">{m.label}</div>
                  <div className="text-sm font-bold text-zinc-900 dark:text-white">{m.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Charts Row 1: Fuel Efficiency + Cost Breakdown ─────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            {/* Fuel Efficiency by Vehicle — horizontal bar */}
            <div className="lg:col-span-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 p-5">
              <h2 className="text-base font-bold text-zinc-900 dark:text-white mb-1">
                Fuel Efficiency by Vehicle
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
                km per litre — top 15 vehicles. Formula: Distance ÷ Fuel Consumed
              </p>
              <div style={{ height: Math.max(200, data.charts.fuelEfficiencyByVehicle.length * 32) }}>
                {data.charts.fuelEfficiencyByVehicle.length > 0 ? (
                  <Bar
                    data={{
                      labels: data.charts.fuelEfficiencyByVehicle.map((d) => d.label),
                      datasets: [
                        {
                          label: "km/L",
                          data: data.charts.fuelEfficiencyByVehicle.map((d) => d.value ?? 0),
                          backgroundColor: data.charts.fuelEfficiencyByVehicle.map(
                            (_, i) =>
                              `hsl(${220 + i * 6}, 75%, ${55 + (i % 3) * 5}%)`
                          ),
                          borderRadius: 4,
                          borderSkipped: false,
                        },
                      ],
                    }}
                    options={{
                      ...chartDefaults,
                      indexAxis: "y" as const,
                      plugins: {
                        ...chartDefaults.plugins,
                        legend: { display: false },
                        tooltip: {
                          callbacks: {
                            label: (ctx) => ` ${ctx.parsed.x} km/L`,
                          },
                        },
                      },
                      scales: {
                        x: {
                          ...chartDefaults.scales.x,
                          title: { display: true, text: "km/L", color: "#64748b", font: { size: 11 } },
                        },
                        y: { ...chartDefaults.scales.y, ticks: { color: "#94a3b8", font: { size: 10 } } },
                      },
                    }}
                  />
                ) : (
                  <EmptyChart message="No fuel data in selected range" />
                )}
              </div>
            </div>

            {/* Operational Cost Breakdown — doughnut */}
            <div className="lg:col-span-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 p-5">
              <h2 className="text-base font-bold text-zinc-900 dark:text-white mb-1">
                Cost Breakdown
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
                Operational Cost = Fuel + Maintenance
              </p>
              <div style={{ height: 220 }}>
                <Doughnut
                  data={{
                    labels: data.charts.operationalCostBreakdown.map((d) => d.label),
                    datasets: [
                      {
                        data: data.charts.operationalCostBreakdown.map((d) => d.value ?? 0),
                        backgroundColor: [CHART_COLORS.primary, CHART_COLORS.secondary],
                        borderWidth: 0,
                        hoverOffset: 4,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: "bottom",
                        labels: { color: "#94a3b8", font: { size: 12 }, padding: 16 },
                      },
                      tooltip: {
                        callbacks: {
                          label: (ctx) => ` ${fmtINR(ctx.parsed as number)}`,
                        },
                      },
                    },
                    cutout: "70%",
                  }}
                />
              </div>
              {/* Cost totals below doughnut */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLORS.primary }} />
                    <span className="text-zinc-500 dark:text-zinc-400">Fuel Cost</span>
                  </div>
                  <span className="font-semibold text-zinc-900 dark:text-white">
                    {fmtINR(data.summary.fuelCost)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLORS.secondary }} />
                    <span className="text-zinc-500 dark:text-zinc-400">Maintenance</span>
                  </div>
                  <span className="font-semibold text-zinc-900 dark:text-white">
                    {fmtINR(data.summary.maintenanceCost)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Charts Row 2: Operational Cost by Vehicle + ROI ────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Op Cost by Vehicle */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 p-5">
              <h2 className="text-base font-bold text-zinc-900 dark:text-white mb-1">
                Operational Cost by Vehicle
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">Top 10 costliest vehicles</p>
              <div style={{ height: 280 }}>
                {data.charts.operationalCostByVehicle.length > 0 ? (
                  <Bar
                    data={{
                      labels: data.charts.operationalCostByVehicle.map((d) => d.label),
                      datasets: [
                        {
                          label: "Fuel Cost",
                          data: data.charts.operationalCostByVehicle.map((d) => d.fuelCost ?? 0),
                          backgroundColor: CHART_COLORS.primary,
                          borderRadius: 3,
                          stack: "cost",
                        },
                        {
                          label: "Maintenance",
                          data: data.charts.operationalCostByVehicle.map((d) => d.maintenanceCost ?? 0),
                          backgroundColor: CHART_COLORS.secondary,
                          borderRadius: 3,
                          stack: "cost",
                        },
                      ],
                    }}
                    options={{
                      ...chartDefaults,
                      plugins: {
                        ...chartDefaults.plugins,
                        tooltip: {
                          callbacks: {
                            label: (ctx) => ` ${ctx.dataset.label}: ${fmtINR(ctx.parsed.y ?? 0)}`,
                          },
                        },
                      },
                      scales: {
                        x: { ...chartDefaults.scales.x, stacked: true },
                        y: {
                          ...chartDefaults.scales.y,
                          stacked: true,
                          ticks: {
                            color: "#64748b",
                            callback: (v) => fmtINRCompact(v as number),
                          },
                        },
                      },
                    }}
                  />
                ) : (
                  <EmptyChart message="No cost data in selected range" />
                )}
              </div>
            </div>

            {/* ROI by Vehicle */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 p-5">
              <h2 className="text-base font-bold text-zinc-900 dark:text-white mb-1">
                Vehicle ROI
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
                ROI = (Revenue − Operational Cost) ÷ Acquisition Cost × 100
              </p>
              <div style={{ height: 280 }}>
                {data.charts.roiByVehicle.length > 0 ? (
                  <Bar
                    data={{
                      labels: data.charts.roiByVehicle.map((d) => d.label),
                      datasets: [
                        {
                          label: "ROI (%)",
                          data: data.charts.roiByVehicle.map((d) => d.roi ?? 0),
                          backgroundColor: data.charts.roiByVehicle.map((d) =>
                            (d.roi ?? 0) >= 0 ? CHART_COLORS.success : CHART_COLORS.danger
                          ),
                          borderRadius: 4,
                          borderSkipped: false,
                        },
                      ],
                    }}
                    options={{
                      ...chartDefaults,
                      plugins: {
                        ...chartDefaults.plugins,
                        legend: { display: false },
                        tooltip: {
                          callbacks: {
                            label: (ctx) => ` ROI: ${ctx.parsed.y}%`,
                          },
                        },
                      },
                      scales: {
                        x: { ...chartDefaults.scales.x },
                        y: {
                          ...chartDefaults.scales.y,
                          ticks: {
                            color: "#64748b",
                            callback: (v) => `${v}%`,
                          },
                        },
                      },
                    }}
                  />
                ) : (
                  <EmptyChart message="No ROI data in selected range" />
                )}
              </div>
            </div>
          </div>

          {/* ── Cost Trend Over Time ───────────────────────────────────────── */}
          {data.charts.costTrend.length > 0 && (
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 p-5">
              <h2 className="text-base font-bold text-zinc-900 dark:text-white mb-1">
                Cost Trend Over Time
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
                Monthly fuel and maintenance cost breakdown
              </p>
              <div style={{ height: 240 }}>
                <Line
                  data={{
                    labels: data.charts.costTrend.map((d) => d.month),
                    datasets: [
                      {
                        label: "Fuel Cost",
                        data: data.charts.costTrend.map((d) => d.fuelCost),
                        borderColor: CHART_COLORS.primary,
                        backgroundColor: `${CHART_COLORS.primary}22`,
                        tension: 0.4,
                        fill: true,
                        pointRadius: 4,
                      },
                      {
                        label: "Maintenance",
                        data: data.charts.costTrend.map((d) => d.maintenanceCost),
                        borderColor: CHART_COLORS.secondary,
                        backgroundColor: `${CHART_COLORS.secondary}22`,
                        tension: 0.4,
                        fill: true,
                        pointRadius: 4,
                      },
                    ],
                  }}
                  options={{
                    ...chartDefaults,
                    plugins: {
                      ...chartDefaults.plugins,
                      tooltip: {
                        callbacks: {
                          label: (ctx) => ` ${ctx.dataset.label}: ${fmtINR(ctx.parsed.y ?? 0)}`,
                        },
                      },
                    },
                    scales: {
                      x: { ...chartDefaults.scales.x },
                      y: {
                        ...chartDefaults.scales.y,
                        ticks: {
                          color: "#64748b",
                          callback: (v) => fmtINRCompact(v as number),
                        },
                      },
                    },
                  }}
                />
              </div>
            </div>
          )}

          {/* ── Per-Vehicle Analytics Table ─────────────────────────────────── */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                  Per-Vehicle Analytics
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {data.vehicles.length} vehicles · Click column headers to sort
                </p>
              </div>
              <Trophy className="h-5 w-5 text-amber-400" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800">
                    {[
                      { key: "registrationNumber" as SortKey, label: "Vehicle" },
                      { key: null, label: "Type / Region" },
                      { key: null, label: "Status" },
                      { key: null, label: "Trips" },
                      { key: null, label: "Distance" },
                      { key: null, label: "Fuel (L)" },
                      { key: "fuelEfficiency" as SortKey, label: "Efficiency" },
                      { key: "operationalCost" as SortKey, label: "Op. Cost" },
                      { key: "totalRevenue" as SortKey, label: "Revenue" },
                      { key: "roi" as SortKey, label: "ROI %" },
                    ].map((col) => (
                      <th
                        key={col.label}
                        onClick={() => col.key && toggleSort(col.key)}
                        className={`py-3 px-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 whitespace-nowrap ${
                          col.key ? "cursor-pointer select-none hover:text-zinc-900 dark:hover:text-white" : ""
                        } ${col.key === sortKey ? "text-blue-600 dark:text-blue-400" : ""}`}
                      >
                        <div className="flex items-center gap-1">
                          {col.label}
                          {col.key && <ArrowUpDown className="h-3 w-3" />}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {sortedVehicles.map((v) => (
                    <tr
                      key={v.id}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors"
                    >
                      <td className="py-3 px-3">
                        <div className="font-semibold text-zinc-900 dark:text-white text-xs">
                          {v.registrationNumber}
                        </div>
                        <div className="text-[11px] text-zinc-400 truncate max-w-[120px]">{v.name}</div>
                      </td>
                      <td className="py-3 px-3 text-xs text-zinc-500 dark:text-zinc-400">
                        <div>{v.type}</div>
                        <div className="text-zinc-400">{v.region}</div>
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status={v.status} />
                      </td>
                      <td className="py-3 px-3 text-xs text-zinc-700 dark:text-zinc-300 text-right">
                        {v.tripCount}
                      </td>
                      <td className="py-3 px-3 text-xs text-zinc-700 dark:text-zinc-300 text-right">
                        {fmtNum(v.totalDistance)} km
                      </td>
                      <td className="py-3 px-3 text-xs text-zinc-700 dark:text-zinc-300 text-right">
                        {fmtNum(v.totalLiters, 1)}
                      </td>
                      <td className="py-3 px-3 text-xs font-medium text-right">
                        {v.fuelEfficiency !== null ? (
                          <span className="text-blue-600 dark:text-blue-400">
                            {v.fuelEfficiency} km/L
                          </span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-xs text-right text-zinc-700 dark:text-zinc-300">
                        {fmtINRCompact(v.operationalCost)}
                      </td>
                      <td className="py-3 px-3 text-xs text-right text-emerald-600 dark:text-emerald-400 font-medium">
                        {v.totalRevenue > 0 ? fmtINRCompact(v.totalRevenue) : "—"}
                      </td>
                      <td className="py-3 px-3 text-xs text-right font-bold">
                        {v.roi !== null ? (
                          <span
                            className={
                              v.roi >= 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-red-600 dark:text-red-400"
                            }
                          >
                            {v.roi}%
                          </span>
                        ) : (
                          <span className="text-zinc-400">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {data.vehicles.length === 0 && (
                <div className="py-16 text-center text-zinc-400 dark:text-zinc-600">
                  No vehicles match the selected filters.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function KPICard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-5 backdrop-blur-sm shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{label}</span>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${color}`}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-extrabold text-zinc-900 dark:text-white">{value}</div>
      <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">{sub}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    AVAILABLE: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
    ON_TRIP: "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400",
    IN_SHOP: "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400",
    RETIRED: "bg-zinc-500/10 border-zinc-500/20 text-zinc-500 dark:text-zinc-400",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
        styles[status] ?? styles.RETIRED
      }`}
    >
      {status}
    </span>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center text-sm text-zinc-400 dark:text-zinc-600">
      {message}
    </div>
  );
}
