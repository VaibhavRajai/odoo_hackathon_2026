"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "../api-client";
import { LogOut, User as UserIcon, Shield, Layers, Calendar, BarChart2, Moon, Sun, Map } from "lucide-react";

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
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // Check local storage for theme preference
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove("dark");
    }

    async function getProfile() {
      try {
        const res = await apiFetch("/api/auth/me");
        if (res.success && res.data) {
          setUser(res.data);
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

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

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
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-zinc-950 text-gray-900 dark:text-white transition-colors duration-300">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 dark:border-blue-500 border-t-transparent"></div>
          <p className="text-gray-500 dark:text-zinc-400 font-medium font-sans">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-white dark:bg-zinc-950 text-gray-900 dark:text-zinc-100 font-sans transition-colors duration-300">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-200 dark:border-zinc-800 bg-gray-50/80 dark:bg-zinc-900/40 p-6 flex flex-col justify-between hidden md:flex backdrop-blur-xl transition-colors duration-300">
        <div className="space-y-8">
          {/* Logo / Branding */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-700 text-white shadow-[0_0_15px_rgba(29,78,216,0.3)] transition-colors duration-300">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white leading-none transition-colors duration-300">TransitOps</h1>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold tracking-wider uppercase transition-colors duration-300">Telemetry Hub</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            <div className="px-3 mb-2 text-[10px] font-bold text-gray-500 dark:text-zinc-500 uppercase tracking-widest transition-colors duration-300">Navigation</div>
            <Link
              href={user.dashboardPath || "#"}
              className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors duration-300 ${pathname === user.dashboardPath ? 'bg-blue-50 dark:bg-zinc-800/50 text-blue-700 dark:text-white' : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-zinc-800/30 dark:hover:text-white'}`}
            >
              <Layers className={`h-4 w-4 ${pathname === user.dashboardPath ? 'text-blue-600 dark:text-blue-500' : ''}`} /> Dashboard Overview
            </Link>
            {user.role !== 'Fleet Manager' && (
              <Link
                href="/dispatch"
                className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors duration-300 ${pathname === '/dispatch' ? 'bg-blue-50 dark:bg-zinc-800/50 text-blue-700 dark:text-white' : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-zinc-800/30 dark:hover:text-white'}`}
              >
                <Map className={`h-4 w-4 ${pathname === '/dispatch' ? 'text-blue-600 dark:text-blue-500' : ''}`} /> Dispatch Board
              </Link>
            )}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-zinc-800/60 transition-colors duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 px-1">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-300 shadow-sm transition-colors duration-300">
                <UserIcon className="h-4 w-4" />
              </div>
              <div className="overflow-hidden">
                <div className="truncate text-sm font-semibold text-gray-900 dark:text-white leading-none transition-colors duration-300">{user.name}</div>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wider transition-colors duration-300">{user.role}</span>
              </div>
            </div>
            <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-800 text-gray-500 dark:text-zinc-400 transition-colors duration-300">
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 dark:hover:text-red-400 border border-gray-200 dark:border-zinc-700/60 hover:border-red-200 dark:hover:border-red-900/30 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-zinc-300 transition-all cursor-pointer duration-300"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex flex-1 flex-col">
        {/* Mobile Header */}
        <header className="flex h-16 items-center justify-between border-b border-gray-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/40 px-6 md:hidden backdrop-blur-xl transition-colors duration-300">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-700 text-white shadow-md transition-colors duration-300">
              <Shield className="h-4 w-4" />
            </div>
            <span className="text-sm font-bold text-gray-900 dark:text-white transition-colors duration-300">TransitOps</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-600 dark:text-zinc-300 transition-colors duration-300">
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              onClick={handleLogout}
              className="flex h-8 w-8 items-center justify-center rounded bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-300 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 dark:hover:text-red-400 cursor-pointer transition-colors duration-300 shadow-sm"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
