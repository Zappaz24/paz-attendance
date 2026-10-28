const successMessages: Record<string, string> = {
  created: "Student added to the roster.",
  updated: "Student record updated.",
  "section-created": "Section created.",
  marked: "Attendance saved.",
  "marked-all": "All listed students marked present.",
  cleared: "Attendance entry cleared.",
};

export function Flash({ flash, error }: { flash?: string; error?: string }) {
  if (error) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
      >
        {error}
      </div>
    );
  }

  const message = flash ? successMessages[flash] : undefined;
  if (!message) return null;

  return (
    <div
      role="status"
      className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
    >
      {message}
    </div>
  );
}
