const LS_XP = "nd_xp";
const LS_WEEKLY_XP = "nd_weekly_xp"; // Record<weekKey, xpGained>

function getISOWeekKey(d: Date) {
  // ISO-ish week key like 2026-W05
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function safeJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function getXp(): number {
  if (typeof window === "undefined") return 0;
  const n = Number(localStorage.getItem(LS_XP) || "0");
  return Number.isFinite(n) ? n : 0;
}

export function setXp(xp: number) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_XP, String(Math.max(0, Math.floor(xp))));
  } catch {}
}

export function addXp(delta: number): number {
  const cur = getXp();
  const add = Math.max(0, Math.floor(delta));
  const next = cur + add;
  setXp(next);

  // track weekly gained xp for local leaderboard
  if (typeof window !== "undefined") {
    const wk = getISOWeekKey(new Date());
    const map = safeJson<Record<string, number>>(localStorage.getItem(LS_WEEKLY_XP), {});
    map[wk] = (map[wk] || 0) + add;
    try {
      localStorage.setItem(LS_WEEKLY_XP, JSON.stringify(map));
    } catch {}
  }

  return next;
}

export function getWeeklyXpMap(): Record<string, number> {
  if (typeof window === "undefined") return {};
  return safeJson<Record<string, number>>(localStorage.getItem(LS_WEEKLY_XP), {});
}

// Same curve used in ProfileTab
const LEVEL_XP = (lvl: number) => 120 + (lvl - 1) * 60;

export function computeLevel(xp: number) {
  let level = 1;
  let remaining = Math.max(0, xp);
  while (remaining >= LEVEL_XP(level)) {
    remaining -= LEVEL_XP(level);
    level += 1;
  }
  const need = LEVEL_XP(level);
  const pct = need > 0 ? remaining / need : 0;
  return { level, remaining, need, pct };
}
