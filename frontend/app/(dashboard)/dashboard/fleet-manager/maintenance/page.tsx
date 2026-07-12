"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { apiFetch } from "../../../../api-client";
import {
  Wrench,
  Plus,
  Search,
  X,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Calendar,
  DollarSign,
  Edit,
  Sparkles,
  Activity,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  MapPin,
  Filter,
  Download,
  FileText,
  FileSpreadsheet,
  ChevronDown,
  IndianRupee,
  ShieldCheck,
  Ban,
  Truck,
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
} from "chart.js";
import { Doughnut, Bar } from "react-chartjs-2";

// ─── Register Chart.js components ────────────────────────────────────────────
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardFilters {
  type: string | null;
  status: string | null;
  region: string | null;
}

interface DashboardKPIs {
  totalVehicles: number;
  activeVehicles: number;
  availableVehicles: number;
  vehiclesOnTrip: number;
  vehiclesInMaintenance: number;
  retiredVehicles: number;
  fleetUtilization: number;
  activeMaintenance: number;
  closedMaintenance: number;
  totalMaintenance: number;
  totalMaintenanceCost: number;
}

interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

interface UtilizationDataPoint {
  label: string;
  onTrip: number;
  total: number;
  utilization: number;
}

interface MaintenanceCostDataPoint {
  label: string;
  totalCost: number;
  count: number;
}

interface DashboardCharts {
  vehicleStatusDistribution: ChartDataPoint[];
  vehiclesByType: ChartDataPoint[];
  fleetUtilizationByType: UtilizationDataPoint[];
  regionalFleetDistribution: ChartDataPoint[];
  maintenanceStatusOverview: ChartDataPoint[];
  maintenanceCostByType: MaintenanceCostDataPoint[];
}

interface FilterOptions {
  vehicleTypes: string[];
  vehicleStatuses: string[];
  regions: string[];
}

interface DashboardData {
  filters: DashboardFilters;
  kpis: DashboardKPIs;
  charts: DashboardCharts;
  filterOptions: FilterOptions;
}

interface VehicleRef {
  id: string;
  registrationNumber: string;
  name: string;
  type: string;
  status: string;
}

interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  vehicle: VehicleRef;
  type: string;
  description: string | null;
  cost: number;
  startDate: string;
  completedDate: string | null;
  status: "ACTIVE" | "CLOSED";
  createdAt: string;
}

interface Vehicle {
  id: string;
  registrationNumber: string;
  name: string;
  type: string;
  status: string;
}

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAINTENANCE_TYPES = [
  "Oil Change",
  "Brake Repair",
  "Tyre Replacement",
  "Engine Overhaul",
  "Transmission Service",
  "Electrical Repair",
  "AC Service",
  "Suspension Repair",
  "Wheel Alignment",
  "Scheduled Inspection",
  "Other",
];

const MAINTENANCE_STATUSES = ["ACTIVE", "CLOSED"];

// ─── Dashboard Helper Components & Constants ─────────────────────────────────

const CHART_COLORS = [
  "#547cf5",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
  "#ec4899",
  "#10b981",
  "#6366f1",
];

const chartDefaults = {
  plugins: {
    legend: {
      labels: {
        color: "rgb(161, 161, 170)",
        font: { size: 11 },
        boxWidth: 12,
        padding: 12,
      },
    },
    tooltip: {
      backgroundColor: "rgba(17,17,27,0.92)",
      titleColor: "#fff",
      bodyColor: "#e4e4e7",
      borderColor: "rgba(84,124,245,0.3)",
      borderWidth: 1,
      cornerRadius: 8,
      padding: 10,
    },
  },
  responsive: true,
  maintainAspectRatio: false,
};

const axisColor = "rgba(161,161,170,0.6)";

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-zinc-200 dark:bg-zinc-800 rounded-xl ${className ?? ""}`}
    />
  );
}

interface KPICardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color: string;
  loading: boolean;
}

function KPICard({ label, value, sub, icon: Icon, color, loading }: KPICardProps) {
  if (loading) {
    return <Skeleton className="h-32" />;
  }
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-5 backdrop-blur-sm shadow-sm transition-all duration-200 hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700">
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider leading-tight">
          {label}
        </span>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg border shrink-0 ${color}`}>
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>
      <div className="mt-3">
        <div className="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
          {value}
        </div>
        {sub && (
          <div className="text-xs text-zinc-500 dark:text-zinc-500 mt-1 font-medium">
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

function ChartCard({
  title,
  children,
  loading,
  empty,
}: {
  title: string;
  children: React.ReactNode;
  loading?: boolean;
  empty?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-6 backdrop-blur-sm shadow-sm">
      <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-4 uppercase tracking-wider">
        {title}
      </h3>
      {loading ? (
        <Skeleton className="h-52" />
      ) : empty ? (
        <div className="flex flex-col items-center justify-center h-48 text-zinc-400 dark:text-zinc-650 gap-2">
          <Wrench className="h-8 w-8 text-zinc-400 dark:text-zinc-500" />
          <span className="text-sm">No data for selected filters</span>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

interface FilterSelectProps {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  icon?: React.ElementType;
}

function FilterSelect({ label, value, options, onChange, icon: Icon }: FilterSelectProps) {
  return (
    <div className="relative flex-1 min-w-[140px]">
      {Icon && (
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500 pointer-events-none" />
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full appearance-none rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 text-zinc-700 dark:text-zinc-300 text-xs font-medium py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60 transition-all cursor-pointer ${Icon ? "pl-8" : "pl-3"}`}
      >
        <option value="All">{label}: All</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500 pointer-events-none" />
    </div>
  );
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export default function MaintenancePage() {
  // --- Dashboard Overview States ---
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);

  const [dashTypeFilter, setDashTypeFilter] = useState("All");
  const [dashStatusFilter, setDashStatusFilter] = useState("All");
  const [dashRegionFilter, setDashRegionFilter] = useState("All");

  const dashDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // List state
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Available vehicles for the create/edit dropdown
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Stats summary counts
  const [stats, setStats] = useState({
    totalRecords: 0,
    activeRepairs: 0,
    totalExpenses: 0,
  });

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  // Form fields
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [maintenanceType, setMaintenanceType] = useState("Oil Change");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [recordStatus, setRecordStatus] = useState<"ACTIVE" | "CLOSED">("ACTIVE");

  // Close ticket loading state
  const [closingId, setClosingId] = useState<string | null>(null);

  // ─── Fetch Dashboard Data ───────────────────────────────────────────────────

  const fetchDashboardData = useCallback(async (params: {
    type: string;
    status: string;
    region: string;
  }) => {
    setDashboardLoading(true);
    setDashboardError("");
    try {
      const query = new URLSearchParams();
      if (params.type !== "All") query.set("type", params.type);
      if (params.status !== "All") query.set("status", params.status);
      if (params.region !== "All") query.set("region", params.region);
      const qs = query.toString();
      const res = await apiFetch(`/api/dashboard/fleet${qs ? `?${qs}` : ""}`);
      if (res.success) {
        setDashboardData(res.data);
      }
    } catch (e: unknown) {
      setDashboardError(e instanceof Error ? e.message : "Failed to load dashboard statistics.");
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  const handleExport = async (format: "pdf" | "excel") => {
    setExporting(format);
    try {
      const query = new URLSearchParams();
      if (dashTypeFilter !== "All") query.set("type", dashTypeFilter);
      if (dashStatusFilter !== "All") query.set("status", dashStatusFilter);
      if (dashRegionFilter !== "All") query.set("region", dashRegionFilter);
      const qs = query.toString();
      const endpoint =
        format === "pdf"
          ? `/api/dashboard/fleet/export/pdf${qs ? `?${qs}` : ""}`
          : `/api/dashboard/fleet/export/excel${qs ? `?${qs}` : ""}`;

      const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download =
        format === "pdf"
          ? `fleet-dashboard-${dateStr}.pdf`
          : `fleet-dashboard-${dateStr}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      console.error("Export error:", e);
      alert(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setExporting(null);
    }
  };

  useEffect(() => {
    fetchDashboardData({ type: "All", status: "All", region: "All" });
  }, [fetchDashboardData]);

  useEffect(() => {
    if (dashDebounceRef.current) clearTimeout(dashDebounceRef.current);
    dashDebounceRef.current = setTimeout(() => {
      fetchDashboardData({ type: dashTypeFilter, status: dashStatusFilter, region: dashRegionFilter });
    }, 300);
    return () => {
      if (dashDebounceRef.current) clearTimeout(dashDebounceRef.current);
    };
  }, [dashTypeFilter, dashStatusFilter, dashRegionFilter, fetchDashboardData]);

  // ─── Fetch Records ──────────────────────────────────────────────────────────

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "All") {
        params.append("status", statusFilter);
      }
      if (search.trim()) {
        params.append("search", search.trim());
      }
      params.append("page", currentPage.toString());
      params.append("limit", pageSize.toString());

      const res = await apiFetch(`/api/maintenance?${params.toString()}`);
      if (res.success) {
        setRecords(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      } else {
        setError("Failed to retrieve maintenance records.");
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while fetching records."
      );
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, currentPage, pageSize]);

  // Fetch Stats Summary (unfiltered)
  const fetchStatsSummary = useCallback(async () => {
    try {
      const res = await apiFetch("/api/maintenance?limit=1000");
      if (res.success && res.data) {
        const list: MaintenanceRecord[] = res.data;
        const totalCost = list.reduce((sum, item) => sum + item.cost, 0);
        setStats({
          totalRecords: list.length,
          activeRepairs: list.filter(r => r.status === "ACTIVE").length,
          totalExpenses: totalCost,
        });
      }
    } catch {
      // Ignored
    }
  }, []);

  // Debounced trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRecords();
    }, 400);
    return () => clearTimeout(timer);
  }, [fetchRecords]);

  // Refresh stats whenever list updates
  useEffect(() => {
    fetchStatsSummary();
  }, [records, fetchStatsSummary]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, search]);

  // ─── Fetch Vehicles (for create/edit dropdown) ────────────────────────────

  const fetchVehicles = useCallback(async () => {
    setVehiclesLoading(true);
    try {
      const res = await apiFetch("/api/vehicles?limit=1000");
      if (res.success) {
        setVehicles(res.data || []);
      }
    } catch {
      // Non-fatal
    } finally {
      setVehiclesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  // ─── Form Handlers ──────────────────────────────────────────────────────────

  const resetForm = () => {
    setSelectedVehicleId("");
    setMaintenanceType("Oil Change");
    setDescription("");
    setCost("");
    setStartDate(new Date().toISOString().slice(0, 10));
    setRecordStatus("ACTIVE");
    setEditingRecord(null);
    setModalError("");
  };

  const handleOpenCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (record: MaintenanceRecord) => {
    setEditingRecord(record);
    setSelectedVehicleId(record.vehicleId);
    setMaintenanceType(record.type);
    setDescription(record.description || "");
    setCost(record.cost.toString());
    setStartDate(new Date(record.startDate).toISOString().slice(0, 10));
    setRecordStatus(record.status);
    setModalError("");
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (!submitting) {
      setIsModalOpen(false);
      setEditingRecord(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");

    if (!selectedVehicleId) {
      setModalError("Please select a vehicle.");
      return;
    }
    if (!maintenanceType.trim()) {
      setModalError("Maintenance type is required.");
      return;
    }
    if (!startDate) {
      setModalError("Start date is required.");
      return;
    }

    const parsedCost = cost === "" ? 0 : parseFloat(cost);
    if (isNaN(parsedCost) || parsedCost < 0) {
      setModalError("Cost must be a number greater than or equal to 0.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        vehicleId: selectedVehicleId,
        type: maintenanceType.trim(),
        description: description.trim() || undefined,
        cost: parsedCost,
        startDate,
        ...(editingRecord ? { status: recordStatus } : {}),
      };

      let res;
      if (editingRecord) {
        res = await apiFetch(`/api/maintenance/${editingRecord.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        res = await apiFetch("/api/maintenance", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      if (res.success) {
        setIsModalOpen(false);
        resetForm();
        fetchRecords();
        fetchVehicles(); // Refresh vehicle list status
      } else {
        setModalError(res.message || "Operation failed.");
      }
    } catch (err: unknown) {
      setModalError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Close Record Action ────────────────────────────────────────────────────

  const handleCloseTicket = async (id: string) => {
    setClosingId(id);
    try {
      const res = await apiFetch(`/api/maintenance/${id}/close`, {
        method: "PATCH",
      });
      if (res.success) {
        fetchRecords();
        fetchVehicles();
      } else {
        alert(res.message || "Failed to close maintenance record.");
      }
    } catch (err: unknown) {
      alert(
        err instanceof Error ? err.message : "Failed to close maintenance record."
      );
    } finally {
      setClosingId(null);
    }
  };

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20";
      case "CLOSED":
        return "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      default:
        return "text-zinc-650 dark:text-zinc-450 bg-zinc-500/10 border-zinc-500/20";
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Eligible vehicles: not RETIRED and not already IN_SHOP/ON_TRIP
  const eligibleVehicles = vehicles.filter(
    (v) => v.status !== "RETIRED" && v.status !== "ON_TRIP" && v.status !== "IN_SHOP"
  );

  // For Edit Mode, we need to append the currently assigned vehicle of the edited record
  // so that it is present in the select options
  const dropdownVehicles = editingRecord
    ? [
        {
          id: editingRecord.vehicleId,
          registrationNumber: editingRecord.vehicle.registrationNumber,
          name: editingRecord.vehicle.name,
          type: editingRecord.vehicle.type,
          status: editingRecord.vehicle.status,
        },
        ...eligibleVehicles.filter((v) => v.id !== editingRecord.vehicleId),
      ]
    : eligibleVehicles;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">

      {/* Header Block */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">Maintenance Management</h1>
          <p className="text-zinc-555 dark:text-zinc-400 mt-2">Log workshop repairs, schedule maintenance checklists, and track lifecycle operational costs.</p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 text-sm font-semibold shadow-[0_0_15px_rgba(37,99,235,0.2)] transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer self-start sm:self-center"
        >
          <Plus className="h-4 w-4" /> Create Record
        </button>
      </div>

      {/* ─── Embedded Analytics Dashboard Section ─────────────────────────── */}
      <div className="rounded-2xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/10 dark:bg-blue-950/5 p-6 backdrop-blur-sm shadow-sm transition-all duration-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800 gap-4">
          <div>
            <h2 className="text-xl font-black text-zinc-900 dark:text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-500 animate-pulse" />
              Fleet Operations & Cost Analytics Dashboard
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Real-time fleet capacity, regional distribution, and maintenance expense ledger.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
            <button
              onClick={() => handleExport("pdf")}
              disabled={!!exporting || dashboardLoading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 px-3.5 py-2 text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer animate-fade-in"
            >
              {exporting === "pdf" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileText className="h-3.5 w-3.5 text-red-500" />
              )}
              Export PDF
            </button>
            <button
              onClick={() => handleExport("excel")}
              disabled={!!exporting || dashboardLoading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 px-3.5 py-2 text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer animate-fade-in"
            >
              {exporting === "excel" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
              )}
              Export Excel
            </button>

          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider shrink-0 mr-1">
            <Filter className="h-3.5 w-3.5" />
            Dashboard Filters
          </div>
          <FilterSelect
            label="Type"
            value={dashTypeFilter}
            options={dashboardData?.filterOptions?.vehicleTypes ?? []}
            onChange={setDashTypeFilter}
            icon={Truck}
          />
          <FilterSelect
            label="Status"
            value={dashStatusFilter}
            options={dashboardData?.filterOptions?.vehicleStatuses ?? []}
            onChange={setDashStatusFilter}
            icon={Activity}
          />
          <FilterSelect
            label="Region"
            value={dashRegionFilter}
            options={dashboardData?.filterOptions?.regions ?? []}
            onChange={setDashRegionFilter}
            icon={MapPin}
          />
          {(dashTypeFilter !== "All" || dashStatusFilter !== "All" || dashRegionFilter !== "All") && (
            <button
              onClick={() => {
                setDashTypeFilter("All");
                setDashStatusFilter("All");
                setDashRegionFilter("All");
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 px-3 py-2.5 text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all cursor-pointer shrink-0"
            >
              <X className="h-3.5 w-3.5" />
              Reset
            </button>
          )}
          {dashboardLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-zinc-400 dark:text-zinc-650 ml-auto shrink-0" />
          )}
        </div>

        {/* Dashboard Error */}
        {dashboardError && (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 px-4 py-3 mt-4 text-red-600 dark:text-red-400 text-xs">
            <AlertCircle className="h-4.5 w-4.5 shrink-0" />
            {dashboardError}
          </div>
        )}

        {/* Dashboard KPIs Grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 mt-6">
          <KPICard
            label="Total Vehicles"
            value={dashboardLoading ? "—" : (dashboardData?.kpis?.totalVehicles ?? 0)}
            sub={dashboardLoading ? "" : `${dashboardData?.kpis?.activeVehicles ?? 0} active`}
            icon={Truck}
            color="text-blue-600 dark:text-blue-500 bg-blue-500/10 border-blue-500/20"
            loading={dashboardLoading}
          />
          <KPICard
            label="Available"
            value={dashboardLoading ? "—" : (dashboardData?.kpis?.availableVehicles ?? 0)}
            sub="Ready for dispatch"
            icon={ShieldCheck}
            color="text-emerald-600 dark:text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
            loading={dashboardLoading}
          />
          <KPICard
            label="On Trip"
            value={dashboardLoading ? "—" : (dashboardData?.kpis?.vehiclesOnTrip ?? 0)}
            sub="Currently deployed"
            icon={Activity}
            color="text-blue-600 dark:text-blue-500 bg-blue-500/10 border-blue-500/20"
            loading={dashboardLoading}
          />
          <KPICard
            label="In Maintenance"
            value={dashboardLoading ? "—" : (dashboardData?.kpis?.vehiclesInMaintenance ?? 0)}
            sub="IN_SHOP status"
            icon={Wrench}
            color="text-amber-600 dark:text-amber-500 bg-amber-500/10 border-amber-500/20"
            loading={dashboardLoading}
          />
          <KPICard
            label="Retired"
            value={dashboardLoading ? "—" : (dashboardData?.kpis?.retiredVehicles ?? 0)}
            sub="Out of service"
            icon={Ban}
            color="text-zinc-500 dark:text-zinc-500 bg-zinc-500/10 border-zinc-500/20"
            loading={dashboardLoading}
          />
          <KPICard
            label="Fleet Utilization"
            value={dashboardLoading ? "—" : `${dashboardData?.kpis?.fleetUtilization ?? 0}%`}
            sub="On Trip / Active vehicles"
            icon={TrendingUp}
            color="text-purple-600 dark:text-purple-500 bg-purple-500/10 border-purple-500/20"
            loading={dashboardLoading}
          />
          <KPICard
            label="Active Maintenance"
            value={dashboardLoading ? "—" : (dashboardData?.kpis?.activeMaintenance ?? 0)}
            sub="Open work orders"
            icon={Wrench}
            color="text-red-600 dark:text-red-500 bg-red-500/10 border-red-500/20"
            loading={dashboardLoading}
          />
          <KPICard
            label="Maintenance Spend"
            value={dashboardLoading ? "—" : formatCurrency(dashboardData?.kpis?.totalMaintenanceCost ?? 0)}
            sub="Closed records total"
            icon={IndianRupee}
            color="text-teal-600 dark:text-teal-500 bg-teal-500/10 border-teal-500/20"
            loading={dashboardLoading}
          />
        </div>

        {/* Dashboard Charts Rows */}
        {dashboardData && !dashboardLoading && (
          <div className="space-y-6 mt-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <ChartCard
                title="Vehicle Status Distribution"
                empty={!dashboardData.charts?.vehicleStatusDistribution?.some((r) => r.value > 0)}
              >
                <div className="h-56 flex items-center justify-center">
                  <Doughnut
                    data={{
                      labels: dashboardData.charts.vehicleStatusDistribution.map((r) => r.label),
                      datasets: [
                        {
                          data: dashboardData.charts.vehicleStatusDistribution.map((r) => r.value),
                          backgroundColor: dashboardData.charts.vehicleStatusDistribution.map((r) => r.color + "cc"),
                          borderColor: dashboardData.charts.vehicleStatusDistribution.map((r) => r.color),
                          borderWidth: 2,
                        },
                      ],
                    }}
                    options={{
                      ...chartDefaults,
                      cutout: "68%",
                      plugins: {
                        ...chartDefaults.plugins,
                        legend: { position: "right" as const },
                      },
                    }}
                  />
                </div>
              </ChartCard>

              <ChartCard
                title="Vehicles by Type"
                empty={!dashboardData.charts?.vehiclesByType?.length}
              >
                <div className="h-56">
                  <Bar
                    data={{
                      labels: dashboardData.charts.vehiclesByType.map((r) => r.label),
                      datasets: [
                        {
                          label: "Vehicles",
                          data: dashboardData.charts.vehiclesByType.map((r) => r.value),
                          backgroundColor: CHART_COLORS.map((c) => c + "cc"),
                          borderColor: CHART_COLORS,
                          borderWidth: 1.5,
                          borderRadius: 6,
                        },
                      ],
                    }}
                    options={{
                      ...chartDefaults,
                      plugins: { ...chartDefaults.plugins, legend: { display: false } },
                      scales: {
                        x: { ticks: { color: axisColor }, grid: { display: false } },
                        y: { ticks: { color: axisColor, stepSize: 1 }, grid: { color: "rgba(161,161,170,0.12)" }, beginAtZero: true },
                      },
                    }}
                  />
                </div>
              </ChartCard>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <ChartCard
                title="Fleet Utilization by Type (%)"
                empty={!dashboardData.charts?.fleetUtilizationByType?.length}
              >
                <div className="h-56">
                  <Bar
                    data={{
                      labels: dashboardData.charts.fleetUtilizationByType.map((r) => r.label),
                      datasets: [
                        {
                          label: "Utilization (%)",
                          data: dashboardData.charts.fleetUtilizationByType.map((r) => r.utilization),
                          backgroundColor: "#547cf5cc",
                          borderColor: "#547cf5",
                          borderWidth: 1.5,
                          borderRadius: 6,
                        },
                      ],
                    }}
                    options={{
                      ...chartDefaults,
                      indexAxis: "y" as const,
                      plugins: { ...chartDefaults.plugins, legend: { display: false } },
                      scales: {
                        x: { ticks: { color: axisColor, callback: (v) => `${v}%` }, grid: { color: "rgba(161,161,170,0.12)" }, min: 0, max: 100 },
                        y: { ticks: { color: axisColor }, grid: { display: false } },
                      },
                    }}
                  />
                </div>
              </ChartCard>

              <ChartCard
                title="Regional Fleet Distribution"
                empty={!dashboardData.charts?.regionalFleetDistribution?.length}
              >
                <div className="h-56">
                  <Bar
                    data={{
                      labels: dashboardData.charts.regionalFleetDistribution.map((r) => r.label),
                      datasets: [
                        {
                          label: "Vehicles",
                          data: dashboardData.charts.regionalFleetDistribution.map((r) => r.value),
                          backgroundColor: ["#547cf5cc", "#22c55ecc", "#f59e0bcc", "#ef4444cc", "#8b5cf6cc"],
                          borderColor: ["#547cf5", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"],
                          borderWidth: 1.5,
                          borderRadius: 6,
                        },
                      ],
                    }}
                    options={{
                      ...chartDefaults,
                      plugins: { ...chartDefaults.plugins, legend: { display: false } },
                      scales: {
                        x: { ticks: { color: axisColor }, grid: { display: false } },
                        y: { ticks: { color: axisColor, stepSize: 1 }, grid: { color: "rgba(161,161,170,0.12)" }, beginAtZero: true },
                      },
                    }}
                  />
                </div>
              </ChartCard>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <ChartCard
                title="Maintenance Status Overview"
                empty={!dashboardData.charts?.maintenanceStatusOverview?.some((r) => r.value > 0)}
              >
                <div className="h-56 flex items-center justify-center">
                  <Doughnut
                    data={{
                      labels: dashboardData.charts.maintenanceStatusOverview.map((r) => r.label),
                      datasets: [
                        {
                          data: dashboardData.charts.maintenanceStatusOverview.map((r) => r.value),
                          backgroundColor: dashboardData.charts.maintenanceStatusOverview.map((r) => (r.color ?? "#547cf5") + "cc"),
                          borderColor: dashboardData.charts.maintenanceStatusOverview.map((r) => r.color ?? "#547cf5"),
                          borderWidth: 2,
                        },
                      ],
                    }}
                    options={{
                      ...chartDefaults,
                      cutout: "68%",
                      plugins: {
                        ...chartDefaults.plugins,
                        legend: { position: "right" as const },
                      },
                    }}
                  />
                </div>
              </ChartCard>

              <ChartCard
                title="Maintenance Cost by Vehicle Type"
                empty={!dashboardData.charts?.maintenanceCostByType?.length}
              >
                <div className="h-56">
                  <Bar
                    data={{
                      labels: dashboardData.charts.maintenanceCostByType.map((r) => r.label),
                      datasets: [
                        {
                          label: "Total Cost (₹)",
                          data: dashboardData.charts.maintenanceCostByType.map((r) => r.totalCost),
                          backgroundColor: "#22c55ecc",
                          borderColor: "#22c55e",
                          borderWidth: 1.5,
                          borderRadius: 6,
                        },
                      ],
                    }}
                    options={{
                      ...chartDefaults,
                      indexAxis: "y" as const,
                      plugins: { ...chartDefaults.plugins, legend: { display: false } },
                      scales: {
                        x: { ticks: { color: axisColor, callback: (v) => `₹${(Number(v) / 1000).toFixed(0)}k` }, grid: { color: "rgba(161,161,170,0.12)" }, beginAtZero: true },
                        y: { ticks: { color: axisColor }, grid: { display: false } },
                      },
                    }}
                  />
                </div>
              </ChartCard>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-zinc-200 dark:border-zinc-800 pt-8">
        <h2 className="text-xl font-black text-zinc-900 dark:text-white mb-4">
          Maintenance Work Tickets Ledger
        </h2>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[
          { label: "Workshop Tickets", value: stats.totalRecords, desc: "Cumulative service events", color: "text-blue-500 bg-blue-500/10 border-blue-500/20", icon: Wrench },
          { label: "Active Repairs", value: stats.activeRepairs, desc: "Vehicles currently IN_SHOP", color: "text-red-500 bg-red-500/10 border-red-500/20", icon: Activity },
          { label: "Total Fleet Expense", value: formatCurrency(stats.totalExpenses), desc: "Aggregated maintenance cost", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20", icon: DollarSign }
        ].map((stat, idx) => (
          <div key={idx} className="group rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-6 backdrop-blur-sm shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.01]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-widest">{stat.label}</span>
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${stat.color} transition-all duration-300 group-hover:scale-110`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-black text-zinc-900 dark:text-white font-mono">{stat.value}</span>
              <span className="block text-xs text-zinc-555 dark:text-zinc-500 mt-1">{stat.desc}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-5 backdrop-blur-sm shadow-sm transition-colors duration-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search by reg number */}
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-400 dark:text-zinc-500">
              <Search className="h-5 w-5" />
            </div>
            <input
              id="maintenance-search"
              type="text"
              placeholder="Search by Registration Number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 pl-11 pr-3 py-3 text-zinc-900 dark:text-white placeholder-zinc-450 dark:placeholder-zinc-555 shadow-inner focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm transition-colors font-medium"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-4 py-3 text-zinc-900 dark:text-white shadow-inner focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm transition-colors cursor-pointer font-medium"
            >
              <option value="All">All Statuses</option>
              {MAINTENANCE_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/20 overflow-hidden backdrop-blur-sm shadow-sm transition-colors duration-200">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
            <p className="text-zinc-500 dark:text-zinc-400 text-sm font-bold">Synchronizing workshop logs...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 mb-4">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Logs Offline</h3>
            <p className="text-sm text-zinc-550 dark:text-zinc-400 mt-2">{error}</p>
            <button
              onClick={fetchRecords}
              className="mt-6 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 px-5 py-2.5 text-sm font-semibold transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center max-w-md mx-auto">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-650 border border-blue-500/20 mb-4">
              <Wrench className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white font-sans">No Maintenance Logged</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 font-medium">
              No matching records exist in the garage database. Log a new service record using the button above.
            </p>
            {(search || statusFilter !== "All") && (
              <button
                onClick={() => {
                  setSearch("");
                  setStatusFilter("All");
                }}
                className="mt-6 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-850 text-zinc-800 dark:text-zinc-200 px-5 py-2.5 text-sm font-bold transition-all cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div>
            {/* Mobile Card List (Visible on mobile/tablet, hidden on desktop) */}
            <div className="block md:hidden divide-y divide-zinc-200/60 dark:divide-zinc-800/40">
              {records.map((record) => (
                <div key={record.id} className="p-5 space-y-3 bg-white dark:bg-zinc-900/10 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/5 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-zinc-900 dark:text-white tracking-wider font-mono text-base block">
                        {record.vehicle.registrationNumber}
                      </span>
                      <span className="text-[11px] text-zinc-550 dark:text-zinc-500 font-medium">
                        {record.vehicle.name}
                      </span>
                    </div>
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${getStatusBadgeClass(record.status)}`}>
                      {record.status}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                      {record.type}
                    </span>
                    <span className="font-bold text-zinc-900 dark:text-white font-mono text-sm">
                      {formatCurrency(record.cost)}
                    </span>
                  </div>

                  {record.description && (
                    <p className="text-xs text-zinc-550 dark:text-zinc-400 font-medium bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-850">
                      {record.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-850 text-[11px] text-zinc-550">
                    <div className="flex items-center gap-4">
                      <div>
                        <span className="block text-[9px] uppercase font-bold text-zinc-400">Started</span>
                        <span className="font-mono text-zinc-700 dark:text-zinc-300 font-semibold">{formatDate(record.startDate)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEditModal(record)}
                        className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 px-2.5 py-1.5 text-[11px] font-semibold transition-all cursor-pointer"
                      >
                        <Edit className="h-3 w-3 text-blue-500" />
                        Edit
                      </button>

                      {record.status === "ACTIVE" && (
                        <button
                          onClick={() => handleCloseTicket(record.id)}
                          disabled={closingId === record.id}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 text-emerald-600 dark:text-emerald-450 px-2.5 py-1.5 text-[11px] font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                          {closingId === record.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                          Close
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm text-zinc-555 dark:text-zinc-400 border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/20 text-zinc-800 dark:text-zinc-300 font-semibold">
                    <th className="py-4.5 px-6">Vehicle</th>
                    <th className="py-4.5 px-6">Service Type</th>
                    <th className="py-4.5 px-6">Description</th>
                    <th className="py-4.5 px-6">Repair Cost</th>
                    <th className="py-4.5 px-6">Start Date</th>
                    <th className="py-4.5 px-6">Status</th>
                    <th className="py-4.5 px-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/40">
                  {records.map((record) => (
                    <tr
                      key={record.id}
                      className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10 transition-colors duration-150"
                    >
                      <td className="py-4 px-6">
                        <div className="font-bold text-zinc-900 dark:text-white tracking-wider font-mono">
                          {record.vehicle.registrationNumber}
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-550 font-medium mt-0.5">
                          {record.vehicle.name}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-zinc-900 dark:text-white font-semibold">
                        {record.type}
                      </td>
                      <td className="py-4 px-6 text-zinc-650 dark:text-zinc-400 max-w-[200px] truncate font-medium">
                        {record.description || <span className="text-zinc-400 dark:text-zinc-600 italic font-normal">No details</span>}
                      </td>
                      <td className="py-4 px-6 font-bold text-zinc-900 dark:text-white font-mono">
                        {formatCurrency(record.cost)}
                      </td>
                      <td className="py-4 px-6 font-mono text-zinc-700 dark:text-zinc-300 font-medium">
                        {formatDate(record.startDate)}
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-bold ${getStatusBadgeClass(record.status)}`}
                        >
                          {record.status}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenEditModal(record)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer"
                          >
                            <Edit className="h-3.5 w-3.5 text-blue-500" />
                            Edit
                          </button>

                          {record.status === "ACTIVE" ? (
                            <button
                              onClick={() => handleCloseTicket(record.id)}
                              disabled={closingId === record.id}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 text-emerald-600 dark:text-emerald-450 px-3.5 py-1.5 text-xs font-bold transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                              {closingId === record.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              )}
                              Close Ticket
                            </button>
                          ) : (
                            <span className="text-xs text-zinc-400 dark:text-zinc-650 italic font-medium">Completed</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Premium Pagination Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between border-t border-zinc-200 dark:border-zinc-800/65 bg-zinc-50/40 dark:bg-zinc-950/10 px-6 py-4.5 gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-450 dark:text-zinc-500 uppercase">Page Size</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  {[5, 10, 20, 50].map((size) => (
                    <option key={size} value={size}>{size} per page</option>
                  ))}
                </select>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium ml-2">
                  Showing <span className="font-bold text-zinc-850 dark:text-zinc-200">{(currentPage - 1) * pageSize + 1}</span> to <span className="font-bold text-zinc-850 dark:text-zinc-200">{Math.min(currentPage * pageSize, pagination.total)}</span> of <span className="font-bold text-zinc-850 dark:text-zinc-200">{pagination.total}</span> tickets
                </span>
              </div>

              {pagination.totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      className={`flex h-9 w-9 items-center justify-center rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                        p === currentPage
                          ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                          : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                    disabled={currentPage === pagination.totalPages}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Maintenance Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-md">
          {/* Backdrop */}
          <div className="absolute inset-0" onClick={handleCloseModal} />

          {/* Modal */}
          <div className="relative w-full max-w-xl rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 sm:p-8 shadow-2xl z-10">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800/80">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  <Wrench className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                    {editingRecord ? "Edit Maintenance Record" : "Create Maintenance Record"}
                  </h3>
                  <p className="text-xs text-zinc-550 dark:text-zinc-400 mt-0.5 font-medium">
                    Vehicle status updates dynamically depending on the ticket's active state.
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                disabled={submitting}
                className="p-1.5 rounded-lg text-zinc-450 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Error */}
            {modalError && (
              <div className="mt-4 flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-600 dark:text-rose-455">
                <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />
                <p className="font-semibold">{modalError}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* Vehicle Select */}
                <div className="sm:col-span-2 space-y-1.5">
                  <label
                    htmlFor="vehicle-select"
                    className="text-xs font-bold text-zinc-455 dark:text-zinc-400 uppercase tracking-wider"
                  >
                    Select Fleet Vehicle
                  </label>
                  <select
                    id="vehicle-select"
                    required
                    disabled={submitting || vehiclesLoading}
                    value={selectedVehicleId}
                    onChange={(e) => setSelectedVehicleId(e.target.value)}
                    className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3.5 py-3 text-zinc-900 dark:text-white shadow-inner focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm transition-colors cursor-pointer font-medium"
                  >
                    <option value="">
                      {vehiclesLoading ? "Loading fleet vehicles..." : "Choose operational vehicle..."}
                    </option>
                    {dropdownVehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.registrationNumber} — {v.name} ({v.status})
                      </option>
                    ))}
                  </select>
                  {!vehiclesLoading && dropdownVehicles.length === 0 && (
                    <p className="text-xs font-semibold text-rose-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" /> No eligible vehicles available (must be AVAILABLE).
                    </p>
                  )}
                </div>

                {/* Maintenance Type */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="maintenance-type"
                    className="text-xs font-bold text-zinc-455 dark:text-zinc-400 uppercase tracking-wider"
                  >
                    Maintenance Type
                  </label>
                  <select
                    id="maintenance-type"
                    required
                    disabled={submitting}
                    value={maintenanceType}
                    onChange={(e) => setMaintenanceType(e.target.value)}
                    className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3.5 py-3 text-zinc-900 dark:text-white shadow-inner focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm transition-colors cursor-pointer font-medium"
                  >
                    {MAINTENANCE_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Cost */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="maintenance-cost"
                    className="text-xs font-bold text-zinc-455 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5"
                  >
                    <DollarSign className="h-3.5 w-3.5" /> Repair Cost (₹)
                  </label>
                  <input
                    id="maintenance-cost"
                    type="number"
                    min="0"
                    step="any"
                    disabled={submitting}
                    placeholder="e.g. 5000"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3.5 py-3 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-550 shadow-inner focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm transition-colors resize-none font-mono font-medium"
                  />
                </div>

                {/* Start Date */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="start-date"
                    className="text-xs font-bold text-zinc-455 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5"
                  >
                    <Calendar className="h-3.5 w-3.5" /> Start Date
                  </label>
                  <input
                    id="start-date"
                    type="date"
                    required
                    disabled={submitting}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3.5 py-3 text-zinc-900 dark:text-white shadow-inner focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm transition-colors cursor-pointer font-medium"
                  />
                </div>

                {/* Status Selection (Visible only in Edit Mode) */}
                {editingRecord && (
                  <div className="space-y-1.5">
                    <label
                      htmlFor="record-status"
                      className="text-xs font-bold text-zinc-455 dark:text-zinc-400 uppercase tracking-wider"
                    >
                      Status
                    </label>
                    <select
                      id="record-status"
                      required
                      disabled={submitting}
                      value={recordStatus}
                      onChange={(e) => setRecordStatus(e.target.value as "ACTIVE" | "CLOSED")}
                      className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3.5 py-3 text-zinc-900 dark:text-white shadow-inner focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm transition-colors cursor-pointer font-medium"
                    >
                      {MAINTENANCE_STATUSES.map((statusOption) => (
                        <option key={statusOption} value={statusOption}>
                          {statusOption}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Description */}
                <div className="sm:col-span-2 space-y-1.5">
                  <label
                    htmlFor="maintenance-description"
                    className="text-xs font-bold text-zinc-455 dark:text-zinc-400 uppercase tracking-wider"
                  >
                    Service Description <span className="normal-case font-normal text-zinc-400">(optional)</span>
                  </label>
                  <textarea
                    id="maintenance-description"
                    rows={3}
                    disabled={submitting}
                    placeholder="e.g. Scheduled engine oil and filter replacement at 100,000 km"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3.5 py-3 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-550 shadow-inner focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm transition-colors resize-none font-medium"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-zinc-200 dark:border-zinc-800/85 mt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={submitting}
                  className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-850 px-5 py-3.5 text-sm font-bold text-zinc-700 dark:text-zinc-300 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-5 py-3.5 text-sm font-bold shadow-[0_4px_15px_rgba(37,99,235,0.2)] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    editingRecord ? "Save Changes" : "Create Ticket"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
