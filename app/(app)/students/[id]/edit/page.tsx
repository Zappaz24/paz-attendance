import Link from "next/link";
import { notFound } from "next/navigation";
import { updateStudent } from "@/actions/students";
import { StudentForm } from "@/components/student-form";
import { requireAdmin } from "@/lib/auth";
import { getStudent, listSections } from "@/lib/queries";

export const metadata = { title: "Edit student · PAZ Attendance" };

export default async function EditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();

  const { id } = await params;
  const [student, sections] = await Promise.all([getStudent(id), listSections()]);

  if (!student) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <Link href="/students" className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
          ← Back to students
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
          Edit {student.full_name}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {student.sectionName ?? "Unassigned"} · LRN {student.lrn}
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <StudentForm
          action={updateStudent}
          sections={sections}
          student={student}
          submitLabel="Save changes"
        />
      </section>
    </div>
  );
}
