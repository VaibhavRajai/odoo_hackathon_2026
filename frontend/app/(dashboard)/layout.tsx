"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { apiFetch } from "../api-client";
import { LogOut, User as UserIcon, Shield, Layers, Calendar, BarChart2 } from "lucide-react";

interface UserSession {
  userId: string;
  email: string;
  name: string;
  role: string;
  dashboardPath: string;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getProfile() {
      try {
        const res = await apiFetch("/api/auth/me");
        if (res.success && res.data) {
          setUser(res.data);
          // Redirect if accessing a dashboard of another role (basic protection)
          if (pathname.startsWith("/dashboard/") && pathname !== res.data.dashboardPath) {
            router.replace(res.data.dashboardPath);
          }
        } else {
          router.replace("/login");
        }
      } catch {
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    }
    getProfile();
  }, [router, pathname]);

  const handleLogout = async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore error during logout
    }
    router.replace("/login");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-zinc-400 font-medium font-sans">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-800 bg-zinc-900/40 p-6 flex flex-col justify-between hidden md:flex backdrop-blur-xl">
        <div className="space-y-8">
          {/* Logo / Branding */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.2)]">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white leading-none">TransitOps</h1>
              <span className="text-[10px] text-zinc-500 font-semibold tracking-wider uppercase">Telemetry Hub</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            <div className="px-3 mb-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Navigation</div>
            <a
              href="#"
              className="flex items-center gap-3 rounded-lg bg-zinc-800/50 px-3.5 py-2.5 text-sm font-medium text-white transition-colors"
            >
              <Layers className="h-4 w-4 text-blue-500" /> Dashboard Overview
            </a>
            <a
              href="#"
              className="flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800/30 hover:text-white transition-colors"
            >
              <BarChart2 className="h-4 w-4" /> Telemetry Reports
            </a>
            <a
              href="#"
              className="flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800/30 hover:text-white transition-colors"
            >
              <Calendar className="h-4 w-4" /> Operations Log
            </a>
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="space-y-4 pt-6 border-t border-zinc-800/60">
          <div className="flex items-center gap-3 px-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300">
              <UserIcon className="h-4 w-4" />
            </div>
            <div className="overflow-hidden">
              <div className="truncate text-sm font-semibold text-white leading-none">{user.name}</div>
              <span className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider">{user.role}</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-800 hover:bg-red-950/20 hover:text-red-400 border border-zinc-700/60 hover:border-red-900/30 px-4 py-2.5 text-sm font-semibold text-zinc-300 transition-all cursor-pointer"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex flex-1 flex-col">
        {/* Mobile Header */}
        <header className="flex h-16 items-center justify-between border-b border-zinc-800 bg-zinc-900/40 px-6 md:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-600 text-white">
              <Shield className="h-4 w-4" />
            </div>
            <span className="text-sm font-bold text-white">TransitOps</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex h-8 w-8 items-center justify-center rounded bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-red-950/20 hover:text-red-400 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
