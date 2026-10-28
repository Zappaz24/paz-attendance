import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata = { title: "Sign in · PAZ Attendance" };
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!isSupabaseConfigured()) redirect("/setup");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  const { error } = await searchParams;

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-emerald-900 p-12 text-emerald-50 lg:flex">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-emerald-700/60 blur-3xl"
        />
        <div>
          <p className="text-sm font-semibold tracking-[0.25em] text-emerald-300 uppercase">
            PAZ National High School
          </p>
          <h1 className="mt-6 max-w-md text-4xl leading-tight font-semibold tracking-tight">
            Attendance, recorded in one place.
          </h1>
          <p className="mt-4 max-w-sm text-emerald-100/80">
            Students, sections, and daily check-ins — with a timestamp for every entry and a
            report you can defend.
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <dt className="text-emerald-300">Records</dt>
            <dd className="mt-1 font-medium">One row per student, per day</dd>
          </div>
          <div>
            <dt className="text-emerald-300">Access</dt>
            <dd className="mt-1 font-medium">Admin-only, enforced by RLS</dd>
          </div>
        </dl>
      </section>

      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <p className="text-sm font-semibold tracking-widest text-emerald-600 uppercase">
              PAZ Attendance
            </p>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Admin sign in</h2>
          <p className="mt-1 mb-6 text-sm text-slate-600">
            Accounts are provisioned by the school. There is no public sign-up.
          </p>

          <LoginForm
            notice={
              error === "not-admin"
                ? "That account has no admin profile. Recreate it with `npm run admin:create`."
                : undefined
            }
          />
        </div>
      </section>
    </main>
  );
}
