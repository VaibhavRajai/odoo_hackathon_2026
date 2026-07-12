"use client";

import React, { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../../../../api-client";
import { 
  Truck, 
  Plus, 
  Search, 
  Filter, 
  DollarSign, 
  Gauge, 
  Scale, 
  X, 
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  CheckCircle,
  Wrench,
  Ban
} from "lucide-react";

interface Vehicle {
  id: string;
  registrationNumber: string;
  name: string;
  type: string;
  maxLoadCapacity: number;
  odometer: number;
  acquisitionCost: number;
  status: "AVAILABLE" | "ON_TRIP" | "IN_SHOP" | "RETIRED";
}

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const VEHICLE_TYPES = ["Van", "Truck", "Sedan", "SUV", "Bus"];
const VEHICLE_STATUSES = ["AVAILABLE", "ON_TRIP", "IN_SHOP", "RETIRED"];

export default function VehicleRegistryPage() {
  // Main state
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  // Filters state
  const [search, setSearch] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Stats summary counts
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    inShop: 0,
    onTrip: 0
  });

  // Modal form state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string>("");

  const [regNumber, setRegNumber] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [vehicleType, setVehicleType] = useState<string>("Van");
  const [maxLoad, setMaxLoad] = useState<string>("");
  const [odometer, setOdometer] = useState<string>("");
  const [cost, setCost] = useState<string>("");

  // Fetch vehicles with current filters & pagination
  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const queryParams = new URLSearchParams();
      if (typeFilter && typeFilter !== "All") {
        queryParams.append("type", typeFilter);
      }
      if (statusFilter && statusFilter !== "All") {
        queryParams.append("status", statusFilter);
      }
      if (search.trim()) {
        queryParams.append("search", search.trim());
      }
      queryParams.append("page", currentPage.toString());
      queryParams.append("limit", pageSize.toString());

      const res = await apiFetch(`/api/vehicles?${queryParams.toString()}`);
      if (res.success) {
        setVehicles(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      } else {
        setError("Failed to retrieve vehicles.");
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred while fetching vehicles.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter, search, currentPage, pageSize]);

  // Fetch stats summary (all vehicles unfiltered)
  const fetchStatsSummary = useCallback(async () => {
    try {
      const res = await apiFetch("/api/vehicles?limit=1000");
      if (res.success && res.data) {
        const list: Vehicle[] = res.data;
        setStats({
          total: list.length,
          available: list.filter(v => v.status === "AVAILABLE").length,
          inShop: list.filter(v => v.status === "IN_SHOP").length,
          onTrip: list.filter(v => v.status === "ON_TRIP").length
        });
      }
    } catch {
      // Ignored
    }
  }, []);

  // Debounced filter triggers
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVehicles();
    }, 400);

    return () => clearTimeout(timer);
  }, [fetchVehicles]);

  // Refresh stats whenever list updates
  useEffect(() => {
    fetchStatsSummary();
  }, [vehicles, fetchStatsSummary]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, statusFilter, search]);

  // Form Reset
  const resetForm = () => {
    setRegNumber("");
    setName("");
    setVehicleType("Van");
    setMaxLoad("");
    setOdometer("");
    setCost("");
    setModalError("");
  };

  // Open modal
  const handleOpenModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  // Close modal
  const handleCloseModal = () => {
    if (!submitting) {
      setIsModalOpen(false);
    }
  };

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");

    // Front-end Validations
    if (!regNumber.trim() || !name.trim() || !vehicleType.trim() || !maxLoad || !odometer || !cost) {
      setModalError("All fields are required.");
      return;
    }

    const numericMaxLoad = parseFloat(maxLoad);
    const numericOdometer = parseFloat(odometer);
    const numericCost = parseFloat(cost);

    if (isNaN(numericMaxLoad) || numericMaxLoad <= 0) {
      setModalError("Maximum load capacity must be a number greater than 0.");
      return;
    }

    if (isNaN(numericOdometer) || numericOdometer < 0) {
      setModalError("Odometer must be a number greater than or equal to 0.");
      return;
    }

    if (isNaN(numericCost) || numericCost < 0) {
      setModalError("Acquisition cost must be a number greater than or equal to 0.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        registrationNumber: regNumber.trim().toUpperCase(),
        name: name.trim(),
        type: vehicleType.trim(),
        maxLoadCapacity: numericMaxLoad,
        odometer: numericOdometer,
        acquisitionCost: numericCost,
      };

      const res = await apiFetch("/api/vehicles", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res.success) {
        setIsModalOpen(false);
        resetForm();
        fetchVehicles();
      } else {
        setModalError(res.message || "Failed to register vehicle.");
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Something went wrong.";
      setModalError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Get status badge styling & indicator
  const getStatusDetails = (status: string) => {
    switch (status) {
      case "AVAILABLE":
        return {
          bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border-emerald-500/20",
          icon: CheckCircle
        };
      case "ON_TRIP":
        return {
          bg: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
          icon: ShieldCheck
        };
      case "IN_SHOP":
        return {
          bg: "bg-amber-500/10 text-amber-600 dark:text-amber-450 border-amber-500/20",
          icon: Wrench
        };
      case "RETIRED":
        return {
          bg: "bg-rose-500/10 text-rose-600 dark:text-rose-450 border-rose-500/20",
          icon: Ban
        };
      default:
        return {
          bg: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20",
          icon: AlertCircle
        };
    }
  };

  // Helper formats
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-IN").format(num);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900 to-indigo-950 p-8 sm:p-10 shadow-xl border border-indigo-900/40">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-300 border border-blue-400/20 mb-3">
              <Sparkles className="h-3 w-3" /> System Registry Active
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-none">
              Vehicle Registry
            </h1>
            <p className="text-blue-100/70 mt-2 max-w-xl text-sm sm:text-base font-medium">
              Manage transit fleet assets, monitor real-time availability, and coordinate garage maintenance logs.
            </p>
          </div>
          <button
            onClick={handleOpenModal}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-white px-6 py-3.5 text-sm font-bold shadow-[0_4px_20px_rgba(37,99,235,0.3)] transition-all hover:translate-y-[-2px] active:translate-y-0 cursor-pointer self-start"
          >
            <Plus className="h-5 w-5" /> Add Vehicle
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: "Total Registered", value: stats.total, desc: "Total fleet inventory", color: "text-blue-500 bg-blue-500/10 border-blue-500/20", icon: Truck },
          { label: "Available now", value: stats.available, desc: "Ready for trip dispatch", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20", icon: CheckCircle },
          { label: "In Maintenance", value: stats.inShop, desc: "Currently in repair shop", color: "text-amber-500 bg-amber-500/10 border-amber-500/20", icon: Wrench },
          { label: "Active on Trip", value: stats.onTrip, desc: "On active dispatch route", color: "text-sky-500 bg-sky-500/10 border-sky-500/20", icon: ShieldCheck }
        ].map((stat, idx) => (
          <div key={idx} className="group rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-6 backdrop-blur-sm shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.01]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-widest">{stat.label}</span>
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${stat.color} transition-all duration-300 group-hover:scale-110`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-black text-zinc-900 dark:text-white">{stat.value}</span>
              <span className="block text-xs text-zinc-500 dark:text-zinc-500 mt-1">{stat.desc}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Control / Filter Bar */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-5 backdrop-blur-sm shadow-sm transition-colors duration-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-400 dark:text-zinc-500">
              <Search className="h-5 w-5" />
            </div>
            <input
              id="search-input"
              type="text"
              placeholder="Search by Registration Number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 pl-11 pr-3 py-3 text-zinc-900 dark:text-white placeholder-zinc-450 dark:placeholder-zinc-550 shadow-inner focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm transition-colors font-medium"
            />
          </div>

          {/* Type Filter */}
          <div>
            <select
              id="type-filter"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-4 py-3 text-zinc-900 dark:text-white shadow-inner focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm transition-colors cursor-pointer font-medium"
            >
              <option value="All">All Vehicle Types</option>
              {VEHICLE_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-4 py-3 text-zinc-900 dark:text-white shadow-inner focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm transition-colors cursor-pointer font-medium"
            >
              <option value="All">All Statuses</option>
              {VEHICLE_STATUSES.map((status) => (
                <option key={status} value={status}>{status.replace("_", " ")}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Table / Grid Container */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/20 overflow-hidden backdrop-blur-sm shadow-sm transition-colors duration-200">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
            <p className="text-zinc-500 dark:text-zinc-400 text-sm font-bold">Synchronizing registry records...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 mb-4">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Registry Out of Sync</h3>
            <p className="text-sm text-zinc-550 dark:text-zinc-400 mt-2">{error}</p>
            <button
              onClick={fetchVehicles}
              className="mt-6 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 px-5 py-2.5 text-sm font-semibold transition-colors cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center max-w-md mx-auto">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500 border border-blue-500/20 mb-4">
              <Truck className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white font-sans">No Fleet Assets Found</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 font-medium">
              No matching records exist in the fleet database. Refine active filters or insert a new vehicle entry.
            </p>
            {(search || typeFilter !== "All" || statusFilter !== "All") && (
              <button
                onClick={() => {
                  setSearch("");
                  setTypeFilter("All");
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
              <table className="w-full min-w-[800px] text-left text-sm text-zinc-555 dark:text-zinc-400 border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/20 text-zinc-800 dark:text-zinc-300 font-semibold">
                    <th className="py-4.5 px-6">Registration Number</th>
                    <th className="py-4.5 px-6">Name / Model</th>
                    <th className="py-4.5 px-6">Type</th>
                    <th className="py-4.5 px-6">Max Capacity</th>
                    <th className="py-4.5 px-6">Odometer</th>
                    <th className="py-4.5 px-6">Acquisition Cost</th>
                    <th className="py-4.5 px-6">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/40">
                  {vehicles.map((vehicle) => {
                    const statusConfig = getStatusDetails(vehicle.status);
                    const StatusIcon = statusConfig.icon;
                    return (
                      <tr key={vehicle.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10 transition-colors duration-150">
                        <td className="py-4 px-6 font-bold text-zinc-900 dark:text-white tracking-wider font-mono">
                          {vehicle.registrationNumber}
                        </td>
                        <td className="py-4 px-6 text-zinc-900 dark:text-white font-medium">
                          {vehicle.name}
                        </td>
                        <td className="py-4 px-6 font-medium text-zinc-650 dark:text-zinc-400">
                          {vehicle.type}
                        </td>
                        <td className="py-4 px-6 text-zinc-800 dark:text-zinc-300 font-semibold font-mono">
                          {formatNumber(vehicle.maxLoadCapacity)} kg
                        </td>
                        <td className="py-4 px-6 font-mono text-zinc-700 dark:text-zinc-300">
                          {formatNumber(vehicle.odometer)} km
                        </td>
                        <td className="py-4 px-6 text-zinc-900 dark:text-white font-bold font-mono">
                          {formatCurrency(vehicle.acquisitionCost)}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${statusConfig.bg}`}>
                            <StatusIcon className="h-3.5 w-3.5" />
                            {vehicle.status.replace("_", " ")}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
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
                  Showing <span className="font-bold text-zinc-850 dark:text-zinc-200">{(currentPage - 1) * pageSize + 1}</span> to <span className="font-bold text-zinc-850 dark:text-zinc-200">{Math.min(currentPage * pageSize, pagination.total)}</span> of <span className="font-bold text-zinc-850 dark:text-zinc-200">{pagination.total}</span> assets
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

      {/* Add Vehicle Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-md transition-all duration-300">
          {/* Backdrop Click */}
          <div className="absolute inset-0 cursor-default" onClick={handleCloseModal} />

          {/* Modal Content */}
          <div className="relative w-full max-w-xl rounded-3xl border border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-900 p-6 sm:p-8 shadow-2xl z-10 transition-all duration-200 transform scale-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800/80">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 border border-blue-500/20">
                  <Plus className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Register New Fleet Asset</h3>
                  <p className="text-xs text-zinc-550 dark:text-zinc-400 mt-0.5 font-medium">Starts with AVAILABLE operational status.</p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                disabled={submitting}
                className="p-1.5 rounded-lg text-zinc-450 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-850 transition-colors disabled:opacity-50 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Error Message */}
            {modalError && (
              <div className="mt-4 flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-600 dark:text-rose-455 animate-shake">
                <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />
                <p className="font-semibold">{modalError}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Registration Number */}
                <div className="space-y-1.5">
                  <label htmlFor="reg-number" className="text-xs font-bold text-zinc-450 dark:text-zinc-400 uppercase tracking-wider">
                    Registration Number
                  </label>
                  <input
                    id="reg-number"
                    type="text"
                    required
                    disabled={submitting}
                    placeholder="e.g. GJ01AB7432"
                    value={regNumber}
                    onChange={(e) => setRegNumber(e.target.value)}
                    className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3.5 py-3 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-550 shadow-inner focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm transition-colors uppercase font-mono font-bold tracking-wider"
                  />
                </div>

                {/* Name / Model */}
                <div className="space-y-1.5">
                  <label htmlFor="vehicle-name" className="text-xs font-bold text-zinc-450 dark:text-zinc-400 uppercase tracking-wider">
                    Vehicle Model / Name
                  </label>
                  <input
                    id="vehicle-name"
                    type="text"
                    required
                    disabled={submitting}
                    placeholder="e.g. VAN-05 or Tata Winger"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3.5 py-3 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-550 shadow-inner focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm transition-colors font-medium"
                  />
                </div>

                {/* Vehicle Type */}
                <div className="space-y-1.5">
                  <label htmlFor="vehicle-type-select" className="text-xs font-bold text-zinc-450 dark:text-zinc-400 uppercase tracking-wider">
                    Vehicle Class / Type
                  </label>
                  <select
                    id="vehicle-type-select"
                    disabled={submitting}
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3.5 py-3 text-zinc-900 dark:text-white shadow-inner focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm transition-colors cursor-pointer font-medium"
                  >
                    {VEHICLE_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                {/* Max Load Capacity */}
                <div className="space-y-1.5">
                  <label htmlFor="max-load" className="text-xs font-bold text-zinc-450 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Scale className="h-3.5 w-3.5" /> Payload capacity (kg)
                  </label>
                  <input
                    id="max-load"
                    type="number"
                    min="0.1"
                    step="any"
                    required
                    disabled={submitting}
                    placeholder="e.g. 1500"
                    value={maxLoad}
                    onChange={(e) => setMaxLoad(e.target.value)}
                    className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3.5 py-3 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-550 shadow-inner focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm transition-colors font-mono font-medium"
                  />
                </div>

                {/* Odometer */}
                <div className="space-y-1.5">
                  <label htmlFor="odometer" className="text-xs font-bold text-zinc-450 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Gauge className="h-3.5 w-3.5" /> Initial Odometer (km)
                  </label>
                  <input
                    id="odometer"
                    type="number"
                    min="0"
                    step="any"
                    required
                    disabled={submitting}
                    placeholder="e.g. 50000"
                    value={odometer}
                    onChange={(e) => setOdometer(e.target.value)}
                    className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3.5 py-3 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-550 shadow-inner focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm transition-colors font-mono font-medium"
                  />
                </div>

                {/* Acquisition Cost */}
                <div className="space-y-1.5">
                  <label htmlFor="acq-cost" className="text-xs font-bold text-zinc-450 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5" /> Cost Price (₹)
                  </label>
                  <input
                    id="acq-cost"
                    type="number"
                    min="0"
                    step="any"
                    required
                    disabled={submitting}
                    placeholder="e.g. 750000"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3.5 py-3 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-550 shadow-inner focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm transition-colors font-mono font-medium"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-zinc-200 dark:border-zinc-800/80 mt-6">
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
                      <Loader2 className="h-4 w-4 animate-spin" /> Registering...
                    </>
                  ) : (
                    "Register Asset"
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
