export type DailyKeyed<T> = { dayKey: string; value: T };

function dayKeyNow() {
  return new Date().toISOString().slice(0, 10);
}

function safeJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Get a per-day counter stored in localStorage; auto-resets when day changes. */
export function getDailyCounter(key: string): number {
  if (typeof window === "undefined") return 0;
  const dk = dayKeyNow();
  const raw = localStorage.getItem(key);
  const parsed = safeJson<DailyKeyed<number>>(raw, { dayKey: dk, value: 0 });
  if (parsed.dayKey !== dk) return 0;
  return Number(parsed.value) || 0;
}

/** Set a per-day counter stored in localStorage. */
export function setDailyCounter(key: string, value: number) {
  if (typeof window === "undefined") return;
  const dk = dayKeyNow();
  try {
    localStorage.setItem(key, JSON.stringify({ dayKey: dk, value }));
  } catch {}
}

/** Increment a per-day counter stored in localStorage; returns new value. */
export function incDailyCounter(key: string, delta = 1): number {
  const cur = getDailyCounter(key);
  const next = Math.max(0, cur + delta);
  setDailyCounter(key, next);
  return next;
}

/** Read a per-day flag (boolean) stored in localStorage; auto-resets when day changes. */
export function getDailyFlag(key: string): boolean {
  if (typeof window === "undefined") return false;
  const dk = dayKeyNow();
  const raw = localStorage.getItem(key);
  const parsed = safeJson<DailyKeyed<boolean>>(raw, { dayKey: dk, value: false });
  if (parsed.dayKey !== dk) return false;
  return Boolean(parsed.value);
}

export function setDailyFlag(key: string, value: boolean) {
  if (typeof window === "undefined") return;
  const dk = dayKeyNow();
  try {
    localStorage.setItem(key, JSON.stringify({ dayKey: dk, value }));
  } catch {}
}
