"use client";

import React, { useEffect, useState } from "react";
import { apiFetch } from "../../../api-client";
import { Navigation, Clock, ShieldAlert, Award } from "lucide-react";

export default function DriverDashboard() {
  const [name, setName] = useState("");

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await apiFetch("/api/auth/me");
        if (res.success) {
          setName(res.data.name);
        }
      } catch {
        // Handled by layout redirection
      }
    }
    loadUser();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Clean Enterprise Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-gray-200 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">
            Driver Control Console
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
            Welcome back, {name || "Driver"}. Drive safely and log your hours.
          </p>
        </div>
      </div>

      {/* Driver status blocks - Clean Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Assigned Vehicle", value: "Transit Bus VT-902", change: "Route A-10", icon: Navigation, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10" },
          { label: "Active Shift Time", value: "3h 45m", change: "Ends in 4h 15m", icon: Clock, color: "text-gray-700 dark:text-zinc-300", bg: "bg-gray-100 dark:bg-zinc-800" },
          { label: "Safety Alerts", value: "0 Active", change: "System reports all clear", icon: ShieldAlert, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
          { label: "Eco-Drive Score", value: "96 / 100", change: "Excellent control", icon: Award, color: "text-amber-600 dark:text-amber-500", bg: "bg-amber-50 dark:bg-amber-500/10" },
        ].map((item, idx) => (
          <div key={idx} className="rounded-lg border border-gray-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 p-5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wide">{item.label}</span>
              <div className={`flex h-8 w-8 items-center justify-center rounded-md ${item.bg}`}>
                <item.icon className={`h-4 w-4 ${item.color}`} />
              </div>
            </div>
            <div>
              <span className="text-2xl font-semibold text-gray-900 dark:text-white leading-none block">{item.value}</span>
              <span className="block text-xs font-medium text-gray-500 dark:text-zinc-500 mt-2">{item.change}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Driver Shifts and Operations - Clean Panels */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Next Route Sheet */}
        <div className="rounded-lg border border-gray-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 shadow-sm flex flex-col">
          <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-zinc-800/60">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Assigned Waypoints</h2>
            <span className="px-2.5 py-0.5 rounded bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 text-xs font-medium border border-blue-200 dark:border-blue-500/20">Live Route</span>
          </div>
          <div className="flex-1 p-0">
            {[
              { stop: "Terminal 1 Main Depot", time: "10:15 AM", status: "Completed", statusCol: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20", line: true },
              { stop: "Cargo Hub Cargo Central", time: "11:30 AM", status: "Ongoing", statusCol: "text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-500/10 dark:border-blue-500/20", line: true },
              { stop: "Port Loading Dock B", time: "01:45 PM", status: "Pending", statusCol: "text-gray-600 bg-gray-100 border-gray-200 dark:text-zinc-400 dark:bg-zinc-800 dark:border-zinc-700", line: false },
            ].map((wp, idx) => (
              <div key={idx} className="relative flex items-center justify-between p-5 border-b border-gray-50 dark:border-zinc-900/50 last:border-0 hover:bg-gray-50 dark:hover:bg-zinc-900/30 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center justify-center mt-1">
                    <div className="h-2.5 w-2.5 rounded-full border-2 border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-950 z-10"></div>
                    {wp.line && <div className="absolute top-8 bottom-[-1.5rem] left-[1.4rem] w-px bg-gray-200 dark:bg-zinc-800"></div>}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white text-sm">{wp.stop}</div>
                    <div className="text-xs text-gray-500 dark:text-zinc-500 mt-1">Scheduled: {wp.time}</div>
                  </div>
                </div>
                <span className={`inline-flex rounded border px-2 py-0.5 text-[11px] font-semibold ${wp.statusCol}`}>
                  {wp.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Safety logbook */}
        <div className="rounded-lg border border-gray-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 shadow-sm flex flex-col">
          <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-zinc-800/60">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Shift Compliance Log</h2>
          </div>
          <div className="flex-1 p-5 space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-zinc-800/60 last:border-0">
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 rounded bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-500 dark:text-zinc-400">
                  <ShieldAlert className="h-3.5 w-3.5" />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-zinc-300">Rest Break Verification</span>
              </div>
              <span className="text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2 py-0.5 rounded text-[11px] font-semibold">Compliant</span>
            </div>
            
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-zinc-800/60 last:border-0">
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 rounded bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-500 dark:text-zinc-400">
                  <ShieldAlert className="h-3.5 w-3.5" />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-zinc-300">Pre-Trip Inspection Checklist</span>
              </div>
              <span className="text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2 py-0.5 rounded text-[11px] font-semibold">Submitted</span>
            </div>

            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-zinc-800/60 last:border-0">
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 rounded bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-500 dark:text-zinc-400">
                  <Navigation className="h-3.5 w-3.5" />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-zinc-300">Duty Status Code</span>
              </div>
              <span className="text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 px-2 py-0.5 rounded text-[11px] font-semibold">ON-DUTY (Driving)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
