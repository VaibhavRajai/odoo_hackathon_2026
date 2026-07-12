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
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">Driver Control Console</h1>
        <p className="text-zinc-550 dark:text-zinc-400 mt-2">Welcome back, {name || "Driver"}. Drive safely and log your hours.</p>
      </div>

      {/* Driver status blocks */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Assigned Vehicle", value: "Transit Bus VT-902", change: "Route A-10", icon: Navigation, color: "text-blue-600 dark:text-blue-500 bg-blue-500/10 border-blue-500/20" },
          { label: "Active Shift Time", value: "3h 45m", change: "Shift ends in 4h 15m", icon: Clock, color: "text-emerald-600 dark:text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
          { label: "Safety Alerts", value: "0 Active", change: "System reports all green", icon: ShieldAlert, color: "text-purple-600 dark:text-purple-500 bg-purple-500/10 border-purple-500/20" },
          { label: "Eco-Drive Score", value: "96 / 100", change: "Excellent accelerator control", icon: Award, color: "text-amber-600 dark:text-amber-500 bg-amber-500/10 border-amber-500/20" },
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
              <span className="block text-xs text-zinc-550 dark:text-zinc-500 mt-1">{item.change}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Driver Shifts and Operations */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Next Route Sheet */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/20 p-6 backdrop-blur-sm transition-colors duration-200">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">Assigned Waypoints</h2>
          <div className="space-y-4">
            {[
              { stop: "Terminal 1 Main Depot", time: "10:15 AM", status: "Completed", statusCol: "text-emerald-600 dark:text-emerald-450 bg-emerald-500/10 border-emerald-500/20" },
              { stop: "Cargo Hub Cargo Central", time: "11:30 AM", status: "Ongoing", statusCol: "text-blue-600 dark:text-blue-450 bg-blue-500/10 border-blue-500/20" },
              { stop: "Port Loading Dock B", time: "01:45 PM", status: "Pending", statusCol: "text-zinc-550 dark:text-zinc-500 bg-zinc-500/10 border-zinc-500/20" },
            ].map((wp, idx) => (
              <div key={idx} className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 transition-colors">
                <div>
                  <div className="font-semibold text-zinc-900 dark:text-white text-sm">{wp.stop}</div>
                  <span className="text-xs text-zinc-500">Scheduled: {wp.time}</span>
                </div>
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${wp.statusCol}`}>
                  {wp.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Safety logbook */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/20 p-6 backdrop-blur-sm transition-colors duration-200">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">Shift Compliance Log</h2>
          <div className="space-y-3.5">
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-between text-sm transition-colors">
              <span className="text-zinc-600 dark:text-zinc-400">Rest Break Verification</span>
              <span className="text-emerald-600 dark:text-emerald-450 font-semibold">Compliant</span>
            </div>
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-between text-sm transition-colors">
              <span className="text-zinc-600 dark:text-zinc-400">Pre-Trip Inspection Checklist</span>
              <span className="text-emerald-600 dark:text-emerald-450 font-semibold">Submitted</span>
            </div>
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-between text-sm transition-colors">
              <span className="text-zinc-600 dark:text-zinc-400">Duty Status Code</span>
              <span className="text-blue-600 dark:text-blue-450 font-semibold">ON-DUTY (Driving)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
