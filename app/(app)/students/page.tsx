import Link from "next/link";
import { createStudent, deleteStudent } from "@/actions/students";
import { DeleteButton } from "@/components/delete-button";
import { Flash } from "@/components/flash";
import { StudentForm } from "@/components/student-form";
import { requireAdmin } from "@/lib/auth";
import { listSections, listStudents } from "@/lib/queries";

export const metadata = { title: "Students · PAZ Attendance" };

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; section?: string; flash?: string }>;
}) {
  await requireAdmin();

  const { q, section, flash } = await searchParams;
  const search = q?.trim() ?? "";

  const sections = await listSections();
  const activeSection = sections.find((item) => item.id === section);
  const students = await listStudents(search || undefined, activeSection?.id);

  const female = students.filter((student) => student.gender === "female").length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Students</h1>
          <p className="mt-1 text-sm text-slate-600">
            {students.length} {students.length === 1 ? "student" : "students"}
            {activeSection
              ? ` in Grade ${activeSection.grade_level} — ${activeSection.name}`
              : search
                ? ` matching “${search}”`
                : ""}{" "}
            · {female} female · {students.length - female} male
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {activeSection ? (
            <Link
              href={`/students?q=${encodeURIComponent(search)}`}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Clear section filter
            </Link>
          ) : null}
          <Link
            href="/attendance"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Open attendance
          </Link>
        </div>
      </header>

      <Flash flash={flash} />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-slate-900">Add a student</h2>
        <p className="mt-1 mb-4 text-sm text-slate-600">
          LRN must be exactly 12 digits. Gender and section are required at the database level.
        </p>
        <StudentForm action={createStudent} sections={sections} submitLabel="Add student" />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <h2 className="font-semibold text-slate-900">Roster</h2>
          <form action="/students" method="get" className="flex items-center gap-2">
            {activeSection ? <input type="hidden" name="section" value={activeSection.id} /> : null}
            <input
              type="search"
              name="q"
              defaultValue={search}
              placeholder="Search by name"
              className="w-48 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
            />
            <button
              type="submit"
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Search
            </button>
            {search ? (
              <Link
                href={activeSection ? `/students?section=${activeSection.id}` : "/students"}
                className="text-sm text-slate-500 hover:text-slate-800"
              >
                Clear
              </Link>
            ) : null}
          </form>
        </div>

        {students.length === 0 ? (
          <div className="px-6 py-10 text-sm text-slate-600">
            {search ? (
              <p>No student matches “{search}”.</p>
            ) : (
              <p>
                No students yet. Add one above, or load the demo roster with{" "}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">
                  npx supabase db reset
                </code>
                .
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-6 py-3 font-medium">Student</th>
                  <th className="px-6 py-3 font-medium">LRN</th>
                  <th className="px-6 py-3 font-medium">Gender</th>
                  <th className="px-6 py-3 font-medium">Section</th>
                  <th className="px-6 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-3 font-medium text-slate-900">{student.full_name}</td>
                    <td className="px-6 py-3 font-mono text-xs text-slate-600">{student.lrn}</td>
                    <td className="px-6 py-3 text-slate-600 capitalize">{student.gender}</td>
                    <td className="px-6 py-3 text-slate-600">
                      {student.sectionName ? (
                        student.sectionName
                      ) : (
                        <span className="text-slate-400">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/students/${student.id}/edit`}
                          className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        >
                          Edit
                        </Link>
                        <DeleteButton
                          action={deleteStudent}
                          id={student.id}
                          confirmMessage={`Remove ${student.full_name}? Their attendance history will also be deleted.`}
                        />
                      </div>
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
