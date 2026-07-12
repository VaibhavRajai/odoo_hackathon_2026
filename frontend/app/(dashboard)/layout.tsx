"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { apiFetch } from "../api-client";
import { useTheme } from "../theme-provider";
import { LogOut, User as UserIcon, Shield, Layers, Calendar, BarChart2, Sun, Moon, Menu, X, Truck, Wrench, ChevronLeft, ChevronRight, Users, MapPin, ShieldCheck, Map, Fuel } from "lucide-react";

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
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidebarCollapsed") === "true";
    }
    return false;
  });

  const toggleSidebar = () => {
    const nextVal = !sidebarCollapsed;
    setSidebarCollapsed(nextVal);
    localStorage.setItem("sidebarCollapsed", String(nextVal));
  };

  useEffect(() => {
    async function getProfile() {
      try {
        const res = await apiFetch("/api/auth/me");
        if (res.success && res.data) {
          setUser(res.data);
          // Redirect if accessing a dashboard of another role (basic protection)
          if (pathname.startsWith("/dashboard/") && !pathname.startsWith(res.data.dashboardPath)) {
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

  // Close drawer automatically on navigation path changes
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

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
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white transition-colors duration-200">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-zinc-550 dark:text-zinc-400 font-medium font-sans">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const renderSidebarContents = (isMobile = false) => {
    const isCollapsed = !isMobile && sidebarCollapsed;

    return (
      <>
        <div className="space-y-8">
          {/* Logo / Branding */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden shrink-0">
              <img
                src="/logo-light.png"
                alt="TransitOps Logo"
                className="h-10 w-auto object-contain dark:hidden shrink-0"
              />
              <img
                src="/logo-dark.png"
                alt="TransitOps Logo"
                className="h-10 w-auto object-contain hidden dark:block shrink-0"
              />
              {!isCollapsed && (
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white font-sans">TransitOps</h1>
                </div>
              )}
            </div>
            {/* Mobile drawer close button */}
            {isMobile && (
              <button
                onClick={() => setDrawerOpen(false)}
                className="lg:hidden p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            )}
            {/* Desktop Collapse Toggle */}
            {!isMobile && (
              <button
                onClick={toggleSidebar}
                className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </button>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {!isCollapsed ? (
              <div className="px-3 mb-2 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest truncate">Navigation</div>
            ) : (
              <div className="h-px border-b border-zinc-200 dark:border-zinc-800/80 mb-3 mx-1" />
            )}
            <a
              href={user.dashboardPath}
              title="Dashboard Overview"
              className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
                isCollapsed ? "justify-center px-1" : ""
              } ${
                pathname === user.dashboardPath
                  ? "bg-zinc-100 dark:bg-zinc-800/50 text-zinc-900 dark:text-white font-semibold"
                  : "text-zinc-650 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/30 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <Layers className={`h-4 w-4 shrink-0 ${pathname === user.dashboardPath ? "text-blue-500" : ""}`} /> 
              {!isCollapsed && <span>Dashboard Overview</span>}
            </a>

            {user.role === "Fleet Manager" && (
              <a
                href="/dashboard/fleet-manager/vehicles"
                title="Vehicle Registry"
                className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
                  isCollapsed ? "justify-center px-1" : ""
                } ${
                  pathname === "/dashboard/fleet-manager/vehicles"
                    ? "bg-zinc-100 dark:bg-zinc-800/50 text-zinc-900 dark:text-white font-semibold"
                    : "text-zinc-650 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/30 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                <Truck className={`h-4 w-4 shrink-0 ${pathname === "/dashboard/fleet-manager/vehicles" ? "text-blue-500" : ""}`} /> 
                {!isCollapsed && <span>Vehicle Registry</span>}
              </a>
            )}

            {user.role === "Fleet Manager" && (
              <a
                href="/dashboard/fleet-manager/maintenance"
                title="Maintenance Logs"
                className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
                  isCollapsed ? "justify-center px-1" : ""
                } ${
                  pathname === "/dashboard/fleet-manager/maintenance"
                    ? "bg-zinc-100 dark:bg-zinc-800/50 text-zinc-900 dark:text-white font-semibold"
                    : "text-zinc-650 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/30 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                <Wrench className={`h-4 w-4 shrink-0 ${pathname === "/dashboard/fleet-manager/maintenance" ? "text-amber-500" : ""}`} /> 
                {!isCollapsed && <span>Maintenance</span>}
              </a>
            )}

            {user.role === "Fleet Manager" && (
              <a
                href="/dashboard/fleet-manager/reports"
                title="Reports & Analytics"
                className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
                  isCollapsed ? "justify-center px-1" : ""
                } ${
                  pathname === "/dashboard/fleet-manager/reports"
                    ? "bg-zinc-100 dark:bg-zinc-800/50 text-zinc-900 dark:text-white font-semibold"
                    : "text-zinc-650 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/30 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                <BarChart2 className={`h-4 w-4 shrink-0 ${pathname === "/dashboard/fleet-manager/reports" ? "text-blue-500" : ""}`} /> 
                {!isCollapsed && <span>Reports &amp; Analytics</span>}
              </a>
            )}

            {user.role === "Safety Officer" && (
              <>
                <a
                  href="/dashboard/safety-officer/drivers"
                  title="Drivers & Safety"
                  className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
                    isCollapsed ? "justify-center px-1" : ""
                  } ${
                    pathname.startsWith("/dashboard/safety-officer/drivers")
                      ? "bg-zinc-100 dark:bg-zinc-800/50 text-zinc-900 dark:text-white font-semibold"
                      : "text-zinc-650 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/30 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  <Users className={`h-4 w-4 shrink-0 ${pathname.startsWith("/dashboard/safety-officer/drivers") ? "text-blue-500" : ""}`} /> 
                  {!isCollapsed && <span>Drivers & Safety</span>}
                </a>
                <a
                  href="/dashboard/safety-officer/trips"
                  title="Trips"
                  className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
                    isCollapsed ? "justify-center px-1" : ""
                  } ${
                    pathname.startsWith("/dashboard/safety-officer/trips")
                      ? "bg-zinc-100 dark:bg-zinc-800/50 text-zinc-900 dark:text-white font-semibold"
                      : "text-zinc-650 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/30 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  <MapPin className={`h-4 w-4 shrink-0 ${pathname.startsWith("/dashboard/safety-officer/trips") ? "text-blue-500" : ""}`} /> 
                  {!isCollapsed && <span>Trips</span>}
                </a>
                <a
                  href="/dashboard/safety-officer/compliance"
                  title="Compliance"
                  className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
                    isCollapsed ? "justify-center px-1" : ""
                  } ${
                    pathname.startsWith("/dashboard/safety-officer/compliance")
                      ? "bg-zinc-100 dark:bg-zinc-800/50 text-zinc-900 dark:text-white font-semibold"
                      : "text-zinc-650 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/30 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  <ShieldCheck className={`h-4 w-4 shrink-0 ${pathname.startsWith("/dashboard/safety-officer/compliance") ? "text-blue-500" : ""}`} /> 
                  {!isCollapsed && <span>Compliance</span>}
                </a>
              </>
            )}

            {user.role === "Dispatcher" && (
              <>
                <a
                  href="/dispatch"
                  title="Dispatch Board"
                  className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
                    isCollapsed ? "justify-center px-1" : ""
                  } ${
                    pathname.startsWith("/dispatch") && !pathname.startsWith("/dispatch/expenses")
                      ? "bg-zinc-100 dark:bg-zinc-800/50 text-zinc-900 dark:text-white font-semibold"
                      : "text-zinc-650 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/30 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  <Map className={`h-4 w-4 shrink-0 ${pathname.startsWith("/dispatch") && !pathname.startsWith("/dispatch/expenses") ? "text-blue-500" : ""}`} /> 
                  {!isCollapsed && <span>Dispatch Board</span>}
                </a>
                <a
                  href="/dispatch/expenses"
                  title="Fuel & Expenses"
                  className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
                    isCollapsed ? "justify-center px-1" : ""
                  } ${
                    pathname.startsWith("/dispatch/expenses")
                      ? "bg-zinc-100 dark:bg-zinc-800/50 text-zinc-900 dark:text-white font-semibold"
                      : "text-zinc-650 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/30 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  <Fuel className={`h-4 w-4 shrink-0 ${pathname.startsWith("/dispatch/expenses") ? "text-amber-500" : ""}`} /> 
                  {!isCollapsed && <span>Fuel & Expenses</span>}
                </a>
              </>
            )}
          </nav>
        </div>

        {/* User Card, Theme toggle & Logout */}
        <div className="space-y-4 pt-6 border-t border-zinc-200 dark:border-zinc-800/60">
          {/* Theme switcher */}
          {!isCollapsed ? (
            <div className="flex items-center justify-between px-1 mb-2">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Theme</span>
              <button
                onClick={toggleTheme}
                type="button"
                className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-all cursor-pointer"
              >
                {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </button>
            </div>
          ) : (
            <div className="flex justify-center w-full mb-2">
              <button
                onClick={toggleTheme}
                type="button"
                title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
                className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-all cursor-pointer"
              >
                {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </button>
            </div>
          )}

          {/* User profile */}
          <div className={`flex items-center gap-3 px-1 ${isCollapsed ? "justify-center" : ""}`}>
            <div 
              className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 shrink-0"
              title={isCollapsed ? `${user.name} (${user.role})` : undefined}
            >
              <UserIcon className="h-4 w-4" />
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden">
                <div className="truncate text-sm font-semibold text-zinc-900 dark:text-white leading-none">{user.name}</div>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wider">{user.role}</span>
              </div>
            )}
          </div>

          {/* Logout button */}
          {!isCollapsed ? (
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 dark:hover:text-red-400 border border-zinc-200 dark:border-zinc-700/60 hover:border-red-200 dark:hover:border-red-900/30 px-4 py-2.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer animate-fade-in"
            >
              <LogOut className="h-4 w-4" /> Sign Out
            </button>
          ) : (
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="flex w-full items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 dark:hover:text-red-400 border border-zinc-200 dark:border-zinc-700/60 hover:border-red-200 dark:hover:border-red-900/30 py-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}

        </div>
      </>
    );
  };

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans transition-colors duration-200">
      {/* Desktop Sidebar (collapsible) */}
      <aside className={`border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 flex flex-col justify-between hidden lg:flex backdrop-blur-xl transition-all duration-300 shrink-0 ${
        sidebarCollapsed ? "w-20 p-4" : "w-64 p-6"
      }`}>
        {renderSidebarContents(false)}
      </aside>

      {/* Mobile Drawer (collapsible menu) */}
      <div
        className={`fixed inset-0 bg-black/60 z-40 lg:hidden transition-opacity duration-300 ${
          drawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setDrawerOpen(false)}
      />
      <aside
        className={`fixed top-0 bottom-0 left-0 w-64 bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 p-6 z-50 flex flex-col justify-between transform transition-transform duration-300 lg:hidden ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {renderSidebarContents(true)}
      </aside>

      {/* Main Container */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile / Tablet Header */}
        <header className="flex h-16 items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 px-6 lg:hidden transition-colors duration-200 shrink-0">
          <div className="flex items-center gap-3">
            {/* Hamburger menu button */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="p-2 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center gap-2">
              <img
                src="/logo-light.png"
                alt="TransitOps Logo"
                className="h-8 w-auto object-contain dark:hidden"
              />
              <img
                src="/logo-dark.png"
                alt="TransitOps Logo"
                className="h-8 w-auto object-contain hidden dark:block"
              />
              <span className="text-lg font-bold text-zinc-900 dark:text-white font-sans">TransitOps</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              type="button"
              className="p-2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 cursor-pointer"
            >
              {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
            <button
              onClick={handleLogout}
              className="flex h-8 w-8 items-center justify-center rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
