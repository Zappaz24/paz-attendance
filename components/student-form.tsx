"use client";

import { useActionState } from "react";
import type { StudentFormState } from "@/actions/students";
import type { Section, Student } from "@/lib/database.types";
import { SubmitButton } from "./submit-button";

type Action = (state: StudentFormState, formData: FormData) => Promise<StudentFormState>;

export function StudentForm({
  action,
  sections,
  student,
  submitLabel,
}: {
  action: Action;
  sections: Section[];
  student?: Student;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState<StudentFormState, FormData>(action, null);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      {student ? <input type="hidden" name="id" value={student.id} /> : null}

      <div className="space-y-1.5 sm:col-span-2">
        <label htmlFor="fullName" className="block text-sm font-medium text-slate-700">
          Full name
        </label>
        <input
          id="fullName"
          name="fullName"
          defaultValue={student?.full_name ?? ""}
          required
          maxLength={80}
          placeholder="Andrea Dela Cruz"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        />
        {state?.errors?.fullName ? (
          <p className="text-sm text-rose-600">{state.errors.fullName[0]}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="lrn" className="block text-sm font-medium text-slate-700">
          LRN (12 digits)
        </label>
        <input
          id="lrn"
          name="lrn"
          defaultValue={student?.lrn ?? ""}
          required
          inputMode="numeric"
          pattern="\d{12}"
          maxLength={12}
          placeholder="100000000001"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono"
        />
        {state?.errors?.lrn ? (
          <p className="text-sm text-rose-600">{state.errors.lrn[0]}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="gender" className="block text-sm font-medium text-slate-700">
          Gender
        </label>
        <select
          id="gender"
          name="gender"
          defaultValue={student?.gender ?? ""}
          required
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="" disabled>
            Select gender
          </option>
          <option value="female">Female</option>
          <option value="male">Male</option>
        </select>
        {state?.errors?.gender ? (
          <p className="text-sm text-rose-600">{state.errors.gender[0]}</p>
        ) : null}
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <label htmlFor="sectionId" className="block text-sm font-medium text-slate-700">
          Section
        </label>
        <select
          id="sectionId"
          name="sectionId"
          defaultValue={student?.section_id ?? ""}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Unassigned</option>
          {sections.map((section) => (
            <option key={section.id} value={section.id}>
              Grade {section.grade_level} — {section.name}
            </option>
          ))}
        </select>
        {state?.errors?.sectionId ? (
          <p className="text-sm text-rose-600">{state.errors.sectionId[0]}</p>
        ) : null}
      </div>

      {state?.message ? (
        <p role="alert" className="text-sm font-medium text-rose-600 sm:col-span-2">
          {state.message}
        </p>
      ) : null}

      <div className="sm:col-span-2">
        <SubmitButton pendingLabel="Saving…">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
