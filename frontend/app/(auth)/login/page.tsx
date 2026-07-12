"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "../../api-client";
import { useTheme } from "../../theme-provider";
import { LogIn, ShieldAlert, KeyRound, Mail, Sun, Moon, Eye, EyeOff, Download } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (res.success && res.data.dashboardPath) {
        router.replace(res.data.dashboardPath);
      } else {
        setError("Invalid response format from server.");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-zinc-50 dark:bg-zinc-950 transition-colors duration-200 relative overflow-hidden">
      {/* LEFT COLUMN: Welcome Banner & Graphic (Shown only on desktop) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-slate-50 dark:bg-zinc-900/30 border-r border-zinc-200 dark:border-zinc-800 transition-colors relative min-h-screen shrink-0">
        
        {/* Top Header Logo */}
        <div className="flex items-center gap-2.5">
          <img src="/logo-light.png" alt="TransitOps Logo" className="h-10 w-auto object-contain dark:hidden" />
          <img src="/logo-dark.png" alt="TransitOps Logo" className="h-10 w-auto object-contain hidden dark:block" />
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white font-sans">TransitOps</h1>
        </div>

        {/* Middle Welcome Text */}
        <div className="space-y-3.5 max-w-2xl mt-16 mb-auto z-10">
          <h2 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white font-sans leading-tight">
            Welcome to <span className="text-blue-900 dark:text-blue-400">TransitOps</span>
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-zinc-550 dark:text-zinc-400 font-medium leading-relaxed">
            Simplifying fleet tracking, telemetry monitoring, and real-time dispatches with state-of-the-art role access control.
          </p>
        </div>

        {/* Bottom Graphic: Semi-truck graphic aligned flat to the bottom and left */}
        <div className="absolute bottom-0 left-0 w-[95%] max-w-lg pointer-events-none">
          <img
            src="/landing-truck.png"
            alt="TransitOps Fleet Truck"
            className="w-full h-auto object-contain translate-x-[-5%] translate-y-[2%]"
          />
        </div>
      </div>

      {/* RIGHT COLUMN: Header (mobile logo) & Login Card */}
      <div className="flex-1 flex flex-col justify-between min-h-screen relative z-10">
        
        {/* Top Header Actions (Mobile Logo + Theme Toggle Button) */}
        <header className="flex h-16 items-center justify-between px-6 py-4 w-full shrink-0">
          {/* Mobile Logo: Shown only below lg */}
          <div className="flex items-center gap-2.5 lg:hidden">
            <img src="/logo-light.png" alt="TransitOps Logo" className="h-8 w-auto object-contain dark:hidden" />
            <img src="/logo-dark.png" alt="TransitOps Logo" className="h-8 w-auto object-contain hidden dark:block" />
            <span className="text-lg font-bold text-zinc-900 dark:text-white font-sans">TransitOps</span>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              type="button"
              className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-850 transition-all cursor-pointer shadow-sm"
              aria-label="Toggle Theme"
            >
              {theme === "light" ? <Moon className="h-4.5 w-4.5" /> : <Sun className="h-4.5 w-4.5" />}
            </button>
          </div>
        </header>

        {/* Centered Login Card */}
        <div className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
          <div className="w-full max-w-sm space-y-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-850 bg-slate-50/70 dark:bg-zinc-900/40 p-5 sm:p-6 backdrop-blur-xl shadow-lg transition-all duration-200">
            
            <div className="text-left md:text-center">
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white font-sans">
                Welcome Back
              </h2>
              <p className="mt-1.5 text-xs text-zinc-550 dark:text-zinc-400">
                Please enter your credentials to access the console
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 rounded-lg border border-red-500/20 bg-red-500/10 p-3.5 text-xs text-red-600 dark:text-red-400">
                <ShieldAlert className="h-4.5 w-4.5 shrink-0 text-red-500" />
                <p>{error}</p>
              </div>
            )}

            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-3.5">
                {/* Predefined Roles Selector Dropdown */}
                <div>
                  <label htmlFor="role-select" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Predefined Roles (Autofill Helper)
                  </label>
                  <div className="relative mt-1">
                    <select
                      id="role-select"
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "manager") {
                          setEmail("jainrishabh2610@gmail.com");
                          setPassword("password123");
                        } else if (val === "dispatcher") {
                          setEmail("rishabhjainwork1@gmail.com");
                          setPassword("password123");
                        } else if (val === "safety") {
                          setEmail("testthampi@gmail.com");
                          setPassword("password123");
                        } else if (val === "finance") {
                          setEmail("rishabh.jain.6112@gmail.com");
                          setPassword("password123");
                        } else {
                          setEmail("");
                          setPassword("");
                        }
                      }}
                      className="block w-full appearance-none rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 pl-4.5 pr-10 py-2.5 text-zinc-900 dark:text-white shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs transition-colors cursor-pointer"
                    >
                      <option value="" className="text-zinc-900 dark:text-white bg-white dark:bg-zinc-900">Choose a role to sign in...</option>
                      <option value="manager" className="text-zinc-900 dark:text-white bg-white dark:bg-zinc-900">Fleet Manager</option>
                      <option value="dispatcher" className="text-zinc-900 dark:text-white bg-white dark:bg-zinc-900">Dispatcher</option>
                      <option value="safety" className="text-zinc-900 dark:text-white bg-white dark:bg-zinc-900">Safety Officer</option>
                      <option value="finance" className="text-zinc-900 dark:text-white bg-white dark:bg-zinc-900">Financial Analyst</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-500">
                      <span className="text-[9px]">▼</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-xs font-medium text-zinc-750 dark:text-zinc-300">
                    Email Address
                  </label>
                  <div className="relative mt-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-450 dark:text-zinc-500">
                      <Mail className="h-4.5 w-4.5" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 pl-9 pr-3 py-2.5 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs transition-colors"
                      placeholder="name@transitops.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-xs font-medium text-zinc-750 dark:text-zinc-300">
                    Password
                  </label>
                  <div className="relative mt-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-450 dark:text-zinc-500">
                      <KeyRound className="h-4.5 w-4.5" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 pl-9 pr-9 py-2.5 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs transition-colors"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors cursor-pointer"
                      aria-label="Toggle Password Visibility"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <Link
                  href="/forgot-password"
                  className="font-medium text-blue-600 dark:text-blue-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                >
                  Forgot your password?
                </Link>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative flex w-full justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white transition-all hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  ) : (
                    <span className="flex items-center gap-2">
                      <LogIn className="h-3.5 w-3.5" /> Sign In
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Footer padding to balance the layout height */}
        <div className="h-10"></div>
      </div>
    </div>
  );
}
