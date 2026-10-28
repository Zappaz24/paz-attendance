import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { formatDate, lastNDates, todayISO } from "@/lib/format";
import { getReport, listSections } from "@/lib/queries";

export const metadata = { title: "Reports · PAZ Attendance" };

function isDate(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string; section?: string }>;
}) {
  await requireAdmin();

  const params = await searchParams;
  const today = todayISO();
  const defaultStart = lastNDates(7)[0];

  let start = isDate(params.start) ? params.start : defaultStart;
  let end = isDate(params.end) ? params.end : today;

  if (start > end) [start, end] = [end, start];
  if (end > today) end = today;
  if (start > today) start = defaultStart;

  const sections = await listSections();
  const sectionId = sections.find((section) => section.id === params.section)?.id ?? "";
  const rows = await getReport(start, end, sectionId || undefined);

  const withRecords = rows.filter((row) => row.marked > 0);
  const averageRate =
    withRecords.length === 0
      ? 0
      : Math.round(withRecords.reduce((sum, row) => sum + row.rate, 0) / withRecords.length);
  const perfect = withRecords.filter((row) => row.rate === 100).length;
  const atRisk = withRecords.filter((row) => row.rate < 80).length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Reports</h1>
        <p className="mt-1 text-sm text-slate-600">
          Attendance rate per student from {formatDate(start)} to {formatDate(end)}.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <form action="/reports" method="get" className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <label htmlFor="start" className="block text-xs font-medium text-slate-600">
              From
            </label>
            <input
              id="start"
              type="date"
              name="start"
              defaultValue={start}
              max={today}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="end" className="block text-xs font-medium text-slate-600">
              To
            </label>
            <input
              id="end"
              type="date"
              name="end"
              defaultValue={end}
              max={today}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="section" className="block text-xs font-medium text-slate-600">
              Section
            </label>
            <select
              id="section"
              name="section"
              defaultValue={sectionId}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">All sections</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  Grade {section.grade_level} — {section.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Run report
          </button>

          <Link
            href="/reports"
            className="pb-2 text-sm font-medium text-slate-500 hover:text-slate-800"
          >
            Reset
          </Link>
        </form>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Class average</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{averageRate}%</p>
          <p className="mt-1 text-xs text-slate-500">Based on students with records</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Perfect attendance</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-600">{perfect}</p>
          <p className="mt-1 text-xs text-slate-500">Present or late every recorded day</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Below 80%</p>
          <p className="mt-2 text-3xl font-semibold text-rose-600">{atRisk}</p>
          <p className="mt-1 text-xs text-slate-500">Students who may need follow-up</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="font-semibold text-slate-900">Per-student breakdown</h2>
          <p className="text-sm text-slate-500">
            {rows.length} {rows.length === 1 ? "student" : "students"}
          </p>
        </div>

        {rows.length === 0 ? (
          <p className="px-6 py-10 text-sm text-slate-600">
            No students in this view. Add students, then mark attendance to populate the report.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-6 py-3 font-medium">Student</th>
                  <th className="px-6 py-3 font-medium">Section</th>
                  <th className="px-6 py-3 text-right font-medium">Present</th>
                  <th className="px-6 py-3 text-right font-medium">Late</th>
                  <th className="px-6 py-3 text-right font-medium">Absent</th>
                  <th className="px-6 py-3 text-right font-medium">Excused</th>
                  <th className="px-6 py-3 font-medium">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.student.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-3">
                      <p className="font-medium text-slate-900">{row.student.full_name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {row.student.gender === "female" ? "Female" : "Male"}
                      </p>
                    </td>
                    <td className="px-6 py-3 text-slate-600">
                      {row.sectionName ?? <span className="text-slate-400">Unassigned</span>}
                    </td>
                    <td className="px-6 py-3 text-right text-slate-700">{row.present}</td>
                    <td className="px-6 py-3 text-right text-slate-700">{row.late}</td>
                    <td className="px-6 py-3 text-right text-slate-700">{row.absent}</td>
                    <td className="px-6 py-3 text-right text-slate-700">{row.excused}</td>
                    <td className="px-6 py-3">
                      {row.marked === 0 ? (
                        <span className="text-xs text-slate-400">No records</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full ${row.rate >= 80 ? "bg-emerald-500" : "bg-rose-500"}`}
                              style={{ width: `${row.rate}%` }}
                            />
                          </div>
                          <span className="w-10 text-right text-xs font-semibold text-slate-700">
                            {row.rate}%
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs text-slate-500">
        Rate = (present + late) ÷ recorded days. Days without a record are excluded.
      </p>
    </div>
  );
}
