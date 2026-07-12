"use client";

import React, { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../../../../api-client";
import {
  Wrench,
  Plus,
  Search,
  Filter,
  X,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Calendar,
  DollarSign,
  ChevronDown,
  Sparkles,
  CheckCircle,
  Activity,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Page Component ───────────────────────────────────────────────────────────

export default function MaintenancePage() {
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

  // Available vehicles for the create form dropdown
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

  // Create modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  // Form fields
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [maintenanceType, setMaintenanceType] = useState("Oil Change");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 10) // Today's date as default
  );

  // Close confirmation state
  const [closingId, setClosingId] = useState<string | null>(null);

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

  // ─── Fetch Vehicles (for create form) ──────────────────────────────────────

  const fetchVehicles = useCallback(async () => {
    setVehiclesLoading(true);
    try {
      const res = await apiFetch("/api/vehicles?limit=1000");
      if (res.success) {
        setVehicles(res.data || []);
      }
    } catch {
      // Non-fatal — form will show empty dropdown
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
    setModalError("");
  };

  const handleOpenModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (!submitting) setIsModalOpen(false);
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
      };

      const res = await apiFetch("/api/maintenance", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res.success) {
        setIsModalOpen(false);
        resetForm();
        fetchRecords();
        fetchVehicles(); // Refresh vehicle list (status changed)
      } else {
        setModalError(res.message || "Failed to create maintenance record.");
      }
    } catch (err: unknown) {
      setModalError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Close Record ───────────────────────────────────────────────────────────

  const handleClose = async (id: string) => {
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
        return "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20";
      case "CLOSED":
        return "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      default:
        return "text-zinc-650 dark:text-zinc-400 bg-zinc-500/10 border-zinc-500/20";
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

  return (
    <div className="space-y-8 max-w-7xl mx-auto">

      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-zinc-900 to-amber-955 p-8 sm:p-10 shadow-xl border border-zinc-800">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-300 border border-amber-400/20 mb-3">
              <Sparkles className="h-3 w-3" /> Garage Logs Active
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-none">
              Maintenance Management
            </h1>
            <p className="text-zinc-100/70 mt-2 max-w-xl text-sm sm:text-base font-medium">
              Log workshop repairs, schedule maintenance checklists, and track lifecycle operational costs.
            </p>
          </div>
          <button
            onClick={handleOpenModal}
            className="flex items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white px-6 py-3.5 text-sm font-bold shadow-[0_4px_20px_rgba(245,158,11,0.3)] transition-all hover:translate-y-[-2px] active:translate-y-0 cursor-pointer self-start"
          >
            <Plus className="h-5 w-5" /> Create Record
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[
          { label: "Workshop Tickets", value: stats.totalRecords, desc: "Cumulative service events", color: "text-amber-500 bg-amber-500/10 border-amber-500/20", icon: Wrench },
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
              <span className="block text-xs text-zinc-500 dark:text-zinc-500 mt-1">{stat.desc}</span>
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
              className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 pl-11 pr-3 py-3 text-zinc-900 dark:text-white placeholder-zinc-450 dark:placeholder-zinc-550 shadow-inner focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm transition-colors font-medium"
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
            <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
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
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/20 mb-4">
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
                className="mt-6 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 px-5 py-2.5 text-sm font-bold transition-all cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm text-zinc-555 dark:text-zinc-400 border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/20 text-zinc-800 dark:text-zinc-300 font-semibold">
                    <th className="py-4.5 px-6">Vehicle</th>
                    <th className="py-4.5 px-6">Service Type</th>
                    <th className="py-4.5 px-6">Description</th>
                    <th className="py-4.5 px-6">Repair Cost</th>
                    <th className="py-4.5 px-6">Start Date</th>
                    <th className="py-4.5 px-6">Closed Date</th>
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
                        <div className="text-xs text-zinc-500 dark:text-zinc-500 font-medium mt-0.5">
                          {record.vehicle.name}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-zinc-900 dark:text-white font-semibold">
                        {record.type}
                      </td>
                      <td className="py-4 px-6 text-zinc-600 dark:text-zinc-400 max-w-[200px] truncate font-medium">
                        {record.description || <span className="text-zinc-400 dark:text-zinc-650 italic font-normal">No details</span>}
                      </td>
                      <td className="py-4 px-6 font-bold text-zinc-900 dark:text-white font-mono">
                        {formatCurrency(record.cost)}
                      </td>
                      <td className="py-4 px-6 font-mono text-zinc-700 dark:text-zinc-300 font-medium">
                        {formatDate(record.startDate)}
                      </td>
                      <td className="py-4 px-6 font-mono text-zinc-700 dark:text-zinc-300 font-medium">
                        {formatDate(record.completedDate)}
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-bold ${getStatusBadgeClass(record.status)}`}
                        >
                          {record.status}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        {record.status === "ACTIVE" ? (
                          <button
                            onClick={() => handleClose(record.id)}
                            disabled={closingId === record.id}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 text-emerald-600 dark:text-emerald-450 px-3.5 py-2 text-xs font-bold transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
                          ? "bg-amber-600 border-amber-600 text-white shadow-sm"
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

      {/* Create Maintenance Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-md">
          {/* Backdrop */}
          <div className="absolute inset-0" onClick={handleCloseModal} />

          {/* Modal */}
          <div className="relative w-full max-w-xl rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 sm:p-8 shadow-2xl z-10">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800/80">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <Wrench className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                    Create Maintenance Record
                  </h3>
                  <p className="text-xs text-zinc-550 dark:text-zinc-400 mt-0.5 font-medium">
                    Vehicle operational status will automatically set to IN_SHOP.
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
                    className="text-xs font-bold text-zinc-450 dark:text-zinc-400 uppercase tracking-wider"
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
                    {eligibleVehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.registrationNumber} — {v.name}
                      </option>
                    ))}
                  </select>
                  {!vehiclesLoading && eligibleVehicles.length === 0 && (
                    <p className="text-xs font-semibold text-rose-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" /> No eligible vehicles available (must be AVAILABLE).
                    </p>
                  )}
                </div>

                {/* Maintenance Type */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="maintenance-type"
                    className="text-xs font-bold text-zinc-450 dark:text-zinc-400 uppercase tracking-wider"
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
                    className="text-xs font-bold text-zinc-450 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5"
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
                    className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3.5 py-3 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-550 shadow-inner focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm transition-colors font-mono font-medium"
                  />
                </div>

                {/* Start Date */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="start-date"
                    className="text-xs font-bold text-zinc-450 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5"
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

                {/* Description */}
                <div className="sm:col-span-2 space-y-1.5">
                  <label
                    htmlFor="maintenance-description"
                    className="text-xs font-bold text-zinc-450 dark:text-zinc-400 uppercase tracking-wider"
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
                  className="flex items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white px-5 py-3.5 text-sm font-bold shadow-[0_4px_15px_rgba(245,158,11,0.2)] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Creating...
                    </>
                  ) : (
                    "Create Ticket"
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
