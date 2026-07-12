"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { apiFetch } from "../../../../api-client";
import {
  validateDriverName,
  validateContactNumber,
  validateLicenseNumber,
  validateLicenseExpiry,
  validateDriverEmail,
} from "../../../../validators";
import ExpiryCountdown from "../expiry-countdown";
import { TableSkeleton } from "../skeletons";
import {
  Users,
  Plus,
  Search,
  Filter,
  X,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Trash2,
  Pencil,
  Eye,
  Mail,
  ArrowUpDown,
} from "lucide-react";

interface Driver {
  id: string;
  name: string;
  licenseNumber: string;
  licenseCategory: "LMV_TR" | "MGV" | "HMV";
  licenseExpiry: string;
  contactNumber: string;
  email: string | null;
  safetyScore: number;
  status: "AVAILABLE" | "ON_TRIP" | "OFF_DUTY" | "SUSPENDED";
  expiryStatus: "VALID" | "EXPIRING_SOON" | "EXPIRED";
  isEligible: boolean;
}

const LICENSE_CATEGORIES = ["LMV_TR", "MGV", "HMV"];
const DRIVER_STATUSES = ["AVAILABLE", "ON_TRIP", "OFF_DUTY", "SUSPENDED"];
// On Trip is only ever a side effect of a dispatched trip, never a manual
// pick — matches the backend's MANUALLY_SETTABLE_STATUSES guard.
const MANUALLY_SETTABLE_STATUSES = ["AVAILABLE", "OFF_DUTY", "SUSPENDED"];
const EXPIRY_FILTERS = ["VALID", "EXPIRING_SOON", "EXPIRED"];

type SortKey = "name" | "licenseExpiry" | "safetyScore";

// Same 3-tier bands as the backend's getExpiryStatus (driver.service.js) —
// past dates are allowed (deliberate data-entry choice), this just tells
// the user what they're about to save.
function formExpiryBadge(dateStr: string) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(dateStr);
  expiry.setHours(0, 0, 0, 0);
  const days = Math.round((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (days < 0) return { label: "Expired", cls: "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20" };
  if (days <= 30) return { label: "Expiring Soon", cls: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20" };
  return { label: "Valid", cls: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
}

function emptyForm() {
  return { name: "", licenseNumber: "", licenseCategory: "LMV_TR", licenseExpiry: "", contactNumber: "", email: "" };
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [validating, setValidating] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [expiryFilter, setExpiryFilter] = useState("All");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");
  const [form, setForm] = useState(emptyForm());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "All") params.append("status", statusFilter);
      if (categoryFilter !== "All") params.append("licenseCategory", categoryFilter);
      if (expiryFilter !== "All") params.append("expiryStatus", expiryFilter);
      if (search.trim()) params.append("search", search.trim());

      const res = await apiFetch(`/api/drivers?${params.toString()}`);
      if (res.success) setDrivers(res.data || []);
      else setError("Failed to retrieve drivers.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred while fetching drivers.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, expiryFilter, search]);

  useEffect(() => {
    const timer = setTimeout(fetchDrivers, 250);
    return () => clearTimeout(timer);
  }, [fetchDrivers]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setFieldErrors({});
    setModalError("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (driver: Driver) => {
    setEditingId(driver.id);
    setForm({
      name: driver.name,
      licenseNumber: driver.licenseNumber,
      licenseCategory: driver.licenseCategory,
      licenseExpiry: driver.licenseExpiry.split("T")[0],
      contactNumber: driver.contactNumber,
      email: driver.email || "",
    });
    setFieldErrors({});
    setModalError("");
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (!submitting) setIsModalOpen(false);
  };

  // Immediate per-field validation — this is what catches e.g. a phone
  // number typed into the Name field before the user even submits.
  const validateField = (field: string, value: string) => {
    let message: string | null = null;
    if (field === "name") message = validateDriverName(value);
    if (field === "contactNumber") message = validateContactNumber(value);
    if (field === "licenseNumber") message = validateLicenseNumber(value);
    if (field === "licenseExpiry") message = validateLicenseExpiry(value);
    if (field === "email") message = validateDriverEmail(value);
    setFieldErrors((prev) => ({ ...prev, [field]: message }));
    return message;
  };

  const handleFieldChange = (field: keyof ReturnType<typeof emptyForm>, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    validateField(field, value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");

    const errors = {
      name: validateField("name", form.name),
      contactNumber: validateField("contactNumber", form.contactNumber),
      licenseNumber: validateField("licenseNumber", form.licenseNumber),
      licenseExpiry: validateField("licenseExpiry", form.licenseExpiry),
      email: validateField("email", form.email),
    };
    if (Object.values(errors).some(Boolean)) {
      setModalError("Fix the highlighted fields before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = { ...form, licenseNumber: form.licenseNumber.trim().toUpperCase() };
      const res = await apiFetch(editingId ? `/api/drivers/${editingId}` : "/api/drivers", {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });

      if (res.success) {
        setIsModalOpen(false);
        toast.success(editingId ? "Driver profile updated." : "Driver registered successfully.");
        fetchDrivers();
      } else {
        setModalError(res.message || "Failed to save driver.");
      }
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (driverId: string, status: string) => {
    try {
      await apiFetch(`/api/drivers/${driverId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      toast.success(`Status updated to ${status.replace("_", " ")}.`);
      fetchDrivers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update status.");
    }
  };

  const handleDelete = async (driver: Driver) => {
    if (!window.confirm(`Remove ${driver.name} from the driver registry?`)) return;
    try {
      await apiFetch(`/api/drivers/${driver.id}`, { method: "DELETE" });
      toast.success(`${driver.name} removed from the registry.`);
      fetchDrivers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete driver.");
    }
  };

  const handleValidateNow = async () => {
    setValidating(true);
    try {
      const res = await apiFetch("/api/drivers/validate-licenses", { method: "POST" });
      fetchDrivers();
      if (res.success) toast.success(res.message);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to run license validation.");
    } finally {
      setValidating(false);
    }
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((prev) => !prev);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const sortedDrivers = [...drivers].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "name") cmp = a.name.localeCompare(b.name);
    if (sortKey === "licenseExpiry") cmp = new Date(a.licenseExpiry).getTime() - new Date(b.licenseExpiry).getTime();
    if (sortKey === "safetyScore") cmp = a.safetyScore - b.safetyScore;
    return sortAsc ? cmp : -cmp;
  });

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "AVAILABLE":
        return "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      case "ON_TRIP":
        return "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20";
      case "OFF_DUTY":
        return "text-zinc-600 dark:text-zinc-400 bg-zinc-500/10 border-zinc-500/20";
      case "SUSPENDED":
        return "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20";
      default:
        return "";
    }
  };

  const hasActiveFilters = Boolean(search.trim()) || statusFilter !== "All" || categoryFilter !== "All" || expiryFilter !== "All";

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">Drivers & Safety Profiles</h1>
          <p className="text-zinc-550 dark:text-zinc-400 mt-2">Manage driver compliance, license validity, and status.</p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-center">
          <button
            onClick={handleValidateNow}
            disabled={validating}
            className="flex items-center justify-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-850 text-zinc-700 dark:text-zinc-300 px-4 py-3 text-sm font-semibold transition-all disabled:opacity-50 cursor-pointer"
          >
            {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Validate Now
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 text-sm font-semibold shadow-[0_0_15px_rgba(37,99,235,0.2)] transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Add Driver
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-4 sm:p-6 backdrop-blur-sm shadow-sm transition-colors duration-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400 dark:text-zinc-500">
              <Search className="h-5 w-5" />
            </div>
            <input
              type="text"
              placeholder="Search by name or license no..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 pl-10 pr-3 py-3 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm transition-colors"
            />
          </div>

          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400 dark:text-zinc-500">
              <Filter className="h-5 w-5" />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 pl-10 pr-3 py-3 text-zinc-900 dark:text-white shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm transition-colors cursor-pointer"
            >
              <option value="All">All Statuses</option>
              {DRIVER_STATUSES.map((s) => (
                <option key={s} value={s}>{s.replace("_", " ")}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-3 text-zinc-900 dark:text-white shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm transition-colors cursor-pointer"
            >
              <option value="All">All Categories</option>
              {LICENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c.replace("_", "-")}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <select
              value={expiryFilter}
              onChange={(e) => setExpiryFilter(e.target.value)}
              className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-3 text-zinc-900 dark:text-white shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm transition-colors cursor-pointer"
            >
              <option value="All">All License Status</option>
              {EXPIRY_FILTERS.map((f) => (
                <option key={f} value={f}>{f.replace("_", " ")}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/20 p-6 backdrop-blur-sm transition-colors duration-200">
        {error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center max-w-md mx-auto">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 mb-4">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Could Not Load Drivers</h3>
            <p className="text-sm text-zinc-550 dark:text-zinc-400 mt-2">{error}</p>
            <button onClick={fetchDrivers} className="mt-6 rounded-xl bg-zinc-150 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer">
              Retry
            </button>
          </div>
        ) : !loading && sortedDrivers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 border border-blue-500/20 mb-4">
              <Users className="h-6 w-6" />
            </div>
            {hasActiveFilters ? (
              <>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">No Matching Drivers</h3>
                <p className="text-sm text-zinc-550 dark:text-zinc-400 mt-2">Try adjusting or clearing your search and filters.</p>
              </>
            ) : (
              <>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">No Drivers Yet</h3>
                <p className="text-sm text-zinc-550 dark:text-zinc-400 mt-2">Get started by registering your first driver profile.</p>
                <button
                  onClick={handleOpenAdd}
                  className="mt-6 flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 text-sm font-semibold shadow-[0_0_15px_rgba(37,99,235,0.2)] transition-all cursor-pointer"
                >
                  <Plus className="h-4 w-4" /> Add Your First Driver
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm text-zinc-500 dark:text-zinc-400 border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-300 font-medium">
                  <th className="py-3 px-4 cursor-pointer select-none" onClick={() => toggleSort("name")}>
                    <span className="flex items-center gap-1">Driver <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                  <th className="py-3 px-4">License No</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 cursor-pointer select-none" onClick={() => toggleSort("licenseExpiry")}>
                    <span className="flex items-center gap-1">Expiry <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4 cursor-pointer select-none" onClick={() => toggleSort("safetyScore")}>
                    <span className="flex items-center gap-1">Safety <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/65 dark:divide-zinc-800/40">
                {loading ? (
                  <TableSkeleton rows={5} columns={8} />
                ) : (
                  sortedDrivers.map((driver) => (
                    <tr key={driver.id} className="hover:bg-zinc-100 dark:hover:bg-zinc-800/10 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-zinc-900 dark:text-white">
                        <Link href={`/dashboard/safety-officer/driver/${driver.id}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                          {driver.name}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-zinc-750 dark:text-zinc-300">{driver.licenseNumber}</td>
                      <td className="py-3.5 px-4">{driver.licenseCategory.replace("_", "-")}</td>
                      <td className="py-3.5 px-4">
                        <ExpiryCountdown expiry={driver.licenseExpiry} />
                      </td>
                      <td className="py-3.5 px-4 font-mono">{driver.contactNumber}</td>
                      <td className="py-3.5 px-4 text-zinc-900 dark:text-white font-medium">{driver.safetyScore.toFixed(1)}</td>
                      <td className="py-3.5 px-4">
                        {driver.status === "ON_TRIP" ? (
                          <span
                            title="On a dispatched trip — status changes only when the trip is completed or cancelled."
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold cursor-not-allowed ${getStatusBadgeClass(driver.status)}`}
                          >
                            ON TRIP
                          </span>
                        ) : (
                          <select
                            value={driver.status}
                            onChange={(e) => handleStatusChange(driver.id, e.target.value)}
                            className={`rounded-full border px-2.5 py-1 text-xs font-semibold bg-transparent cursor-pointer focus:outline-none ${getStatusBadgeClass(driver.status)}`}
                          >
                            {MANUALLY_SETTABLE_STATUSES.map((s) => (
                              <option key={s} value={s} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">
                                {s.replace("_", " ")}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <Link href={`/dashboard/safety-officer/driver/${driver.id}`} className="p-1.5 rounded-lg text-zinc-500 hover:text-blue-600 hover:bg-blue-500/10 transition-colors cursor-pointer" aria-label="View driver">
                            <Eye className="h-4 w-4" />
                          </Link>
                          <button onClick={() => handleOpenEdit(driver)} className="p-1.5 rounded-lg text-zinc-500 hover:text-blue-600 hover:bg-blue-500/10 transition-colors cursor-pointer" aria-label="Edit driver">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDelete(driver)} className="p-1.5 rounded-lg text-zinc-500 hover:text-red-600 hover:bg-red-500/10 transition-colors cursor-pointer" aria-label="Delete driver">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300">
          <div className="absolute inset-0 cursor-default" onClick={handleCloseModal} />
          <div className="relative w-full max-w-xl rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 sm:p-8 shadow-2xl backdrop-blur-xl transition-all duration-200 transform scale-100 z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-500 border border-blue-500/20">
                  {editingId ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white">{editingId ? "Edit Driver Profile" : "Add New Driver"}</h3>
                  <p className="text-xs text-zinc-550 dark:text-zinc-400 mt-0.5">New drivers start with AVAILABLE status.</p>
                </div>
              </div>
              <button onClick={handleCloseModal} disabled={submitting} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 cursor-pointer" aria-label="Close modal">
                <X className="h-5 w-5" />
              </button>
            </div>

            {modalError && (
              <div className="mt-4 flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
                <p className="font-medium">{modalError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Driver Name</label>
                  <input
                    type="text"
                    required
                    disabled={submitting}
                    placeholder="e.g. Alex Menon"
                    value={form.name}
                    onChange={(e) => handleFieldChange("name", e.target.value)}
                    className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-3 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm transition-colors"
                  />
                  {fieldErrors.name && <p className="text-xs text-red-500 font-medium">{fieldErrors.name}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">License Number</label>
                  <input
                    type="text"
                    required
                    disabled={submitting}
                    placeholder="e.g. GJ0520230012345"
                    value={form.licenseNumber}
                    onChange={(e) => handleFieldChange("licenseNumber", e.target.value)}
                    className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-3 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm transition-colors uppercase"
                  />
                  {fieldErrors.licenseNumber && <p className="text-xs text-red-500 font-medium">{fieldErrors.licenseNumber}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">License Category</label>
                  <select
                    disabled={submitting}
                    value={form.licenseCategory}
                    onChange={(e) => handleFieldChange("licenseCategory", e.target.value)}
                    className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-3 text-zinc-900 dark:text-white shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm transition-colors cursor-pointer"
                  >
                    {LICENSE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c.replace("_", "-")}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    License Expiry Date
                    {(() => {
                      const badge = formExpiryBadge(form.licenseExpiry);
                      return badge ? (
                        <span className={`normal-case rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badge.cls}`}>{badge.label}</span>
                      ) : null;
                    })()}
                  </label>
                  <input
                    type="date"
                    required
                    disabled={submitting}
                    value={form.licenseExpiry}
                    onChange={(e) => handleFieldChange("licenseExpiry", e.target.value)}
                    className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-3 text-zinc-900 dark:text-white shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm transition-colors cursor-pointer"
                  />
                  {fieldErrors.licenseExpiry && <p className="text-xs text-red-500 font-medium">{fieldErrors.licenseExpiry}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Contact Number</label>
                  <input
                    type="tel"
                    required
                    disabled={submitting}
                    placeholder="e.g. 9876543210"
                    value={form.contactNumber}
                    onChange={(e) => handleFieldChange("contactNumber", e.target.value)}
                    className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-3 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm transition-colors"
                  />
                  {fieldErrors.contactNumber && <p className="text-xs text-red-500 font-medium">{fieldErrors.contactNumber}</p>}
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    <Mail className="h-3.5 w-3.5" /> Email Address
                  </label>
                  <input
                    type="email"
                    required
                    disabled={submitting}
                    placeholder="e.g. alex.menon@example.com"
                    value={form.email}
                    onChange={(e) => handleFieldChange("email", e.target.value)}
                    className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-3 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm transition-colors"
                  />
                  {fieldErrors.email && <p className="text-xs text-red-500 font-medium">{fieldErrors.email}</p>}
                  <p className="text-[11px] text-zinc-450 dark:text-zinc-500">Used to send license-renewal reminders (expiry within 5 days, or immediately if already expired).</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 border-t border-zinc-200 dark:border-zinc-800 mt-6">
                <button type="button" onClick={handleCloseModal} disabled={submitting} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-850 px-5 py-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300 transition-colors disabled:opacity-50 cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 text-sm font-semibold shadow-[0_0_15px_rgba(37,99,235,0.2)] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                    </>
                  ) : editingId ? "Save Changes" : "Register Driver"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
