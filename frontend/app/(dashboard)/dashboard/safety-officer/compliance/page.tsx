"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { apiFetch } from "../../../../api-client";
import ExpiryCountdown from "../expiry-countdown";
import { ShieldCheck, AlertTriangle, ShieldX, Ban } from "lucide-react";

interface Driver {
  id: string;
  name: string;
  licenseCategory: "LMV_TR" | "MGV" | "HMV";
  licenseExpiry: string;
  safetyScore: number;
  status: string;
  expiryStatus: "VALID" | "EXPIRING_SOON" | "EXPIRED";
}

const TIERS = [
  { key: "compliant", label: "Compliant", icon: ShieldCheck, accent: "border-emerald-500/30 bg-emerald-500/5", badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  { key: "expiringSoon", label: "Expiring Soon", icon: AlertTriangle, accent: "border-amber-500/30 bg-amber-500/5", badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  { key: "nonCompliant", label: "Non-Compliant", icon: ShieldX, accent: "border-red-500/30 bg-red-500/5", badge: "bg-red-500/10 text-red-600 dark:text-red-400" },
  { key: "suspended", label: "Suspended", icon: Ban, accent: "border-zinc-500/30 bg-zinc-500/5", badge: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400" },
] as const;

function groupByTier(drivers: Driver[]) {
  const groups: Record<string, Driver[]> = { compliant: [], expiringSoon: [], nonCompliant: [], suspended: [] };
  for (const d of drivers) {
    if (d.status === "SUSPENDED") groups.suspended.push(d);
    else if (d.expiryStatus === "EXPIRED") groups.nonCompliant.push(d);
    else if (d.expiryStatus === "EXPIRING_SOON") groups.expiringSoon.push(d);
    else groups.compliant.push(d);
  }
  return groups;
}

export default function CompliancePage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/drivers");
      if (res.success) setDrivers(res.data || []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load compliance data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const groups = groupByTier(drivers);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">Compliance</h1>
        <p className="text-zinc-550 dark:text-zinc-400 mt-2">Drivers grouped by risk tier — a faster read than a flat table.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {TIERS.map((tier) => {
          const items = groups[tier.key];
          return (
            <div key={tier.key} className={`rounded-2xl border p-4 space-y-3 ${tier.accent}`}>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-white">
                  <tier.icon className="h-4 w-4" /> {tier.label}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${tier.badge}`}>{items.length}</span>
              </div>

              <div className="space-y-2 min-h-20">
                {loading ? (
                  <div className="animate-pulse space-y-2">
                    <div className="h-16 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
                    <div className="h-16 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
                  </div>
                ) : items.length === 0 ? (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 py-4 text-center">No drivers in this tier.</p>
                ) : (
                  items.map((d) => (
                    <Link
                      key={d.id}
                      href={`/dashboard/safety-officer/driver/${d.id}`}
                      className="block rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-3 hover:border-blue-300 dark:hover:border-blue-800 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-zinc-900 dark:text-white">{d.name}</span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">{d.licenseCategory.replace("_", "-")}</span>
                      </div>
                      <div className="mt-2">
                        <ExpiryCountdown expiry={d.licenseExpiry} />
                      </div>
                      <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">Safety score: {d.safetyScore.toFixed(1)}</p>
                    </Link>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
