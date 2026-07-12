"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../../api-client";
import { Fuel, Receipt, Loader2, AlertCircle, Plus, IndianRupee } from "lucide-react";

interface VehicleRef {
  id: string;
  registrationNumber: string;
  name: string;
  totalFuelCost?: number;
  totalMaintenanceCost?: number;
  totalOperationalCost?: number;
}

interface FuelLog {
  id: string;
  vehicle: { registrationNumber: string; name: string };
  liters: number;
  cost: number;
  date: string;
}

interface Expense {
  id: string;
  vehicle: { registrationNumber: string; name: string };
  type: string;
  amount: number;
  description: string | null;
  date: string;
}

const EXPENSE_TYPES = ["Toll", "Parking", "Fine", "Permit", "Other"];

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

export default function DispatcherExpensesPage() {
  const [vehicles, setVehicles] = useState<VehicleRef[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [fuelVehicleId, setFuelVehicleId] = useState("");
  const [fuelLiters, setFuelLiters] = useState("");
  const [fuelCost, setFuelCost] = useState("");
  const [fuelDate, setFuelDate] = useState(new Date().toISOString().slice(0, 10));
  const [fuelSubmitting, setFuelSubmitting] = useState(false);
  const [fuelError, setFuelError] = useState("");

  const [expVehicleId, setExpVehicleId] = useState("");
  const [expType, setExpType] = useState(EXPENSE_TYPES[0]);
  const [expAmount, setExpAmount] = useState("");
  const [expDate, setExpDate] = useState(new Date().toISOString().slice(0, 10));
  const [expDescription, setExpDescription] = useState("");
  const [expSubmitting, setExpSubmitting] = useState(false);
  const [expError, setExpError] = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [vehiclesRes, fuelRes, expRes] = await Promise.all([
        apiFetch("/api/vehicles?limit=1000"),
        apiFetch("/api/fuel-logs"),
        apiFetch("/api/expenses"),
      ]);
      setVehicles(vehiclesRes.data || []);
      setFuelLogs(fuelRes.data || []);
      setExpenses(expRes.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load fuel & expense data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setTimeout(fetchAll, 0);
  }, [fetchAll]);

  const handleAddFuelLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setFuelError("");

    if (!fuelVehicleId) return setFuelError("Please select a vehicle.");
    const liters = parseFloat(fuelLiters);
    if (!Number.isFinite(liters) || liters <= 0) return setFuelError("Liters must be greater than 0.");
    const cost = parseFloat(fuelCost);
    if (!Number.isFinite(cost) || cost <= 0) return setFuelError("Cost must be greater than 0.");

    setFuelSubmitting(true);
    try {
      await apiFetch("/api/fuel-logs", {
        method: "POST",
        body: JSON.stringify({ vehicleId: fuelVehicleId, liters, cost, date: fuelDate }),
      });
      setFuelLiters("");
      setFuelCost("");
      setFuelDate(new Date().toISOString().slice(0, 10));
      fetchAll();
    } catch (err: unknown) {
      setFuelError(err instanceof Error ? err.message : "Failed to record fuel log.");
    } finally {
      setFuelSubmitting(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setExpError("");

    if (!expVehicleId) return setExpError("Please select a vehicle.");
    const amount = parseFloat(expAmount);
    if (!Number.isFinite(amount) || amount <= 0) return setExpError("Amount must be greater than 0.");

    setExpSubmitting(true);
    try {
      await apiFetch("/api/expenses", {
        method: "POST",
        body: JSON.stringify({
          vehicleId: expVehicleId,
          type: expType,
          amount,
          date: expDate,
          description: expDescription.trim() || undefined,
        }),
      });
      setExpAmount("");
      setExpDescription("");
      setExpDate(new Date().toISOString().slice(0, 10));
      fetchAll();
    } catch (err: unknown) {
      setExpError(err instanceof Error ? err.message : "Failed to record expense.");
    } finally {
      setExpSubmitting(false);
    }
  };

  const inputClass =
    "block w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3.5 py-2.5 text-zinc-900 dark:text-white shadow-inner focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm transition-colors font-medium";

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">Fuel & Expense Management</h1>
        <p className="text-zinc-555 dark:text-zinc-400 mt-2">
          Record fuel refuels and vehicle expenses (tolls, fines, parking). Operational cost per vehicle is computed automatically.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 px-4 py-3 text-red-600 dark:text-red-400 text-sm">
          <AlertCircle className="h-4.5 w-4.5 shrink-0" /> {error}
        </div>
      )}

      {/* Forms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fuel Log Form */}
        <form
          onSubmit={handleAddFuelLog}
          className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-6 space-y-4 shadow-sm"
        >
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Fuel className="h-5 w-5 text-blue-500" /> Log Fuel Refuel
          </h2>

          <div>
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Vehicle</label>
            <select value={fuelVehicleId} onChange={(e) => setFuelVehicleId(e.target.value)} className={`${inputClass} mt-1.5 cursor-pointer`}>
              <option value="">Select vehicle...</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.registrationNumber} — {v.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Liters</label>
              <input type="number" min="0" step="0.01" value={fuelLiters} onChange={(e) => setFuelLiters(e.target.value)} className={`${inputClass} mt-1.5`} placeholder="e.g. 45.5" />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Cost (₹)</label>
              <input type="number" min="0" step="0.01" value={fuelCost} onChange={(e) => setFuelCost(e.target.value)} className={`${inputClass} mt-1.5`} placeholder="e.g. 4500" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Date</label>
            <input type="date" value={fuelDate} onChange={(e) => setFuelDate(e.target.value)} className={`${inputClass} mt-1.5`} />
          </div>

          {fuelError && <p className="text-xs font-semibold text-red-500">{fuelError}</p>}

          <button
            type="submit"
            disabled={fuelSubmitting}
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 text-sm font-semibold transition-all disabled:opacity-50 cursor-pointer"
          >
            {fuelSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Record Fuel Log
          </button>
        </form>

        {/* Expense Form */}
        <form
          onSubmit={handleAddExpense}
          className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-6 space-y-4 shadow-sm"
        >
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Receipt className="h-5 w-5 text-amber-500" /> Log Expense
          </h2>

          <div>
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Vehicle</label>
            <select value={expVehicleId} onChange={(e) => setExpVehicleId(e.target.value)} className={`${inputClass} mt-1.5 cursor-pointer`}>
              <option value="">Select vehicle...</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.registrationNumber} — {v.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Type</label>
              <select value={expType} onChange={(e) => setExpType(e.target.value)} className={`${inputClass} mt-1.5 cursor-pointer`}>
                {EXPENSE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Amount (₹)</label>
              <input type="number" min="0" step="0.01" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} className={`${inputClass} mt-1.5`} placeholder="e.g. 250" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Date</label>
            <input type="date" value={expDate} onChange={(e) => setExpDate(e.target.value)} className={`${inputClass} mt-1.5`} />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Description (optional)</label>
            <input type="text" value={expDescription} onChange={(e) => setExpDescription(e.target.value)} className={`${inputClass} mt-1.5`} placeholder="e.g. NH48 toll plaza" />
          </div>

          {expError && <p className="text-xs font-semibold text-red-500">{expError}</p>}

          <button
            type="submit"
            disabled={expSubmitting}
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-amber-600 hover:bg-amber-500 text-white px-5 py-2.5 text-sm font-semibold transition-all disabled:opacity-50 cursor-pointer"
          >
            {expSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Record Expense
          </button>
        </form>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <>
          {/* Per-vehicle operational cost summary */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/20 overflow-hidden shadow-sm">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white px-6 pt-6 flex items-center gap-2">
              <IndianRupee className="h-5 w-5 text-emerald-500" /> Operational Cost per Vehicle
            </h2>
            <div className="overflow-x-auto mt-4">
              <table className="w-full min-w-150 text-left text-sm text-zinc-555 dark:text-zinc-400">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/20 text-zinc-800 dark:text-zinc-300 font-semibold">
                    <th className="py-3 px-6">Vehicle</th>
                    <th className="py-3 px-6">Fuel Cost</th>
                    <th className="py-3 px-6">Maintenance Cost</th>
                    <th className="py-3 px-6">Total Operational Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/40">
                  {vehicles.map((v) => (
                    <tr key={v.id}>
                      <td className="py-3 px-6 font-bold text-zinc-900 dark:text-white font-mono">{v.registrationNumber} <span className="font-normal text-zinc-500 text-xs">{v.name}</span></td>
                      <td className="py-3 px-6">{formatCurrency(v.totalFuelCost ?? 0)}</td>
                      <td className="py-3 px-6">{formatCurrency(v.totalMaintenanceCost ?? 0)}</td>
                      <td className="py-3 px-6 font-bold text-zinc-900 dark:text-white">{formatCurrency(v.totalOperationalCost ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Fuel Logs table */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/20 overflow-hidden shadow-sm">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white px-6 pt-6">Fuel Log History</h2>
            {fuelLogs.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400 px-6 py-8 text-center">No fuel logs recorded yet.</p>
            ) : (
              <div className="overflow-x-auto mt-4">
                <table className="w-full min-w-150 text-left text-sm text-zinc-555 dark:text-zinc-400">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/20 text-zinc-800 dark:text-zinc-300 font-semibold">
                      <th className="py-3 px-6">Vehicle</th>
                      <th className="py-3 px-6">Liters</th>
                      <th className="py-3 px-6">Cost</th>
                      <th className="py-3 px-6">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/40">
                    {fuelLogs.map((f) => (
                      <tr key={f.id}>
                        <td className="py-3 px-6 font-bold text-zinc-900 dark:text-white font-mono">{f.vehicle.registrationNumber} <span className="font-normal text-zinc-500 text-xs">{f.vehicle.name}</span></td>
                        <td className="py-3 px-6">{f.liters} L</td>
                        <td className="py-3 px-6">{formatCurrency(f.cost)}</td>
                        <td className="py-3 px-6 font-mono">{formatDate(f.date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Expenses table */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/20 overflow-hidden shadow-sm">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white px-6 pt-6">Expense History</h2>
            {expenses.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400 px-6 py-8 text-center">No expenses recorded yet.</p>
            ) : (
              <div className="overflow-x-auto mt-4">
                <table className="w-full min-w-175 text-left text-sm text-zinc-555 dark:text-zinc-400">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/20 text-zinc-800 dark:text-zinc-300 font-semibold">
                      <th className="py-3 px-6">Vehicle</th>
                      <th className="py-3 px-6">Type</th>
                      <th className="py-3 px-6">Amount</th>
                      <th className="py-3 px-6">Description</th>
                      <th className="py-3 px-6">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/40">
                    {expenses.map((ex) => (
                      <tr key={ex.id}>
                        <td className="py-3 px-6 font-bold text-zinc-900 dark:text-white font-mono">{ex.vehicle.registrationNumber} <span className="font-normal text-zinc-500 text-xs">{ex.vehicle.name}</span></td>
                        <td className="py-3 px-6">{ex.type}</td>
                        <td className="py-3 px-6">{formatCurrency(ex.amount)}</td>
                        <td className="py-3 px-6 text-zinc-500 dark:text-zinc-500">{ex.description || "—"}</td>
                        <td className="py-3 px-6 font-mono">{formatDate(ex.date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
