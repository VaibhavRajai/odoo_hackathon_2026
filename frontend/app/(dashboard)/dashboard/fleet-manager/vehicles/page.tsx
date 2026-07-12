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
  Loader2
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

const VEHICLE_TYPES = ["Van", "Truck", "Sedan", "SUV", "Bus"];
const VEHICLE_STATUSES = ["AVAILABLE", "ON_TRIP", "IN_SHOP", "RETIRED"];

export default function VehicleRegistryPage() {
  // Main state
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  // Filters state
  const [search, setSearch] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");

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

  // Fetch vehicles with current filters
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

      const res = await apiFetch(`/api/vehicles?${queryParams.toString()}`);
      if (res.success) {
        setVehicles(res.data || []);
      } else {
        setError("Failed to retrieve vehicles.");
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred while fetching vehicles.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter, search]);

  // Debounced filter triggers
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVehicles();
    }, 250);

    return () => clearTimeout(timer);
  }, [fetchVehicles]);

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
        fetchVehicles(); // Reload vehicle list maintaining filters
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

  // Get status badge styling
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "AVAILABLE":
        return "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      case "ON_TRIP":
        return "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20";
      case "IN_SHOP":
        return "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20";
      case "RETIRED":
        return "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20";
      default:
        return "text-zinc-650 dark:text-zinc-400 bg-zinc-500/10 border-zinc-500/20";
    }
  };

  // Helper formats
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-US").format(num);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Block */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">Vehicle Registry</h1>
          <p className="text-zinc-550 dark:text-zinc-400 mt-2">Manage and monitor the transit fleet master database.</p>
        </div>
        <button
          onClick={handleOpenModal}
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 text-sm font-semibold shadow-[0_0_15px_rgba(37,99,235,0.2)] transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer self-start sm:self-center"
        >
          <Plus className="h-4 w-4" /> Add Vehicle
        </button>
      </div>

      {/* Control / Filter Bar */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-4 sm:p-6 backdrop-blur-sm shadow-sm transition-colors duration-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <label htmlFor="search-input" className="sr-only">Search by Registration Number</label>
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400 dark:text-zinc-500">
              <Search className="h-5 w-5" />
            </div>
            <input
              id="search-input"
              type="text"
              placeholder="Search by Registration Number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 pl-10 pr-3 py-3 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm transition-colors"
            />
          </div>

          {/* Type Filter */}
          <div>
            <label htmlFor="type-filter" className="sr-only">Filter by Vehicle Type</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400 dark:text-zinc-500">
                <Truck className="h-5 w-5" />
              </div>
              <select
                id="type-filter"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 pl-10 pr-3 py-3 text-zinc-900 dark:text-white shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm transition-colors cursor-pointer"
              >
                <option value="All">All Types</option>
                {VEHICLE_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label htmlFor="status-filter" className="sr-only">Filter by Status</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400 dark:text-zinc-500">
                <Filter className="h-5 w-5" />
              </div>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 pl-10 pr-3 py-3 text-zinc-900 dark:text-white shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm transition-colors cursor-pointer"
              >
                <option value="All">All Statuses</option>
                {VEHICLE_STATUSES.map((status) => (
                  <option key={status} value={status}>{status.replace("_", " ")}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table / Grid Container */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/20 p-6 backdrop-blur-sm transition-colors duration-200">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-zinc-550 dark:text-zinc-400 text-sm font-medium">Fetching registry records...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center max-w-md mx-auto">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 mb-4">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Registry Connection Failed</h3>
            <p className="text-sm text-zinc-550 dark:text-zinc-400 mt-2">{error}</p>
            <button
              onClick={fetchVehicles}
              className="mt-6 rounded-xl bg-zinc-150 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 border border-blue-500/20 mb-4">
              <Truck className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">No Vehicles Found</h3>
            <p className="text-sm text-zinc-550 dark:text-zinc-400 mt-2">
              No matching records exist in the fleet registry. Try refining your filters or add a new vehicle.
            </p>
            {(search || typeFilter !== "All" || statusFilter !== "All") && (
              <button
                onClick={() => {
                  setSearch("");
                  setTypeFilter("All");
                  setStatusFilter("All");
                }}
                className="mt-6 rounded-xl bg-zinc-150 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer"
              >
                Clear Active Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm text-zinc-500 dark:text-zinc-400 border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-300 font-medium">
                  <th className="py-3 px-4">Registration Number</th>
                  <th className="py-3 px-4">Name / Model</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Max Capacity</th>
                  <th className="py-3 px-4">Odometer</th>
                  <th className="py-3 px-4">Acquisition Cost</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/65 dark:divide-zinc-800/40">
                {vehicles.map((vehicle) => (
                  <tr key={vehicle.id} className="hover:bg-zinc-100 dark:hover:bg-zinc-800/10 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-zinc-900 dark:text-white tracking-wider font-mono">
                      {vehicle.registrationNumber}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-900 dark:text-white font-medium">
                      {vehicle.name}
                    </td>
                    <td className="py-3.5 px-4">{vehicle.type}</td>
                    <td className="py-3.5 px-4 text-zinc-750 dark:text-zinc-300 font-medium">
                      {formatNumber(vehicle.maxLoadCapacity)} kg
                    </td>
                    <td className="py-3.5 px-4 font-mono text-zinc-750 dark:text-zinc-300">
                      {formatNumber(vehicle.odometer)} km
                    </td>
                    <td className="py-3.5 px-4 text-zinc-900 dark:text-white font-medium">
                      {formatCurrency(vehicle.acquisitionCost)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusBadgeClass(vehicle.status)}`}>
                        {vehicle.status.replace("_", " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Vehicle Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300 animate-fadeIn">
          {/* Backdrop Click */}
          <div className="absolute inset-0 cursor-default" onClick={handleCloseModal} />

          {/* Modal Content */}
          <div className="relative w-full max-w-xl rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 sm:p-8 shadow-2xl backdrop-blur-xl transition-all duration-200 transform scale-100 z-10">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-500 border border-blue-500/20">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Register New Vehicle</h3>
                  <p className="text-xs text-zinc-550 dark:text-zinc-400 mt-0.5">Newly created vehicles start with AVAILABLE status.</p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                disabled={submitting}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Error Message */}
            {modalError && (
              <div className="mt-4 flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400 animate-shake">
                <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
                <p className="font-medium">{modalError}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Registration Number */}
                <div className="space-y-1.5">
                  <label htmlFor="reg-number" className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Registration Number
                  </label>
                  <input
                    id="reg-number"
                    type="text"
                    required
                    disabled={submitting}
                    placeholder="e.g. GJ01AB5432"
                    value={regNumber}
                    onChange={(e) => setRegNumber(e.target.value)}
                    className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-3 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm transition-colors uppercase"
                  />
                </div>

                {/* Name / Model */}
                <div className="space-y-1.5">
                  <label htmlFor="vehicle-name" className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Vehicle Name / Model
                  </label>
                  <input
                    id="vehicle-name"
                    type="text"
                    required
                    disabled={submitting}
                    placeholder="e.g. VAN-05 or Custom Truck"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-3 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm transition-colors"
                  />
                </div>

                {/* Vehicle Type */}
                <div className="space-y-1.5">
                  <label htmlFor="vehicle-type-select" className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Vehicle Type
                  </label>
                  <select
                    id="vehicle-type-select"
                    disabled={submitting}
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-3 text-zinc-900 dark:text-white shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm transition-colors cursor-pointer"
                  >
                    {VEHICLE_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                {/* Max Load Capacity */}
                <div className="space-y-1.5">
                  <label htmlFor="max-load" className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Scale className="h-3.5 w-3.5" /> Max Capacity (kg)
                  </label>
                  <input
                    id="max-load"
                    type="number"
                    min="0.1"
                    step="any"
                    required
                    disabled={submitting}
                    placeholder="e.g. 500"
                    value={maxLoad}
                    onChange={(e) => setMaxLoad(e.target.value)}
                    className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-3 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm transition-colors"
                  />
                </div>

                {/* Odometer */}
                <div className="space-y-1.5">
                  <label htmlFor="odometer" className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Gauge className="h-3.5 w-3.5" /> Odometer (km)
                  </label>
                  <input
                    id="odometer"
                    type="number"
                    min="0"
                    step="any"
                    required
                    disabled={submitting}
                    placeholder="e.g. 74000"
                    value={odometer}
                    onChange={(e) => setOdometer(e.target.value)}
                    className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-3 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm transition-colors"
                  />
                </div>

                {/* Acquisition Cost */}
                <div className="space-y-1.5">
                  <label htmlFor="acq-cost" className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5" /> Acquisition Cost ($)
                  </label>
                  <input
                    id="acq-cost"
                    type="number"
                    min="0"
                    step="any"
                    required
                    disabled={submitting}
                    placeholder="e.g. 630000"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-3 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm transition-colors"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-zinc-200 dark:border-zinc-800 mt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={submitting}
                  className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-850 px-5 py-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 text-sm font-semibold shadow-[0_0_15px_rgba(37,99,235,0.2)] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Registering...
                    </>
                  ) : (
                    "Register Vehicle"
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
