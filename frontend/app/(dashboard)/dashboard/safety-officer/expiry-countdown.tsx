import React from "react";

const HORIZON_DAYS = 90; // bar's full-scale reference window, purely visual

function daysRemaining(expiry: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiryDate = new Date(expiry);
  expiryDate.setHours(0, 0, 0, 0);
  return Math.round((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function bandFor(days: number) {
  if (days < 0) return { color: "#ef4444", label: `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago` };
  if (days === 0) return { color: "#ef4444", label: "Expires today" };
  if (days <= 7) return { color: "#ef4444", label: `Expires in ${days} day${days === 1 ? "" : "s"}` };
  if (days <= 30) return { color: "#f59e0b", label: `Expires in ${days} days` };
  return { color: "#10b981", label: `Expires in ${days} days` };
}

export default function ExpiryCountdown({ expiry }: { expiry: string }) {
  const days = daysRemaining(expiry);
  const { color, label } = bandFor(days);
  const width = Math.max(0, Math.min(100, (days / HORIZON_DAYS) * 100));

  return (
    <div className="min-w-35">
      <p className="text-xs font-semibold" style={{ color }}>{label}</p>
      <div className="mt-1 h-1.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${width}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}
