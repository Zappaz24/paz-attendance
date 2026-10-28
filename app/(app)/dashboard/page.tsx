import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { requireAdmin } from "@/lib/auth";
import { formatDate, formatTime, formatWeekday, todayISO } from "@/lib/format";
import { getDashboardStats, getRecentCheckIns } from "@/lib/queries";

export const metadata = { title: "Dashboard · PAZ Attendance" };

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const { profile } = await requireAdmin();
  const today = todayISO();

  const [stats, recent] = await Promise.all([
    getDashboardStats(today),
    getRecentCheckIns(6),
  ]);

  const marked = stats.present + stats.late + stats.absent + stats.excused;
  const segments = [
    { label: "Present", count: stats.present, color: "bg-emerald-500" },
    { label: "Late", count: stats.late, color: "bg-amber-500" },
    { label: "Absent", count: stats.absent, color: "bg-rose-500" },
    { label: "Excused", count: stats.excused, color: "bg-sky-500" },
    { label: "Not marked", count: stats.unmarked, color: "bg-slate-200" },
  ].filter((segment) => segment.count > 0);

  const denominator = Math.max(stats.studentCount, 1);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-emerald-600">
            {formatWeekday(today)} · {formatDate(today)}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            Good day, {profile.full_name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {marked === 0
              ? "No attendance has been recorded for today yet."
              : `${marked} of ${stats.studentCount} students have a record today.`}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/attendance?date=${today}`}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Mark attendance
          </Link>
          <Link
            href="/students"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Add student
          </Link>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Students enrolled"
          value={stats.studentCount}
          hint={stats.studentCount === 0 ? "Seed data not loaded" : "Across all sections"}
        />
        <StatCard label="Sections" value={stats.sectionCount} hint="Grade 7–12 classes" />
        <StatCard
          label="Present today"
          value={stats.present}
          hint={
            stats.late > 0
              ? `${stats.late} more arrived late`
              : "On-time check-ins only"
          }
        />
        <StatCard
          label="Not yet marked"
          value={stats.unmarked}
          hint={stats.unmarked === 0 ? "Roster fully accounted for" : "Needs a status today"}
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-semibold text-slate-900">Today&apos;s breakdown</h2>
          <span className="text-sm text-slate-500">{stats.studentCount} students</span>
        </div>

        {stats.studentCount === 0 ? (
          <p className="mt-4 text-sm text-slate-600">
            The roster is empty. Run <code className="font-mono text-xs">npx supabase db reset</code>{" "}
            to load the seed data, or add a student manually.
          </p>
        ) : (
          <>
            <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-slate-100">
              {segments.map((segment) => (
                <div
                  key={segment.label}
                  className={segment.color}
                  style={{ width: `${(segment.count / denominator) * 100}%` }}
                  title={`${segment.label}: ${segment.count}`}
                />
              ))}
            </div>
            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {segments.map((segment) => (
                <li key={segment.label} className="flex items-center gap-2 text-slate-600">
                  <span className={`h-2.5 w-2.5 rounded-full ${segment.color}`} />
                  {segment.label}
                  <span className="font-semibold text-slate-900">{segment.count}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <h2 className="font-semibold text-slate-900">Recent check-ins</h2>
          <Link
            href={`/attendance?date=${today}`}
            className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
          >
            View attendance
          </Link>
        </div>

        {recent.length === 0 ? (
          <p className="px-6 py-8 text-sm text-slate-600">
            No timestamps yet. Mark a student present to see the clock start.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-6 py-3 font-medium">Student</th>
                  <th className="px-6 py-3 font-medium">Section</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recent.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-6 py-3 font-medium text-slate-900">{entry.studentName}</td>
                    <td className="px-6 py-3 text-slate-600">{entry.sectionName ?? "Unassigned"}</td>
                    <td className="px-6 py-3">
                      <StatusBadge status={entry.status} />
                    </td>
                    <td className="px-6 py-3 font-mono text-xs text-slate-600">
                      {formatTime(entry.timeIn)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
