
const KEY = "nd_daily_plan";

export function getDailyDone(): number {
  if (typeof window === "undefined") return 0;
  return Number(localStorage.getItem(KEY) || 0);
}

export function completeDaily() {
  if (typeof window === "undefined") return;
  const n = getDailyDone() + 1;
  localStorage.setItem(KEY, String(n));
}
