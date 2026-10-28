import Link from "next/link";
import { deleteSection } from "@/actions/sections";
import { DeleteButton } from "@/components/delete-button";
import { Flash } from "@/components/flash";
import { SectionForm } from "@/components/section-form";
import { requireAdmin } from "@/lib/auth";
import { listSectionOverview } from "@/lib/queries";

export const metadata = { title: "Sections · PAZ Attendance" };

export default async function SectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ flash?: string }>;
}) {
  await requireAdmin();

  const { flash } = await searchParams;
  const sections = await listSectionOverview();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Sections</h1>
        <p className="mt-1 text-sm text-slate-600">
          A section is the class a student belongs to. Deleting one keeps its students — they
          simply become unassigned.
        </p>
      </header>

      <Flash flash={flash} />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-slate-900">New section</h2>
        <SectionForm />
      </section>

      {sections.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-sm text-slate-600">
          No sections yet. Create one above, or run{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">
            npx supabase db reset
          </code>{" "}
          to load the demo data.
        </p>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sections.map((section) => (
            <article
              key={section.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold tracking-wide text-emerald-600 uppercase">
                      Grade {section.grade_level}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-slate-900">{section.name}</h2>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                    {section.studentCount} {section.studentCount === 1 ? "student" : "students"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  Adviser: {section.adviser ?? <span className="text-slate-400">Unassigned</span>}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <Link
                  href={`/students?section=${section.id}`}
                  className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
                >
                  View roster
                </Link>
                <DeleteButton
                  action={deleteSection}
                  id={section.id}
                  label="Delete"
                  confirmMessage={`Delete ${section.name}? Its ${section.studentCount} student(s) will become unassigned.`}
                />
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
