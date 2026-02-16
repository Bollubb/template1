import type { QuizQuestion } from "./quizBank";

type CatStats = { correct: number; total: number; lastTs: number };

type AdaptiveState = {
  v: 1;
  cats: Record<string, CatStats>;
};

const LS_ADAPTIVE = "nd_quiz_adaptive_v1";
const isBrowser = () => typeof window !== "undefined" && typeof localStorage !== "undefined";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function getState(): AdaptiveState {
  const fallback: AdaptiveState = { v: 1, cats: {} };
  if (!isBrowser()) return fallback;
  return safeParse<AdaptiveState>(localStorage.getItem(LS_ADAPTIVE), fallback) || fallback;
}

function setState(v: AdaptiveState) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(LS_ADAPTIVE, JSON.stringify(v));
  } catch {}
}

export function recordQuizAnswer(q: QuizQuestion, ok: boolean) {
  const s = getState();
  const now = Date.now();
  const cat = (q.category || "altro") as string;

  const c = s.cats[cat] || { correct: 0, total: 0, lastTs: 0 };
  c.total += 1;
  if (ok) c.correct += 1;
  c.lastTs = now;
  s.cats[cat] = c;

  setState(s);
}

export type AdaptiveCategorySummary = {
  category: string;
  accuracy: number; // 0..1
  total: number;
  lastTs: number;
};

export function getAdaptiveCategorySummary(): AdaptiveCategorySummary[] {
  const s = getState();
  const rows = Object.entries(s.cats).map(([category, st]) => {
    const accuracy = st.total > 0 ? st.correct / st.total : 0;
    return { category, accuracy, total: st.total, lastTs: st.lastTs };
  });
  rows.sort((a, b) => {
    const wa = 1 - a.accuracy;
    const wb = 1 - b.accuracy;
    if (wb !== wa) return wb - wa;
    return b.lastTs - a.lastTs;
  });
  return rows;
}

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pickSimulationQuestions(bank: QuizQuestion[], count: number, excludeIds: string[] = []): QuizQuestion[] {
  const exclude = new Set(excludeIds);
  const pool = bank.filter((q) => !exclude.has(q.id));
  const base = pool.length >= count ? pool : bank;
  return shuffle(base).slice(0, Math.min(count, base.length));
}
