"use client";

import Link from "next/link";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
      <p className="text-xs font-semibold tracking-widest text-rose-600 uppercase">Database error</p>
      <h1 className="mt-2 text-xl font-semibold text-slate-900">Could not load this screen</h1>
      <p className="mt-2 text-sm text-slate-600">
        The app reached Supabase but the query failed. Make sure the local stack is running
        (<code className="font-mono text-xs">npx supabase status</code>) and that migrations were
        applied (<code className="font-mono text-xs">npx supabase db reset</code>).
      </p>

      <div className="mt-6 flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
