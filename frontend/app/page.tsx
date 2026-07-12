"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "./api-client";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await apiFetch("/api/auth/me");
        if (res.success && res.data.dashboardPath) {
          router.replace(res.data.dashboardPath);
        } else {
          router.replace("/login");
        }
      } catch {
        router.replace("/login");
      }
    }
    checkAuth();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
        <p className="text-zinc-400 font-medium">Checking authorization...</p>
      </div>
    </div>
  );
}
