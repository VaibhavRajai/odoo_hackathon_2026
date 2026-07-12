"use client";

import { useEffect } from "react";
import { AlertOctagon, RotateCw } from "lucide-react";

export default function SafetyOfficerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Safety Officer]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-5 py-24 text-center max-w-md mx-auto">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20">
        <AlertOctagon className="h-7 w-7" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Something went wrong</h2>
        <p className="mt-2 text-sm text-zinc-550 dark:text-zinc-400">
          This page hit an unexpected error. Try again, or head back to the dashboard.
        </p>
      </div>
      <button
        onClick={reset}
        className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 text-sm font-semibold shadow-[0_0_15px_rgba(37,99,235,0.2)] transition-all cursor-pointer"
      >
        <RotateCw className="h-4 w-4" /> Try Again
      </button>
    </div>
  );
}
