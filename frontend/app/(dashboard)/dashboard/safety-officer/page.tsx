"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { apiFetch } from "../../../api-client";
import { CardSkeletonRow, ChartSkeleton } from "./skeletons";
import {
  Users,
  ShieldCheck,
  AlertTriangle,
  Ban,
  Filter,
  Trophy,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface Stats {
  totalDrivers: number;
  available: number;
  onTrip: number;
  offDuty: number;
  suspended: number;
  licenseValid: number;
  licenseExpiringSoon: number;
  licenseExpired: number;
}

interface Driver {
  id: string;
  name: string;
  licenseExpiry: string;
  expiryStatus: "VALID" | "EXPIRING_SOON" | "EXPIRED";
  status: string;
  safetyScore?: number;
  safetyRatingCount?: number;
}

const RANK_MEDALS = ["🥇", "🥈", "🥉"];

const DRIVER_STATUSES = ["AVAILABLE", "ON_TRIP", "OFF_DUTY", "SUSPENDED"];
const LICENSE_CATEGORIES = ["LMV_TR", "MGV", "HMV"];

const EXPIRY_COLORS: Record<string, string> = {
  VALID: "#10b981",
  EXPIRING_SOON: "#f59e0b",
  EXPIRED: "#ef4444",
};

export default function SafetyOfficerDashboard() {
  const [name, setName] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [watchlist, setWatchlist] = useState<Driver[]>([]);
  const [watchlistLoading, setWatchlistLoading] = useState(true);

  const [leaderboard, setLeaderboard] = useState<Driver[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await apiFetch("/api/auth/me");
        if (res.success) setName(res.data.name);
      } catch {
        // Handled by layout redirection
      }
    }
    loadUser();
  }, []);

  useEffect(() => {
    async function loadStats() {
      setStatsLoading(true);
      try {
        const res = await apiFetch("/api/drivers/stats");
        if (res.success) setStats(res.data);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed to load dashboard stats.");
      } finally {
        setStatsLoading(false);
      }
    }
    const timer = setTimeout(loadStats, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    async function loadLeaderboard() {
      setLeaderboardLoading(true);
      try {
        const res = await apiFetch("/api/drivers");
        if (res.success) {
          const sorted = [...res.data].sort((a: Driver, b: Driver) => (b.safetyScore ?? 0) - (a.safetyScore ?? 0));
          setLeaderboard(sorted.slice(0, 5));
        }
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed to load safety leaderboard.");
      } finally {
        setLeaderboardLoading(false);
      }
    }
    const timer = setTimeout(loadLeaderboard, 0);
    return () => clearTimeout(timer);
  }, []);

  const loadWatchlist = useCallback(async () => {
    setWatchlistLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "All") params.append("status", statusFilter);
      if (categoryFilter !== "All") params.append("licenseCategory", categoryFilter);
      const res = await apiFetch(`/api/drivers?${params.toString()}`);
      if (res.success) {
        const sorted = [...res.data].sort(
          (a: Driver, b: Driver) => new Date(a.licenseExpiry).getTime() - new Date(b.licenseExpiry).getTime()
        );
        setWatchlist(sorted.slice(0, 6));
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load expiry watchlist.");
      setWatchlist([]);
    } finally {
      setWatchlistLoading(false);
    }
  }, [statusFilter, categoryFilter]);

  useEffect(() => {
    const timer = setTimeout(loadWatchlist, 250);
    return () => clearTimeout(timer);
  }, [loadWatchlist]);

  const cards = stats
    ? [
        { label: "Total Drivers", value: stats.totalDrivers, icon: Users, color: "text-blue-600 dark:text-blue-500 bg-blue-500/10 border-blue-500/20" },
        { label: "Available", value: stats.available, icon: ShieldCheck, color: "text-emerald-600 dark:text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
        { label: "Expiring Soon", value: stats.licenseExpiringSoon, icon: AlertTriangle, color: "text-amber-600 dark:text-amber-500 bg-amber-500/10 border-amber-500/20" },
        { label: "Suspended", value: stats.suspended, icon: Ban, color: "text-red-600 dark:text-red-500 bg-red-500/10 border-red-500/20" },
      ]
    : [];

  const statusChartData = stats
    ? [
        { name: "Available", value: stats.available },
        { name: "On Trip", value: stats.onTrip },
        { name: "Off Duty", value: stats.offDuty },
        { name: "Suspended", value: stats.suspended },
      ]
    : [];

  const expiryChartData = stats
    ? [
        { name: "Valid", value: stats.licenseValid, key: "VALID" },
        { name: "Expiring Soon", value: stats.licenseExpiringSoon, key: "EXPIRING_SOON" },
        { name: "Expired", value: stats.licenseExpired, key: "EXPIRED" },
      ]
    : [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">Safety & Compliance Hub</h1>
        <p className="text-zinc-550 dark:text-zinc-400 mt-2">Welcome back, {name || "Officer"}. Monitor driver compliance and license validity.</p>
      </div>

      {/* KPI cards */}
      {statsLoading ? (
        <CardSkeletonRow count={4} />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((item, idx) => (
            <div key={idx} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-6 backdrop-blur-sm shadow-sm transition-colors duration-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{item.label}</span>
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${item.color}`}>
                  <item.icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-2xl font-bold text-zinc-900 dark:text-white">{item.value}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Charts */}
      {statsLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/20 p-6 backdrop-blur-sm">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">Driver Status Distribution</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusChartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#4169e1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/20 p-6 backdrop-blur-sm">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">License Validity Breakdown</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={expiryChartData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {expiryChartData.map((entry) => (
                      <Cell key={entry.key} fill={EXPIRY_COLORS[entry.key]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Safety Score Leaderboard */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/20 p-6 backdrop-blur-sm transition-colors duration-200">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" /> Safety Score Leaderboard
        </h2>
        {leaderboardLoading ? (
          <div className="space-y-2 animate-pulse">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800" />
            ))}
          </div>
        ) : leaderboard.length === 0 ? (
          <p className="text-sm text-zinc-550 dark:text-zinc-400 py-4">No rated trips yet — scores appear once the Dispatcher rates completed trips.</p>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((d, idx) => (
              <Link
                key={d.id}
                href={`/dashboard/safety-officer/driver/${d.id}`}
                className="flex items-center gap-4 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 hover:border-blue-300 dark:hover:border-blue-800 transition-colors text-sm"
              >
                <span className="w-6 text-center text-base">{RANK_MEDALS[idx] || `#${idx + 1}`}</span>
                <span className="flex-1 font-semibold text-zinc-900 dark:text-white">{d.name}</span>
                <div className="hidden sm:block w-32 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-linear-to-r from-amber-500 to-emerald-500"
                    style={{ width: `${((d.safetyScore ?? 0) / 5) * 100}%` }}
                  />
                </div>
                <span className="font-bold text-zinc-900 dark:text-white w-12 text-right">{(d.safetyScore ?? 0).toFixed(1)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Expiry Watchlist */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/20 p-6 backdrop-blur-sm transition-colors duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">License Expiry Watchlist</h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-zinc-400">
                <Filter className="h-4 w-4" />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 pl-8 pr-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="All">All Statuses</option>
                {DRIVER_STATUSES.map((s) => (
                  <option key={s} value={s}>{s.replace("_", " ")}</option>
                ))}
              </select>
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="All">All Categories</option>
              {LICENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c.replace("_", "-")}</option>
              ))}
            </select>
          </div>
        </div>

        {watchlistLoading ? (
          <div className="space-y-2 animate-pulse">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800" />
            ))}
          </div>
        ) : watchlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <ShieldCheck className="h-8 w-8 text-emerald-500 mb-2" />
            <p className="text-sm text-zinc-550 dark:text-zinc-400">No drivers match the current filters — all clear here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {watchlist.map((d) => (
              <Link
                key={d.id}
                href={`/dashboard/safety-officer/driver/${d.id}`}
                className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 hover:border-blue-300 dark:hover:border-blue-800 transition-colors text-sm"
              >
                <span className="font-semibold text-zinc-900 dark:text-white">{d.name}</span>
                <span
                  className="rounded-full border px-2.5 py-0.5 text-xs font-semibold"
                  style={{
                    color: EXPIRY_COLORS[d.expiryStatus],
                    borderColor: `${EXPIRY_COLORS[d.expiryStatus]}33`,
                    backgroundColor: `${EXPIRY_COLORS[d.expiryStatus]}1a`,
                  }}
                >
                  {new Date(d.licenseExpiry).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
