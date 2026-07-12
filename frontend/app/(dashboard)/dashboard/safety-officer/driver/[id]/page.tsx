"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { apiFetch } from "../../../../../api-client";
import ExpiryCountdown from "../../expiry-countdown";
import {
  ArrowLeft,
  Phone,
  Mail,
  IdCard,
  CalendarClock,
  ShieldCheck,
  MapPin,
  AlertCircle,
} from "lucide-react";

const TripMap = dynamic(() => import("../../trips/trip-map"), { ssr: false });

interface Driver {
  id: string;
  name: string;
  licenseNumber: string;
  licenseCategory: "LMV_TR" | "MGV" | "HMV";
  licenseExpiry: string;
  contactNumber: string;
  email: string | null;
  safetyScore: number;
  safetyRatingCount: number;
  status: "AVAILABLE" | "ON_TRIP" | "OFF_DUTY" | "SUSPENDED";
  expiryStatus: "VALID" | "EXPIRING_SOON" | "EXPIRED";
  isEligible: boolean;
}

interface Trip {
  id: string;
  source: string;
  destination: string;
  status: string;
  cargoWeight: number;
  plannedDistance: number;
  driver: { id: string; name: string };
  vehicle: { registrationNumber: string; name: string };
}

const STATUS_BADGE: Record<string, string> = {
  AVAILABLE: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  ON_TRIP: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
  OFF_DUTY: "text-zinc-600 dark:text-zinc-400 bg-zinc-500/10 border-zinc-500/20",
  SUSPENDED: "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20",
};

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function DriverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch(`/api/drivers/${id}`);
      if (!res.success) throw new Error("Driver not found.");
      setDriver(res.data);

      const tripsRes = await apiFetch(`/api/trips?driverId=${id}&status=DISPATCHED`);
      if (tripsRes.success && tripsRes.data.length > 0) setActiveTrip(tripsRes.data[0]);
      else setActiveTrip(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load driver.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto animate-pulse">
        <div className="h-5 w-32 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 overflow-hidden">
          <div className="h-40 bg-zinc-200 dark:bg-zinc-800" />
          <div className="p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800/60" />
            ))}
          </div>
        </div>
        <div className="h-32 rounded-2xl bg-zinc-100 dark:bg-zinc-800/60" />
      </div>
    );
  }

  if (error || !driver) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center max-w-md mx-auto">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 mb-4">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Could Not Load Driver</h3>
        <p className="text-sm text-zinc-550 dark:text-zinc-400 mt-2">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <button
        onClick={() => router.push("/dashboard/safety-officer/drivers")}
        className="flex items-center gap-2 text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Drivers
      </button>

      {/* ID Card */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 backdrop-blur-sm shadow-sm overflow-hidden">
        <div className="bg-linear-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-900 px-6 sm:px-8 py-8 flex flex-col sm:flex-row items-center sm:items-end gap-5 text-white">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-white/15 border-2 border-white/30 text-3xl font-bold backdrop-blur-sm">
            {initials(driver.name)}
          </div>
          <div className="text-center sm:text-left">
            <h1 className="text-2xl font-extrabold tracking-tight">{driver.name}</h1>
            <p className="text-blue-100 text-sm font-medium mt-1">{driver.licenseCategory.replace("_", "-")} License Holder</p>
          </div>
          <div className="sm:ml-auto flex flex-col items-center sm:items-end gap-2">
            <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${STATUS_BADGE[driver.status]}`}>
              {driver.status.replace("_", " ")}
            </span>
          </div>
        </div>

        <div className="p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-1">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              <IdCard className="h-3.5 w-3.5" /> License Number
            </span>
            <p className="font-mono font-semibold text-zinc-900 dark:text-white">{driver.licenseNumber}</p>
          </div>

          <div className="space-y-1">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              <CalendarClock className="h-3.5 w-3.5" /> License Expiry
            </span>
            <ExpiryCountdown expiry={driver.licenseExpiry} />
          </div>

          <div className="space-y-1">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              <Phone className="h-3.5 w-3.5" /> Contact Number
            </span>
            <p className="font-mono font-semibold text-zinc-900 dark:text-white">{driver.contactNumber}</p>
          </div>

          <div className="space-y-1">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              <Mail className="h-3.5 w-3.5" /> Email Address
            </span>
            <p className="font-semibold text-zinc-900 dark:text-white">{driver.email || "—"}</p>
          </div>

          <div className="space-y-1">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              <ShieldCheck className="h-3.5 w-3.5" /> Safety Score
            </span>
            <p className="font-semibold text-zinc-900 dark:text-white">
              {driver.safetyScore.toFixed(1)} / 5{" "}
              <span className="text-zinc-500 dark:text-zinc-400 font-normal text-sm">({driver.safetyRatingCount} trip{driver.safetyRatingCount === 1 ? "" : "s"} rated)</span>
            </p>
          </div>

          <div className="space-y-1 sm:col-span-2">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Dispatch Eligibility</span>
            <p className={`font-semibold ${driver.isEligible ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
              {driver.isEligible ? "Eligible for trip assignment" : "Blocked — suspended or expired license"}
            </p>
          </div>
        </div>
      </div>

      {/* Current Trip */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/20 p-6 backdrop-blur-sm">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-blue-500" /> Current Trip
        </h2>
        {activeTrip ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-zinc-500 dark:text-zinc-400">Route</span>
              <p className="font-semibold text-zinc-900 dark:text-white">{activeTrip.source} &rarr; {activeTrip.destination}</p>
            </div>
            <div>
              <span className="text-zinc-500 dark:text-zinc-400">Vehicle</span>
              <p className="font-semibold text-zinc-900 dark:text-white">{activeTrip.vehicle.name} ({activeTrip.vehicle.registrationNumber})</p>
            </div>
            <div>
              <span className="text-zinc-500 dark:text-zinc-400">Cargo Weight</span>
              <p className="font-semibold text-zinc-900 dark:text-white">{activeTrip.cargoWeight} kg</p>
            </div>
            <div>
              <span className="text-zinc-500 dark:text-zinc-400">Planned Distance</span>
              <p className="font-semibold text-zinc-900 dark:text-white">{activeTrip.plannedDistance} km</p>
            </div>
            <div className="sm:col-span-2 h-72 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
              <TripMap trips={[activeTrip]} />
            </div>
          </div>
        ) : (
          <p className="text-sm text-zinc-550 dark:text-zinc-400">Not currently on a dispatched trip.</p>
        )}
      </div>
    </div>
  );
}
