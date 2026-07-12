"use client";

import React, { useEffect, useState } from "react";
import { apiFetch } from "../../../api-client";
import { DollarSign, Wallet, Percent, TrendingUp } from "lucide-react";

export default function FinancialAnalystDashboard() {
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
        <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">Financial Analysis Center</h1>
        <p className="text-zinc-550 dark:text-zinc-400 mt-2">Welcome back, {name || "Analyst"}. Review operation costs and revenue margins.</p>
      </div>

      {/* Financial metrics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Active Revenue", value: "$124,500", change: "+12% this month", icon: DollarSign, color: "text-blue-600 dark:text-blue-500 bg-blue-500/10 border-blue-500/20" },
          { label: "Fuel Expenses", value: "$41,200", change: "-3% optimization savings", icon: Wallet, color: "text-emerald-600 dark:text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
          { label: "Operating Margin", value: "32.4%", change: "Industry standard 30%", icon: Percent, color: "text-purple-600 dark:text-purple-500 bg-purple-500/10 border-purple-500/20" },
          { label: "Projected Growth", value: "+8.5%", change: "Targeting $150K by Q4", icon: TrendingUp, color: "text-amber-600 dark:text-amber-500 bg-amber-500/10 border-amber-500/20" },
        ].map((item, idx) => (
          <div key={idx} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-6 backdrop-blur-sm shadow-sm transition-colors duration-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{item.label}</span>
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${item.color}`}>
                <item.icon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl font-bold text-zinc-900 dark:text-white">{item.value}</span>
              <span className="block text-xs text-zinc-550 dark:text-zinc-500 mt-1">{item.change}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Cost Distribution Chart/Table */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/20 p-6 backdrop-blur-sm transition-colors duration-200">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">Operations Cost Breakdown (Current Month)</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm text-zinc-500 dark:text-zinc-400 border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-300 font-medium">
                <th className="py-3 px-4">Cost Category</th>
                <th className="py-3 px-4">Budget Allocated</th>
                <th className="py-3 px-4">Actual Cost</th>
                <th className="py-3 px-4">Variance</th>
                <th className="py-3 px-4">Optimization Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/65 dark:divide-zinc-800/40">
              {[
                { category: "Fuel & Energy", budget: "$45,000", actual: "$41,200", variance: "-$3,800", status: "Optimal", statusCol: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
                { category: "Maintenance & Spares", budget: "$15,000", actual: "$16,500", variance: "+$1,500", status: "Warning Threshold", statusCol: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20" },
                { category: "Driver Payroll & Allowances", budget: "$60,000", actual: "$59,800", variance: "-$200", status: "Balanced", statusCol: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20" },
              ].map((row, idx) => (
                <tr key={idx} className="hover:bg-zinc-100 dark:hover:bg-zinc-800/10 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-zinc-900 dark:text-white">{row.category}</td>
                  <td className="py-3.5 px-4">{row.budget}</td>
                  <td className="py-3.5 px-4">{row.actual}</td>
                  <td className="py-3.5 px-4 text-zinc-900 dark:text-white font-medium">{row.variance}</td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${row.statusCol}`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
