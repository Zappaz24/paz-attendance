export const APP_TIME_ZONE = "Asia/Manila";

/** Today's calendar date in the school's time zone (YYYY-MM-DD). */
export function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Renders a DATE column without timezone drift. */
export function formatDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function formatWeekday(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "UTC",
    weekday: "long",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

/** Renders a TIMESTAMPTZ column as local school time. */
export function formatTime(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: APP_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));
}

export function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: APP_TIME_ZONE,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));
}

/** Oldest → newest list of the last `count` dates, ending today. */
export function lastNDates(count: number): string[] {
  const [year, month, day] = todayISO().split("-").map(Number);
  const todayUtc = Date.UTC(year, month - 1, day);
  return Array.from({ length: count }, (_, index) => {
    const offset = (count - 1 - index) * 86_400_000;
    return new Date(todayUtc - offset).toISOString().slice(0, 10);
  });
}

/** e.g. "Oct 28" — compact label for charts. */
export function shortDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}
