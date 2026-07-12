"use client";

import React from "react";
import { Toaster } from "sonner";

/**
 * Scoped to the Safety Officer route subtree only — other roles keep
 * whatever feedback pattern they already use until asked to change.
 */
export default function SafetyOfficerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Toaster richColors position="top-right" theme="system" />
      {children}
    </>
  );
}
