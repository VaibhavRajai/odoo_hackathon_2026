"use client";

import React, { useEffect, useState } from "react";
import { apiFetch } from "../../../api-client";
import { Truck, Users, MapPin, Activity, Wrench, Fuel, X } from "lucide-react";

interface VehicleAnalytics {
  id: string;
  registrationNum: string;
  name: string;
  type: string;
  status: string;
  odometer: number;
  totalFuelCost: number;
  totalMaintenanceCost: number;
  totalOperationalCost: number;
  roi: number | null;
}

export default function FleetManagerDashboard() {
  const [name, setName] = useState("");
  const [vehicles, setVehicles] = useState<VehicleAnalytics[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [showFuelModal, setShowFuelModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleAnalytics | null>(null);

  const [maintenanceForm, setMaintenanceForm] = useState({ type: 'Repair', description: '', cost: '' });
  const [fuelForm, setFuelForm] = useState({ liters: '', cost: '' });

  const loadData = async () => {
    try {
      const res = await apiFetch("/api/auth/me");
      if (res.success) setName(res.data.name);

      const vRes = await apiFetch("/api/vehicles/analytics");
      if (vRes.success) setVehicles(vRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleMaintenanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) return;
    try {
      await apiFetch("/api/maintenance", {
        method: "POST",
        body: JSON.stringify({
          vehicleId: selectedVehicle.id,
          type: maintenanceForm.type,
          description: maintenanceForm.description,
          cost: maintenanceForm.cost
        })
      });
      setShowMaintenanceModal(false);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleFuelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) return;
    try {
      await apiFetch(`/api/vehicles/${selectedVehicle.id}/fuel`, {
        method: "POST",
        body: JSON.stringify({
          liters: fuelForm.liters,
          cost: fuelForm.cost
        })
      });
      setShowFuelModal(false);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Fleet Manager Dashboard</h1>
        <p className="text-zinc-400 mt-2">Welcome back, {name || "Manager"}. Control active deployments, maintenance, and vehicle logs.</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Active Vehicles", value: vehicles.length.toString(), change: "Total fleet size", icon: Truck, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
          { label: "Vehicles In Shop", value: vehicles.filter(v => v.status === "In Shop").length.toString(), change: "Currently under maintenance", icon: Wrench, color: "text-red-500 bg-red-500/10 border-red-500/20" },
          { label: "On Trip", value: vehicles.filter(v => v.status === "On Trip").length.toString(), change: "Active deliveries", icon: MapPin, color: "text-purple-500 bg-purple-500/10 border-purple-500/20" },
          { label: "Total Fleet Cost", value: `$${vehicles.reduce((sum, v) => sum + v.totalOperationalCost, 0).toFixed(2)}`, change: "Fuel + Maintenance", icon: Activity, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
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
        <h2 className="text-lg font-bold text-white mb-4">Vehicle Registry & Analytics</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-400 border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-300 font-medium">
                <th className="py-3 px-4">Registration</th>
                <th className="py-3 px-4">Name & Type</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Odometer</th>
                <th className="py-3 px-4">Total Cost</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8">Loading vehicles...</td></tr>
              ) : vehicles.map((row) => (
                <tr key={row.id} className="hover:bg-zinc-800/10 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-white">{row.registrationNum}</td>
                  <td className="py-3.5 px-4">{row.name} <span className="text-xs text-zinc-500 ml-1">({row.type})</span></td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                      row.status === 'Available' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                      row.status === 'On Trip' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' :
                      'text-red-400 bg-red-500/10 border-red-500/20'
                    }`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-white">{row.odometer} km</td>
                  <td className="py-3.5 px-4 text-white font-medium">${row.totalOperationalCost.toFixed(2)}</td>
                  <td className="py-3.5 px-4 text-right space-x-2">
                    <button 
                      onClick={() => { setSelectedVehicle(row); setShowFuelModal(true); }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-white rounded-md transition-colors"
                    >
                      <Fuel className="w-3.5 h-3.5" /> Fuel
                    </button>
                    {row.status === 'Available' && (
                      <button 
                        onClick={() => { setSelectedVehicle(row); setShowMaintenanceModal(true); }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/20 rounded-md transition-colors"
                      >
                        <Wrench className="w-3.5 h-3.5" /> Send to Shop
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {vehicles.length === 0 && !loading && (
                <tr><td colSpan={6} className="text-center py-8">No vehicles found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Maintenance Modal */}
      {showMaintenanceModal && selectedVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Send to Shop: {selectedVehicle.registrationNum}</h3>
              <button onClick={() => setShowMaintenanceModal(false)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleMaintenanceSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Maintenance Type</label>
                <select 
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white focus:border-blue-500 focus:outline-none"
                  value={maintenanceForm.type} onChange={e => setMaintenanceForm({...maintenanceForm, type: e.target.value})}
                >
                  <option>Repair</option>
                  <option>Oil Change</option>
                  <option>Tire Replacement</option>
                  <option>Inspection</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Cost ($)</label>
                <input required type="number" step="0.01" 
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white focus:border-blue-500 focus:outline-none"
                  value={maintenanceForm.cost} onChange={e => setMaintenanceForm({...maintenanceForm, cost: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Description (Optional)</label>
                <textarea 
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white focus:border-blue-500 focus:outline-none"
                  value={maintenanceForm.description} onChange={e => setMaintenanceForm({...maintenanceForm, description: e.target.value})}
                />
              </div>
              <div className="pt-2">
                <button type="submit" className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700">Confirm Maintenance</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fuel Modal */}
      {showFuelModal && selectedVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Log Fuel: {selectedVehicle.registrationNum}</h3>
              <button onClick={() => setShowFuelModal(false)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleFuelSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Liters (L)</label>
                <input required type="number" step="0.1" 
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white focus:border-blue-500 focus:outline-none"
                  value={fuelForm.liters} onChange={e => setFuelForm({...fuelForm, liters: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Total Cost ($)</label>
                <input required type="number" step="0.01" 
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white focus:border-blue-500 focus:outline-none"
                  value={fuelForm.cost} onChange={e => setFuelForm({...fuelForm, cost: e.target.value})}
                />
              </div>
              <div className="pt-2">
                <button type="submit" className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 font-semibold text-white hover:bg-emerald-700">Log Fuel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
