import type { QuizQuestion } from "./quizBank";

type CatStats = { correct: number; total: number; lastTs: number };
type QStats = { wrong: number; total: number; lastTs: number };

type AdaptiveState = {
  v: 1;
  cats: Record<string, CatStats>;
  qs: Record<string, QStats>;
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
  const fallback: AdaptiveState = { v: 1, cats: {}, qs: {} };
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

  const qq = s.qs[q.id] || { wrong: 0, total: 0, lastTs: 0 };
  qq.total += 1;
  if (!ok) qq.wrong += 1;
  qq.lastTs = now;
  s.qs[q.id] = qq;

  setState(s);
}

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function categoryWeakness(cat: string, s: AdaptiveState) {
  const st = s.cats[cat];
  if (!st || st.total < 3) return 0.35; // explore if not enough data
  const acc = st.correct / st.total;
  return clamp01(1 - acc);
}

/**
 * Picks questions favoring the user's weak categories (local-only, no backend).
 * - 60% from 2 weakest categories (if available)
 * - 40% mixed/random across remaining
 */
export function pickAdaptiveQuestions(
  bank: QuizQuestion[],
  n: number,
  opts?: { excludeIds?: string[] }
) {
  const exclude = new Set(opts?.excludeIds || []);
  const pool = bank.filter((q) => !exclude.has(q.id));
  const s = getState();

  const cats = Array.from(new Set(pool.map((q) => (q.category || "altro") as string)));
  const ranked = cats
    .map((c) => ({ c, w: categoryWeakness(c, s) }))
    .sort((a, b) => b.w - a.w);

  const weak1 = ranked[0]?.c;
  const weak2 = ranked[1]?.c;

  const targetWeak = Math.min(n, Math.max(0, Math.round(n * 0.6)));
  const picked: QuizQuestion[] = [];

  const weakPool = pool.filter(
    (q) => (q.category || "altro") === weak1 || (q.category || "altro") === weak2
  );

  const weakSorted = [...weakPool].sort((a, b) => {
    const aw = (s.qs[a.id]?.wrong || 0) / Math.max(1, s.qs[a.id]?.total || 0);
    const bw = (s.qs[b.id]?.wrong || 0) / Math.max(1, s.qs[b.id]?.total || 0);
    return bw - aw;
  });

  picked.push(...shuffle(weakSorted).slice(0, targetWeak));

  const remaining = n - picked.length;
  if (remaining > 0) {
    const restPool = pool.filter((q) => !picked.some((p) => p.id === q.id));
    picked.push(...shuffle(restPool).slice(0, remaining));
  }

  return shuffle(picked).slice(0, n);
}


export function pickAdaptiveQuestionsBalanced(
  bank: QuizQuestion[],
  plan: { easy: number; medium: number; hard: number },
  opts?: { excludeIds?: string[] }
) {
  const exclude = new Set(opts?.excludeIds || []);
  const pool = bank.filter((q) => !exclude.has(q.id));
  const byDiff = {
    easy: pool.filter((q) => q.difficulty === "easy"),
    medium: pool.filter((q) => q.difficulty === "medium"),
    hard: pool.filter((q) => q.difficulty === "hard"),
  } as const;

  const picked: QuizQuestion[] = [];

  const pickFrom = (arr: QuizQuestion[], n: number) => {
    if (n <= 0) return;
    const already = new Set(picked.map((p) => p.id));
    const filtered = arr.filter((q) => !already.has(q.id));
    picked.push(...pickAdaptiveQuestions(filtered, n));
  };

  pickFrom(byDiff.easy, plan.easy);
  pickFrom(byDiff.medium, plan.medium);
  pickFrom(byDiff.hard, plan.hard);

  // fallback: if we couldn't fill (e.g., small bucket), fill from remaining pool
  const target = plan.easy + plan.medium + plan.hard;
  const remaining = target - picked.length;
  if (remaining > 0) {
    const already = new Set(picked.map((p) => p.id));
    const rest = pool.filter((q) => !already.has(q.id));
    picked.push(...shuffle(rest).slice(0, remaining));
  }

  return shuffle(picked).slice(0, target);
}
