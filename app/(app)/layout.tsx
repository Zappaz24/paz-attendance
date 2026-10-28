import { signOut } from "@/actions/auth";
import { MobileNav, SideNav } from "@/components/nav";
import { requireAdmin } from "@/lib/auth";

// Every screen is session-scoped and reads live data on each request.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, user } = await requireAdmin();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px]">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
          <div className="px-6 py-6">
            <p className="text-xs font-semibold tracking-[0.2em] text-emerald-600 uppercase">
              PAZ NHS
            </p>
            <p className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
              Attendance
            </p>
          </div>

          <SideNav />

          <div className="mt-auto border-t border-slate-200 p-4">
            <p className="truncate text-sm font-medium text-slate-900">{profile.full_name}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
            <form action={signOut} className="mt-3">
              <button
                type="submit"
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Sign out
              </button>
            </form>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 md:justify-end md:px-8">
            <p className="text-sm font-semibold text-slate-900 md:hidden">PAZ Attendance</p>
            <div className="ml-auto flex items-center gap-3 md:ml-0">
              <span className="hidden text-sm text-slate-500 sm:block">{profile.full_name}</span>
              <form action={signOut} className="md:hidden">
                <button
                  type="submit"
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700"
                >
                  Sign out
                </button>
              </form>
            </div>
          </header>

          <MobileNav />

          <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
