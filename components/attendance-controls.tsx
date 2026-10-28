import { clearAttendance, markAttendance } from "@/actions/attendance";
import type { AttendanceStatus } from "@/lib/database.types";
import type { AttendanceEntry } from "@/lib/queries";

const options: { value: AttendanceStatus; label: string; active: string }[] = [
  { value: "present", label: "Present", active: "bg-emerald-600 text-white ring-emerald-600" },
  { value: "late", label: "Late", active: "bg-amber-500 text-white ring-amber-500" },
  { value: "absent", label: "Absent", active: "bg-rose-600 text-white ring-rose-600" },
  { value: "excused", label: "Excused", active: "bg-sky-600 text-white ring-sky-600" },
];

export function AttendanceControls({
  entry,
  date,
  sectionId,
}: {
  entry: AttendanceEntry;
  date: string;
  sectionId: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <form action={markAttendance} className="flex flex-wrap gap-1">
        <input type="hidden" name="studentId" value={entry.student.id} />
        <input type="hidden" name="date" value={date} />
        <input type="hidden" name="section" value={sectionId} />
        {options.map((option) => {
          const isCurrent = entry.record?.status === option.value;
          return (
            <button
              key={option.value}
              type="submit"
              name="status"
              value={option.value}
              className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset transition ${
                isCurrent
                  ? option.active
                  : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </form>

      {entry.record ? (
        <form action={clearAttendance}>
          <input type="hidden" name="studentId" value={entry.student.id} />
          <input type="hidden" name="date" value={date} />
          <input type="hidden" name="section" value={sectionId} />
          <button
            type="submit"
            title="Clear this entry"
            aria-label={`Clear attendance for ${entry.student.full_name}`}
            className="rounded-full px-2 py-1 text-xs font-semibold text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            ✕
          </button>
        </form>
      ) : null}
    </div>
  );
}
