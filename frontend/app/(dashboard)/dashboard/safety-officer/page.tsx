"use client";

import React, { useEffect, useState } from "react";
import { apiFetch } from "../../../api-client";
import { ShieldCheck, Flame, Bell, Heart } from "lucide-react";

export default function SafetyOfficerDashboard() {
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
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Safety & Compliance Hub</h1>
        <p className="text-zinc-400 mt-2">Welcome back, {name || "Officer"}. Monitor driver telemetry and risk indices.</p>
      </div>

      {/* Safety metric cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Overall Safety Level", value: "98%", change: "Excellent standing", icon: ShieldCheck, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
          { label: "High Risk Indicators", value: "1 Device Alert", change: "Route 10 Speed Sensor", icon: Flame, color: "text-red-500 bg-red-500/10 border-red-500/20" },
          { label: "Unresolved Alerts", value: "3", change: "None critical", icon: Bell, color: "text-purple-500 bg-purple-500/10 border-purple-500/20" },
          { label: "Driver Health Checks", value: "100% Verified", change: "All drivers certified", icon: Heart, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
        ].map((item, idx) => (
          <div key={idx} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-sm shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-400">{item.label}</span>
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${item.color}`}>
                <item.icon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl font-bold text-white">{item.value}</span>
              <span className="block text-xs text-zinc-500 mt-1">{item.change}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Alert Feed */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-6 backdrop-blur-sm">
        <h2 className="text-lg font-bold text-white mb-4">Real-Time Risk Alerts</h2>
        <div className="space-y-4">
          {[
            { tag: "Speed Violation", desc: "Vehicle VT-902 reported speed limit exceedance by 12 km/h on Cargo Corridor.", time: "12 mins ago", type: "Warning", typeCol: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
            { tag: "Telematics Timeout", desc: "Driver console in VT-844 lost telemetry stream for 5 minutes. Stream recovered.", time: "48 mins ago", type: "Resolved", typeCol: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
            { tag: "Harsh Braking Event", desc: "Sudden deceleration detected on Vehicle VT-114 near Intersection 4.", time: "1 hour ago", type: "Notice", typeCol: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
          ].map((item, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-zinc-950 border border-zinc-850 flex flex-col md:flex-row justify-between gap-3 text-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${item.typeCol}`}>
                    {item.type}
                  </span>
                  <span className="font-bold text-white">{item.tag}</span>
                </div>
                <p className="text-zinc-400">{item.desc}</p>
              </div>
              <span className="text-xs text-zinc-500 whitespace-nowrap self-start md:self-center">{item.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
