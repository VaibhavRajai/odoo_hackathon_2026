"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "../../api-client";
import { useTheme } from "../../theme-provider";
import { ShieldCheck, ShieldAlert, KeyRound, Mail, ArrowLeft, Send, CheckCircle2, RefreshCw, Sun, Moon } from "lucide-react";

interface Account {
  id: string;
  name: string;
  email: string;
  role: string;
}

type FlowStep = "SELECT_ACCOUNT" | "VERIFY_OTP" | "RESET_PASSWORD" | "SUCCESS";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  // Accounts list
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Flow State
  const [step, setStep] = useState<FlowStep>("SELECT_ACCOUNT");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Status State
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch accounts on mount
  useEffect(() => {
    async function loadAccounts() {
      try {
        const res = await apiFetch("/api/auth/accounts");
        if (res.success && Array.isArray(res.data)) {
          setAccounts(res.data);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load accounts list.");
      }
    }
    loadAccounts();
  }, []);

  // Filter accounts based on query
  const filteredAccounts = accounts.filter(
    (acc) =>
      acc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Action 1: Send OTP
  const handleSendOTP = async () => {
    if (!selectedAccount) return;
    setError("");
    setLoading(true);

    try {
      await apiFetch("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: selectedAccount.email }),
      });
      setSuccessMessage(`OTP sent successfully to ${selectedAccount.email}`);
      setStep("VERIFY_OTP");
    } catch (err: any) {
      setError(err.message || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  // Action 2: Resend OTP
  const handleResendOTP = async () => {
    if (!selectedAccount) return;
    setError("");
    setSuccessMessage("");
    setLoading(true);

    try {
      await apiFetch("/api/auth/resend-otp", {
        method: "POST",
        body: JSON.stringify({ email: selectedAccount.email }),
      });
      setSuccessMessage("A new OTP has been sent to your email.");
    } catch (err: any) {
      setError(err.message || "Failed to resend OTP.");
    } finally {
      setLoading(false);
    }
  };

  // Action 3: Verify OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount || !otp) return;
    setError("");
    setSuccessMessage("");
    setLoading(true);

    try {
      const res = await apiFetch("/api/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ userId: selectedAccount.id, otp }),
      });

      if (res.success) {
        setSuccessMessage("OTP verified successfully.");
        setStep("RESET_PASSWORD");
      }
    } catch (err: any) {
      setError(err.message || "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  // Action 4: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) return;
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    setSuccessMessage("");
    setLoading(true);

    try {
      await apiFetch("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ userId: selectedAccount.id, newPassword }),
      });
      setStep("SUCCESS");
    } catch (err: any) {
      setError(err.message || "Password reset failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4 py-12 sm:px-6 lg:px-8 transition-colors duration-200 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-0 -left-4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl dark:bg-blue-600/5 pointer-events-none"></div>
      <div className="absolute bottom-0 -right-4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl dark:bg-purple-600/5 pointer-events-none"></div>

      {/* Floating Theme Selector */}
      <button
        onClick={toggleTheme}
        type="button"
        className="absolute top-6 right-6 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-850 transition-all cursor-pointer"
        aria-label="Toggle Theme"
      >
        {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
      </button>

      <div className="w-full max-w-md space-y-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-8 backdrop-blur-xl shadow-2xl transition-all duration-200">
        
        {/* Title Block */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-500 border border-blue-500/20 shadow-[0_0_15px_rgba(37,99,235,0.1)]">
            <KeyRound className="h-7 w-7" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white font-sans">
            Forgot Password
          </h2>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            {step === "SELECT_ACCOUNT" && "Select your TransitOps account to proceed"}
            {step === "VERIFY_OTP" && "Enter the verification code sent to your email"}
            {step === "RESET_PASSWORD" && "Choose a new secure password"}
            {step === "SUCCESS" && "Password reset complete"}
          </p>
        </div>

        {/* Global Notifications */}
        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
            <ShieldAlert className="h-5 w-5 shrink-0 text-red-500" />
            <p>{error}</p>
          </div>
        )}

        {successMessage && step !== "SUCCESS" && (
          <div className="flex items-start gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-500" />
            <p>{successMessage}</p>
          </div>
        )}

        {/* STEP 1: Select Account */}
        {step === "SELECT_ACCOUNT" && (
          <div className="space-y-6">
            <div className="relative">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Account to Reset
              </label>
              
              {/* Searchable Select Button */}
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex w-full items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-4 py-3.5 text-left text-zinc-900 dark:text-white shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm cursor-pointer"
              >
                <span>
                  {selectedAccount
                    ? `${selectedAccount.name} (${selectedAccount.role})`
                    : "Select pre-seeded account..."}
                </span>
                <span className="text-zinc-500">▼</span>
              </button>

              {/* Dropdown Container */}
              {dropdownOpen && (
                <div className="absolute z-10 mt-2 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-2 shadow-xl transition-all">
                  <input
                    type="text"
                    placeholder="Search accounts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-zinc-250 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500 mb-2"
                  />
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {filteredAccounts.length > 0 ? (
                      filteredAccounts.map((acc) => (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() => {
                            setSelectedAccount(acc);
                            setDropdownOpen(false);
                            setSearchQuery("");
                          }}
                          className={`w-full text-left rounded-lg px-3 py-2.5 text-sm transition-colors cursor-pointer ${
                            selectedAccount?.id === acc.id
                              ? "bg-blue-600 text-white font-medium"
                              : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                          }`}
                        >
                          <div className="font-semibold">{acc.name}</div>
                          <div className="text-xs text-zinc-550 dark:text-zinc-400 group-hover:text-zinc-300">
                            {acc.role} &bull; {acc.email}
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="text-center py-4 text-sm text-zinc-500">
                        No accounts match search
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleSendOTP}
              disabled={loading || !selectedAccount}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white transition-all hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                <>
                  <Send className="h-4 w-4" /> Send OTP Code
                </>
              )}
            </button>
          </div>
        )}

        {/* STEP 2: Verify OTP */}
        {step === "VERIFY_OTP" && selectedAccount && (
          <form onSubmit={handleVerifyOTP} className="space-y-6">
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Enter 6-digit OTP
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-450 dark:text-zinc-500">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <input
                  id="otp"
                  type="text"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 pl-10 pr-3 py-3 text-center text-xl font-bold tracking-widest text-zinc-900 dark:text-white placeholder-zinc-350 dark:placeholder-zinc-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="000000"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={loading}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-850 px-4 py-3 text-sm font-medium text-zinc-750 dark:text-zinc-300 transition-colors disabled:opacity-50 cursor-pointer bg-white dark:bg-transparent"
              >
                <RefreshCw className="h-4 w-4" /> Resend OTP
              </button>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-3 text-sm font-semibold text-white transition-colors disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                ) : (
                  "Verify OTP"
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Reset Password */}
        {step === "RESET_PASSWORD" && (
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  New Password (min 8 chars)
                </label>
                <div className="relative mt-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-450 dark:text-zinc-500">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <input
                    id="newPassword"
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 pl-10 pr-3 py-3 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-650 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Confirm Password
                </label>
                <div className="relative mt-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-450 dark:text-zinc-500">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <input
                    id="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 pl-10 pr-3 py-3 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-655 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-3.5 text-sm font-semibold text-white transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                "Update Password"
              )}
            </button>
          </form>
        )}

        {/* STEP 4: Success Screen */}
        {step === "SUCCESS" && (
          <div className="space-y-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border border-emerald-500/20">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Password Updated</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Your password has been changed successfully. You can now log in using your new credentials.
              </p>
            </div>
            <button
              onClick={() => router.push("/login")}
              className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-3 text-sm font-semibold text-white transition-colors cursor-pointer"
            >
              Go to Login
            </button>
          </div>
        )}

        {/* Back navigation link */}
        {step !== "SUCCESS" && (
          <div className="text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm font-medium text-zinc-400 dark:text-zinc-500 hover:text-zinc-650 dark:hover:text-zinc-300 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Sign In
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
