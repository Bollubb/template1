import type { QuizCategory, QuizQuestion } from "./quizBank";

export type QuizMode = "daily" | "weekly";

export type QuizRunState = {
  mode: QuizMode;
  status: "running" | "done";
  idx: number;
  correct: number;
  selected: number | null;
  questions: QuizQuestion[];
  history: {
    id: string;
    category: QuizCategory;
    q: string;
    options: string[];
    answer: number;
    selected: number;
    correct: boolean;
  }[];
};

export type DailyQuizState = {
  dayKey: string; // YYYY-MM-DD
  status: "idle" | "done";
  streak: number;
};

export type WeeklyQuizState = {
  weekKey: string; // YYYY-W##
  status: "idle" | "done";
};

export type QuizHistoryEntry = {
  id: string; // unique
  mode: QuizMode;
  at: string; // ISO
  correct: number;
  total: number;
  byCategory: Record<QuizCategory, { correct: number; total: number }>;
};

const LS_DAILY = "nd_quiz_daily";
const LS_WEEKLY = "nd_quiz_weekly";
const LS_HISTORY = "nd_quiz_history";

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function safeJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function getDailyState(): DailyQuizState {
  const dayKey = new Date().toISOString().slice(0, 10);
  const fallback: DailyQuizState = { dayKey, status: "idle", streak: 0 };
  if (!isBrowser()) return fallback;

  const parsed = safeJson<DailyQuizState>(localStorage.getItem(LS_DAILY), fallback);
  if (parsed.dayKey !== dayKey) {
    // new day: keep streak, reset status
    return { ...fallback, streak: parsed.streak || 0 };
  }
  return { ...fallback, ...parsed };
}

export function setDailyState(v: DailyQuizState) {
  if (!isBrowser()) return;
  localStorage.setItem(LS_DAILY, JSON.stringify(v));
}

export function getWeeklyState(): WeeklyQuizState {
  const now = new Date();
  const weekKey = getWeekKey(now);
  const fallback: WeeklyQuizState = { weekKey, status: "idle" };
  if (!isBrowser()) return fallback;

  const parsed = safeJson<WeeklyQuizState>(localStorage.getItem(LS_WEEKLY), fallback);
  if (parsed.weekKey !== weekKey) return fallback;
  return { ...fallback, ...parsed };
}

export function setWeeklyState(v: WeeklyQuizState) {
  if (!isBrowser()) return;
  localStorage.setItem(LS_WEEKLY, JSON.stringify(v));
}

export function getQuizHistory(): QuizHistoryEntry[] {
  if (!isBrowser()) return [];
  return safeJson<QuizHistoryEntry[]>(localStorage.getItem(LS_HISTORY), []);
}

export function pushQuizHistory(entry: QuizHistoryEntry) {
  if (!isBrowser()) return;
  const arr = getQuizHistory();
  arr.unshift(entry);
  // keep last 60 runs
  localStorage.setItem(LS_HISTORY, JSON.stringify(arr.slice(0, 60)));
}

export function calcDailyReward(correct: number, total: number, perfect: boolean, streak: number) {
  const base = 25;
  const perCorrect = correct * 6;
  const perfectBonus = perfect ? 20 : 0;
  const streakBonus = Math.min(20, Math.max(0, streak) * 2);
  return base + perCorrect + perfectBonus + streakBonus;
}

export function calcWeeklyReward(correct: number, total: number, perfect: boolean) {
  const base = 80;
  const perCorrect = correct * 8;
  const perfectBonus = perfect ? 35 : 0;
  return base + perCorrect + perfectBonus;
}

export function calcXpForQuiz(mode: QuizMode, correct: number, total: number) {
  // XP: weekly > daily. reward performance.
  const ratio = total > 0 ? correct / total : 0;
  const base = mode === "weekly" ? 80 : 35;
  const perf = Math.round(ratio * (mode === "weekly" ? 70 : 45));
  return base + perf;
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

export function getWeekKey(d: Date) {
  const year = d.getFullYear();
  const week = getISOWeek(d);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

function nextMonday00(d: Date) {
  const n = new Date(d);
  const day = n.getDay() || 7; // 1..7
  const add = day === 1 ? 7 : 8 - day;
  n.setDate(n.getDate() + add);
  n.setHours(0, 0, 0, 0);
  return n;
}

// ISO week number
function getISOWeek(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
