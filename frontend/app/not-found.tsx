import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-50 dark:bg-zinc-950 text-center px-4 transition-colors duration-200">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-600 dark:text-blue-500 border border-blue-500/20">
        <Compass className="h-8 w-8" />
      </div>
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white">404</h1>
        <p className="mt-2 text-zinc-550 dark:text-zinc-400">This route doesn&apos;t exist in TransitOps.</p>
      </div>
      <Link
        href="/login"
        className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 text-sm font-semibold shadow-[0_0_15px_rgba(37,99,235,0.2)] transition-all"
      >
        Back to Login
      </Link>
    </div>
  );
}
