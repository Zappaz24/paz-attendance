"use client";

import { useActionState } from "react";
import { createSection, type SectionFormState } from "@/actions/sections";
import { SubmitButton } from "./submit-button";

const gradeLevels = [7, 8, 9, 10, 11, 12];

export function SectionForm() {
  const [state, formAction] = useActionState<SectionFormState, FormData>(createSection, null);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-3">
      <div className="space-y-1.5">
        <label htmlFor="name" className="block text-sm font-medium text-slate-700">
          Section name
        </label>
        <input
          id="name"
          name="name"
          required
          maxLength={60}
          placeholder="Rizal"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        />
        {state?.errors?.name ? (
          <p className="text-sm text-rose-600">{state.errors.name[0]}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="gradeLevel" className="block text-sm font-medium text-slate-700">
          Grade level
        </label>
        <select
          id="gradeLevel"
          name="gradeLevel"
          required
          defaultValue=""
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="" disabled>
            Select grade
          </option>
          {gradeLevels.map((level) => (
            <option key={level} value={level}>
              Grade {level}
            </option>
          ))}
        </select>
        {state?.errors?.gradeLevel ? (
          <p className="text-sm text-rose-600">{state.errors.gradeLevel[0]}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="adviser" className="block text-sm font-medium text-slate-700">
          Adviser <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <input
          id="adviser"
          name="adviser"
          maxLength={80}
          placeholder="Ms. Cruz"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        />
        {state?.errors?.adviser ? (
          <p className="text-sm text-rose-600">{state.errors.adviser[0]}</p>
        ) : null}
      </div>

      {state?.message ? (
        <p role="alert" className="text-sm font-medium text-rose-600 sm:col-span-3">
          {state.message}
        </p>
      ) : null}

      <div className="sm:col-span-3">
        <SubmitButton pendingLabel="Creating…">Create section</SubmitButton>
      </div>
    </form>
  );
}
