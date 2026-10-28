"use client";

import { useActionState } from "react";
import { signIn, type LoginState } from "@/actions/auth";
import { SubmitButton } from "./submit-button";

export function LoginForm({ notice }: { notice?: string }) {
  const [state, formAction] = useActionState<LoginState, FormData>(signIn, null);

  return (
    <form action={formAction} className="space-y-4">
      {notice ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {notice}
        </p>
      ) : null}

      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="admin@school.test"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium text-slate-700">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
        />
      </div>

      {state?.error ? (
        <p role="alert" className="text-sm font-medium text-rose-600">
          {state.error}
        </p>
      ) : null}

      <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
    </form>
  );
}
