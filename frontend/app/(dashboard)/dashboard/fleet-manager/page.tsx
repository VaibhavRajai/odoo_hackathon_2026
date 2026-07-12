"use client";

import React, { useEffect, useState } from "react";
import { apiFetch } from "../../../api-client";
import { Truck, Users, MapPin, Activity } from "lucide-react";

export default function FleetManagerDashboard() {
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
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Fleet Manager Dashboard</h1>
        <p className="text-zinc-400 mt-2">Welcome back, {name || "Manager"}. Control active deployments and vehicle logs.</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Active Vehicles", value: "42 / 45", change: "+4 today", icon: Truck, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
          { label: "Active Drivers", value: "38 / 40", change: "2 on break", icon: Users, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
          { label: "Dispatched Routes", value: "19", change: "All in green status", icon: MapPin, color: "text-purple-500 bg-purple-500/10 border-purple-500/20" },
          { label: "Fuel Efficiency", value: "8.4 km/L", change: "+1.2% over last week", icon: Activity, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
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

      {/* Fleet Monitoring Section */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-6 backdrop-blur-sm">
        <h2 className="text-lg font-bold text-white mb-4">Active Vehicle Monitoring</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-400 border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-300 font-medium">
                <th className="py-3 px-4">Vehicle ID</th>
                <th className="py-3 px-4">Driver</th>
                <th className="py-3 px-4">Destination</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Battery/Fuel</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40">
              {[
                { id: "VT-902", driver: "Raj Patel", dest: "Terminal A - Cargo Central", status: "Transit", statusCol: "text-blue-400 bg-blue-500/10 border-blue-500/20", energy: "82%" },
                { id: "VT-114", driver: "Sarah Jenkins", dest: "Depot West", status: "Active Delivery", statusCol: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", energy: "64%" },
                { id: "VT-844", driver: "John Doe", dest: "Loading Bay C", status: "Loading", statusCol: "text-amber-400 bg-amber-500/10 border-amber-500/20", energy: "98%" },
              ].map((row, idx) => (
                <tr key={idx} className="hover:bg-zinc-800/10 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-white">{row.id}</td>
                  <td className="py-3.5 px-4">{row.driver}</td>
                  <td className="py-3.5 px-4">{row.dest}</td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${row.statusCol}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-white font-medium">{row.energy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
