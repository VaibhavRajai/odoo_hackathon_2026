"use client";

import React, { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { apiFetch } from "../../../../api-client";
import { Search, Filter, AlertCircle, MapPin, Route } from "lucide-react";
import type { MappableTrip } from "./trip-map";

const TripMap = dynamic(() => import("./trip-map"), { ssr: false });

interface Trip extends MappableTrip {
  cargoWeight: number;
  plannedDistance: number;
}

const TRIP_STATUSES = ["DRAFT", "DISPATCHED", "COMPLETED", "CANCELLED"];

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "text-zinc-600 dark:text-zinc-400 bg-zinc-500/10 border-zinc-500/20",
  DISPATCHED: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
  COMPLETED: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  CANCELLED: "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20",
};

export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "All") params.append("status", statusFilter);
      const res = await apiFetch(`/api/trips?${params.toString()}`);
      if (res.success) setTrips(res.data || []);
      else setError("Failed to retrieve trips.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred while fetching trips.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchTrips, 0);
    return () => clearTimeout(timer);
  }, [fetchTrips]);

  const filtered = trips.filter((t) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      t.source.toLowerCase().includes(q) ||
      t.destination.toLowerCase().includes(q) ||
      t.driver.name.toLowerCase().includes(q) ||
      t.vehicle.registrationNumber.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">Trips</h1>
        <p className="text-zinc-550 dark:text-zinc-400 mt-2">Read-only view of driver activity. Dispatch and trip creation belong to the Dispatcher.</p>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-4 sm:p-6 backdrop-blur-sm shadow-sm transition-colors duration-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400 dark:text-zinc-500">
              <Search className="h-5 w-5" />
            </div>
            <input
              type="text"
              placeholder="Search by driver, vehicle, or location..."
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
              {TRIP_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center max-w-md mx-auto">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 mb-4">
            <AlertCircle className="h-6 w-6" />
          </div>
          <p className="text-sm text-zinc-550 dark:text-zinc-400 mt-2">{error}</p>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse">
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900/40 h-105" />
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/20 p-4 space-y-3 h-105">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800" />
            ))}
          </div>
        </div>
      ) : trips.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/20 py-16 flex flex-col items-center justify-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 border border-blue-500/20 mb-4">
            <Route className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white">No Trips Yet</h3>
          <p className="text-sm text-zinc-550 dark:text-zinc-400 mt-2 max-w-sm">Trips created and dispatched by the Dispatcher will show up here for tracking.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Live Map */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/20 p-3 backdrop-blur-sm h-105">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <MapPin className="h-8 w-8 text-zinc-400 mb-3" />
                <p className="text-sm text-zinc-550 dark:text-zinc-400">No trips match your search/filter.</p>
              </div>
            ) : (
              <TripMap trips={filtered} selectedDriverId={selectedDriverId} />
            )}
          </div>

          {/* Trip Table */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/20 p-4 backdrop-blur-sm overflow-y-auto max-h-105">
            {selectedDriverId && (
              <div className="flex items-center justify-between mb-3 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  Showing trips for selected driver
                </span>
                <button
                  onClick={() => setSelectedDriverId(null)}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 underline cursor-pointer"
                >
                  Show all
                </button>
              </div>
            )}
            <table className="w-full text-left text-sm text-zinc-500 dark:text-zinc-400 border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-300 font-medium">
                  <th className="py-3 px-3">Route</th>
                  <th className="py-3 px-3">Driver</th>
                  <th className="py-3 px-3">Vehicle</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/65 dark:divide-zinc-800/40">
                {filtered.map((trip) => {
                  const isSelected = selectedDriverId === trip.driver.id;
                  return (
                    <tr
                      key={trip.id}
                      onClick={() => setSelectedDriverId(isSelected ? null : trip.driver.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-blue-50 dark:bg-blue-950/30 ring-1 ring-blue-400/50"
                          : "hover:bg-zinc-100 dark:hover:bg-zinc-800/10"
                      }`}
                    >
                      <td className="py-3 px-3 text-zinc-900 dark:text-white font-medium">{trip.source} &rarr; {trip.destination}</td>
                      <td className="py-3 px-3">{trip.driver.name}</td>
                      <td className="py-3 px-3 font-mono">{trip.vehicle.registrationNumber}</td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[trip.status]}`}>
                          {trip.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-zinc-500 dark:text-zinc-400">No matching trips.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
