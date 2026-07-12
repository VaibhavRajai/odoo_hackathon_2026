"use client";

import React, { useEffect, useState } from "react";
import { apiFetch } from "../../../api-client";
import { Truck, Wrench, ChevronRight, Settings } from "lucide-react";

export default function FleetManagerOverview() {
  const [userName, setUserName] = useState("");

  useEffect(() => {
    apiFetch("/api/auth/me")
      .then((res) => res.success && setUserName(res.data.name))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Welcome header */}
      <div>
        <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
          Fleet Management Center
        </h1>
        <p className="text-zinc-550 dark:text-zinc-400 mt-2">
          Welcome back, {userName || "Manager"}. Select a module below to manage fleet operations.
        </p>
      </div>

      {/* Navigation cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Vehicle Registry Card */}
        <a
          href="/dashboard/fleet-manager/vehicles"
          className="group rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-6 backdrop-blur-sm shadow-sm transition-all duration-200 hover:shadow-md hover:border-blue-500/50 dark:hover:border-blue-500/30 flex flex-col justify-between h-48"
        >
          <div className="flex items-start justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-500">
              <Truck className="h-6 w-6" />
            </div>
            <ChevronRight className="h-5 w-5 text-zinc-400 group-hover:text-blue-550 group-hover:translate-x-1 transition-all" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white group-hover:text-blue-550 transition-colors">
              Vehicle Registry
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Add new commercial vehicles, view details, track registration numbers, and manage lifecycle statuses.
            </p>
          </div>
        </a>

        {/* Maintenance Logs Card */}
        <a
          href="/dashboard/fleet-manager/maintenance"
          className="group rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-6 backdrop-blur-sm shadow-sm transition-all duration-200 hover:shadow-md hover:border-amber-500/50 dark:hover:border-amber-500/30 flex flex-col justify-between h-48"
        >
          <div className="flex items-start justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-500">
              <Wrench className="h-6 w-6" />
            </div>
            <ChevronRight className="h-5 w-5 text-zinc-400 group-hover:text-amber-550 group-hover:translate-x-1 transition-all" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white group-hover:text-amber-550 transition-colors">
              Maintenance Logs
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Schedule repair logs, track active work orders, audit completed repairs, and transition vehicles back to service.
            </p>
          </div>
        </a>
      </div>
    </div>
  );
}
