export type QuizMode = "daily" | "weekly";

export type QuizRunState = {
  mode: QuizMode;
  status: "running" | "done";
  idx: number;
  correct: number;
  selected: number | null;
  questions: any[];
  history: any[];
};

export type DailyQuizState = {
  dayKey: string;
  status: "idle" | "done";
  streak: number;
};

export type WeeklyQuizState = {
  weekKey: string;
  status: "idle" | "done";
};

const LS_DAILY = "nd_quiz_daily";
const LS_WEEKLY = "nd_quiz_weekly";

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function getDailyState(): DailyQuizState {
  const dayKey = new Date().toISOString().slice(0, 10);
  const fallback: DailyQuizState = { dayKey, status: "idle", streak: 0 };
  if (!isBrowser()) return fallback;

  try {
    const raw = localStorage.getItem(LS_DAILY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as DailyQuizState;
    // reset if day changed
    if (parsed.dayKey !== dayKey) return { ...fallback, streak: parsed.streak || 0 };
    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}

export function setDailyState(v: DailyQuizState) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(LS_DAILY, JSON.stringify(v));
  } catch {}
}

export function getWeeklyState(): WeeklyQuizState {
  const now = new Date();
  const year = now.getFullYear();
  const week = getISOWeek(now);
  const weekKey = `${year}-W${String(week).padStart(2, "0")}`;
  const fallback: WeeklyQuizState = { weekKey, status: "idle" };
  if (!isBrowser()) return fallback;

  try {
    const raw = localStorage.getItem(LS_WEEKLY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as WeeklyQuizState;
    if (parsed.weekKey !== weekKey) return fallback;
    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}

export function setWeeklyState(v: WeeklyQuizState) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(LS_WEEKLY, JSON.stringify(v));
  } catch {}
}

export function calcDailyReward(correct: number, total: number, perfect: boolean, streak: number) {
  // base + per corrette + perfect bonus + streak bonus (cap)
  const base = 25;
  const perCorrect = correct * 6;
  const perfectBonus = perfect ? 20 : 0;
  const streakBonus = Math.min(20, streak * 2);
  return base + perCorrect + perfectBonus + streakBonus;
}

export function calcWeeklyReward(correct: number, total: number, perfect: boolean) {
  const base = 80;
  const perCorrect = correct * 8;
  const perfectBonus = perfect ? 35 : 0;
  return base + perCorrect + perfectBonus;
}

export function getNextDailyResetMs() {
  const now = new Date();
  const next = new Date();
  next.setHours(24, 0, 0, 0);
  return next.getTime() - now.getTime();
}

export function getNextWeeklyResetMs() {
  const now = new Date();
  const next = nextMonday00(now);
  return next.getTime() - now.getTime();
}

function nextMonday00(d: Date) {
  const n = new Date(d);
  const day = n.getDay() || 7; // 1..7
  const add = day === 1 ? 7 : 8 - day;
  n.setDate(n.getDate() + add);
  n.setHours(0, 0, 0, 0);
  return n;
}

// ISO week number (simple, sufficient for app logic)
function getISOWeek(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
