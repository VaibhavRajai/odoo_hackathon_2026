"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../../api-client";
import { Navigation, PackageCheck, XCircle, Users, Truck, MapPin, Plus, Loader2 } from "lucide-react";

interface Trip {
  id: string;
  source: string;
  destination: string;
  status: "DRAFT" | "DISPATCHED" | "COMPLETED" | "CANCELLED";
  createdAt: string;
  vehicle: { registrationNumber: string; name: string };
  driver: { name: string };
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "text-zinc-550 dark:text-zinc-500 bg-zinc-500/10 border-zinc-500/20",
  DISPATCHED: "text-blue-600 dark:text-blue-450 bg-blue-500/10 border-blue-500/20",
  COMPLETED: "text-emerald-600 dark:text-emerald-450 bg-emerald-500/10 border-emerald-500/20",
  CANCELLED: "text-red-600 dark:text-red-450 bg-red-500/10 border-red-500/20",
};

export default function DispatcherDashboard() {
  const [name, setName] = useState("");
  const [trips, setTrips] = useState<Trip[]>([]);
  const [availableDrivers, setAvailableDrivers] = useState(0);
  const [availableVehicles, setAvailableVehicles] = useState(0);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, tripsRes, driversRes, vehiclesRes] = await Promise.all([
        apiFetch("/api/auth/me"),
        apiFetch("/api/trips"),
        apiFetch("/api/drivers/available"),
        apiFetch("/api/vehicles?status=AVAILABLE&limit=1000"),
      ]);
      if (meRes.success) setName(meRes.data.name);
      setTrips(tripsRes.data || []);
      setAvailableDrivers((driversRes.data || []).length);
      setAvailableVehicles((vehiclesRes.data || []).length);
    } catch {
      // Handled by layout redirection / inline empty states below
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setTimeout(loadDashboard, 0);
  }, [loadDashboard]);

  const counts = {
    draft: trips.filter((t) => t.status === "DRAFT").length,
    dispatched: trips.filter((t) => t.status === "DISPATCHED").length,
    completed: trips.filter((t) => t.status === "COMPLETED").length,
    cancelled: trips.filter((t) => t.status === "CANCELLED").length,
  };

  const recentTrips = trips.slice(0, 6);

  const formatDateTime = (d: string) =>
    new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">Dispatcher Control Console</h1>
          <p className="text-zinc-550 dark:text-zinc-400 mt-2">Welcome back, {name || "Dispatcher"}. Manage active trips and dispatches.</p>
        </div>
        <button
          onClick={() => router.push("/dispatch/create")}
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 text-sm font-semibold shadow-[0_0_15px_rgba(37,99,235,0.2)] transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer self-start sm:self-center"
        >
          <Plus className="h-4 w-4" /> Create Trip
        </button>
      </div>

      {/* KPI blocks — real trip/driver/vehicle counts */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Draft Trips", value: loading ? "—" : counts.draft, sub: "Awaiting dispatch", icon: Navigation, color: "text-zinc-600 dark:text-zinc-400 bg-zinc-500/10 border-zinc-500/20" },
          { label: "Dispatched", value: loading ? "—" : counts.dispatched, sub: "Currently in transit", icon: Truck, color: "text-blue-600 dark:text-blue-500 bg-blue-500/10 border-blue-500/20" },
          { label: "Completed", value: loading ? "—" : counts.completed, sub: "Total completed trips", icon: PackageCheck, color: "text-emerald-600 dark:text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
          { label: "Cancelled", value: loading ? "—" : counts.cancelled, sub: "Total cancelled trips", icon: XCircle, color: "text-red-600 dark:text-red-500 bg-red-500/10 border-red-500/20" },
        ].map((item, idx) => (
          <div key={idx} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-6 backdrop-blur-sm shadow-sm transition-colors duration-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{item.label}</span>
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${item.color}`}>
                <item.icon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-xl font-bold text-zinc-900 dark:text-white">{item.value}</span>
              <span className="block text-xs text-zinc-550 dark:text-zinc-500 mt-1">{item.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Resource availability */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-6 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Available Drivers</span>
            <div className="text-xl font-bold text-zinc-900 dark:text-white mt-1">{loading ? "—" : availableDrivers}</div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border text-purple-600 dark:text-purple-500 bg-purple-500/10 border-purple-500/20">
            <Users className="h-5 w-5" />
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-6 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Available Vehicles</span>
            <div className="text-xl font-bold text-zinc-900 dark:text-white mt-1">{loading ? "—" : availableVehicles}</div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border text-amber-600 dark:text-amber-500 bg-amber-500/10 border-amber-500/20">
            <MapPin className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Recent trips */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/20 p-6 backdrop-blur-sm transition-colors duration-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Recent Trips</h2>
          <button
            onClick={() => router.push("/dispatch")}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          >
            View Dispatch Board
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        ) : recentTrips.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-8">No trips created yet.</p>
        ) : (
          <div className="space-y-3">
            {recentTrips.map((trip) => (
              <div key={trip.id} className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 transition-colors">
                <div>
                  <div className="font-semibold text-zinc-900 dark:text-white text-sm">{trip.source} → {trip.destination}</div>
                  <span className="text-xs text-zinc-550">
                    {trip.vehicle.registrationNumber} · {trip.driver.name} · {formatDateTime(trip.createdAt)}
                  </span>
                </div>
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold shrink-0 ml-3 ${STATUS_STYLES[trip.status]}`}>
                  {trip.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
