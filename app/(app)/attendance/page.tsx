import Link from "next/link";
import { markAllPresent } from "@/actions/attendance";
import { AttendanceControls } from "@/components/attendance-controls";
import { Flash } from "@/components/flash";
import { StatusBadge } from "@/components/status-badge";
import { requireAdmin } from "@/lib/auth";
import { formatDate, formatTime, formatWeekday, todayISO } from "@/lib/format";
import { getAttendanceSheet, listSections } from "@/lib/queries";

export const metadata = { title: "Attendance · PAZ Attendance" };

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; section?: string; flash?: string; error?: string }>;
}) {
  await requireAdmin();

  const params = await searchParams;
  const today = todayISO();

  const requested = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? "") ? params.date! : today;
  const date = requested > today ? today : requested;

  const sections = await listSections();
  const sectionId = sections.find((section) => section.id === params.section)?.id ?? "";
  const sheet = await getAttendanceSheet(date, sectionId || undefined);

  const counts = {
    present: sheet.filter((entry) => entry.record?.status === "present").length,
    late: sheet.filter((entry) => entry.record?.status === "late").length,
    absent: sheet.filter((entry) => entry.record?.status === "absent").length,
    excused: sheet.filter((entry) => entry.record?.status === "excused").length,
    unmarked: sheet.filter((entry) => !entry.record).length,
  };

  const selectedSection = sections.find((section) => section.id === sectionId);
  const isToday = date === today;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {isToday ? "Today's attendance" : "Attendance"}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {formatWeekday(date)} · {formatDate(date)}
            {selectedSection
              ? ` · Grade ${selectedSection.grade_level} — ${selectedSection.name}`
              : " · All sections"}
          </p>
        </div>

        <form action={markAllPresent}>
          <input type="hidden" name="date" value={date} />
          <input type="hidden" name="section" value={sectionId} />
          <button
            type="submit"
            disabled={sheet.length === 0}
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Mark all present
          </button>
        </form>
      </header>

      <Flash flash={params.flash} error={params.error} />

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <form action="/attendance" method="get" className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <label htmlFor="date" className="block text-xs font-medium text-slate-600">
              Date
            </label>
            <input
              id="date"
              type="date"
              name="date"
              defaultValue={date}
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
            Load
          </button>

          <Link
            href={`/attendance?date=${today}`}
            className="pb-2 text-sm font-medium text-slate-500 hover:text-slate-800"
          >
            Reset to today
          </Link>
        </form>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {(
          [
            ["Present", counts.present, "text-emerald-700"],
            ["Late", counts.late, "text-amber-700"],
            ["Absent", counts.absent, "text-rose-700"],
            ["Excused", counts.excused, "text-sky-700"],
            ["Not marked", counts.unmarked, "text-slate-600"],
          ] as const
        ).map(([label, value, color]) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <p className={`mt-1 text-xl font-semibold ${color}`}>{value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="font-semibold text-slate-900">Roster</h2>
          <p className="text-sm text-slate-500">{sheet.length} students</p>
        </div>

        {sheet.length === 0 ? (
          <div className="px-6 py-10 text-sm text-slate-600">
            <p>
              No students in this view.{" "}
              <Link href="/students" className="font-medium text-emerald-700 hover:text-emerald-800">
                Add students
              </Link>{" "}
              or pick another section.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-6 py-3 font-medium">Student</th>
                  <th className="px-6 py-3 font-medium">Section</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Time in</th>
                  <th className="px-6 py-3 text-right font-medium">Mark as</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sheet.map((entry) => (
                  <tr key={entry.student.id} className="align-middle hover:bg-slate-50/60">
                    <td className="px-6 py-3">
                      <p className="font-medium text-slate-900">{entry.student.full_name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {entry.student.gender === "female" ? "Female" : "Male"} ·{" "}
                        <span className="font-mono">{entry.student.lrn}</span>
                      </p>
                    </td>
                    <td className="px-6 py-3 text-slate-600">
                      {entry.sectionName ?? (
                        <span className="text-slate-400">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <StatusBadge status={entry.record?.status ?? null} />
                    </td>
                    <td className="px-6 py-3 font-mono text-xs text-slate-600">
                      {formatTime(entry.record?.time_in ?? null)}
                    </td>
                    <td className="px-6 py-3">
                      <AttendanceControls entry={entry} date={date} sectionId={sectionId} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs text-slate-500">
        Time in is stamped by the database trigger the first time a student is marked present or
        late. Each student can have one record per day — enforced by a unique constraint.
      </p>
    </div>
  );
}
