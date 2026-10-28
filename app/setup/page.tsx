import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata = { title: "Setup · PAZ Attendance" };

const steps = [
  {
    title: "1. Install Docker Desktop",
    body: "Supabase runs locally as Docker containers. Install Docker Desktop, start it, then confirm `docker --version` works in a terminal.",
  },
  {
    title: "2. Start Supabase",
    body: "From the project root run `npx supabase start`. The first run downloads images. When it finishes, `npx supabase status` prints the API URL and keys.",
  },
  {
    title: "3. Create .env.local",
    body: "Copy .env.example to .env.local and paste NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY from `supabase status`.",
  },
  {
    title: "4. Create the admin account",
    body: "Run `npm run admin:create` (creates admin@school.test / admin12345) and then `npm run dev`.",
  },
];

export default function SetupPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center gap-8 px-6 py-12">
      <div>
        <p className="text-sm font-semibold tracking-widest text-emerald-600 uppercase">
          PAZ Attendance
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
          Finish the local setup
        </h1>
        <p className="mt-2 text-slate-600">
          The app is built, but it needs a running Supabase instance before you can sign in.
        </p>
      </div>

      <ol className="space-y-3">
        {steps.map((step) => (
          <li key={step.title} className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-slate-900">{step.title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">{step.body}</p>
          </li>
        ))}
      </ol>

      <pre className="overflow-x-auto rounded-2xl bg-slate-900 p-5 text-sm text-slate-100">
        <code>{`npx supabase start
npx supabase status
npm run admin:create
npm run dev`}</code>
      </pre>

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-slate-500">
          Full walkthrough: <span className="font-mono">docs/demo-setup.md</span>
        </p>
        {isSupabaseConfigured() ? (
          <Link
            href="/login"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Go to sign in
          </Link>
        ) : (
          <span className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-500">
            Waiting for .env.local
          </span>
        )}
      </div>
    </main>
  );
}
