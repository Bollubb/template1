import type { QuizQuestion } from "./quizBank";

/**
 * Adaptive learning (local-first):
 * - tracks per-question performance + spaced repetition due dates
 * - tracks per-category accuracy
 * - provides a picker for "Recupero intelligente" and suggested sessions
 */

type QStat = {
  seen: number;
  correct: number;
  wrong: number;
  streak: number; // consecutive correct
  ease: number; // 1.3..2.5
  lastTs: number;
  dueTs: number;
};

type CatStat = { correct: number; total: number; lastTs: number };

type AdaptiveState = {
  v: 1;
  q: Record<string, QStat>;
  cat: Record<string, CatStat>;
};

const LS = "nd_quiz_adaptive_v1";
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
  const fallback: AdaptiveState = { v: 1, q: {}, cat: {} };
  if (!isBrowser()) return fallback;
  return safeParse<AdaptiveState>(localStorage.getItem(LS), fallback) || fallback;
}

function setState(s: AdaptiveState) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(LS, JSON.stringify(s));
  } catch {}
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function calcIntervalMs(streak: number, ease: number) {
  // Simple SM-2-ish intervals (local-first, predictable):
  // 1 -> 1d, 2 -> 3d, 3 -> 7d, 4 -> 14d, 5 -> 30d, then +15d steps.
  const day = 24 * 60 * 60 * 1000;
  const baseDays =
    streak <= 0
      ? 0
      : streak === 1
      ? 1
      : streak === 2
      ? 3
      : streak === 3
      ? 7
      : streak === 4
      ? 14
      : streak === 5
      ? 30
      : 30 + (streak - 5) * 15;
  return Math.round(baseDays * day * ease);
}

export function recordAttempt(q: QuizQuestion, chosen: number, now = Date.now()) {
  const hasKey = q.answer !== null && q.answer !== undefined && q.answer >= 0;
  if (!hasKey) return;

  const s = getState();
  const id = q.id;
  const cur: QStat =
    s.q[id] || {
      seen: 0,
      correct: 0,
      wrong: 0,
      streak: 0,
      ease: 2.0,
      lastTs: 0,
      dueTs: 0,
    };

  const isCorrect = chosen === q.answer;
  cur.seen += 1;
  cur.lastTs = now;

  // category stats
  const cat = String((q as any).category || "other");
  const cs: CatStat = s.cat[cat] || { correct: 0, total: 0, lastTs: 0 };
  cs.total += 1;
  if (isCorrect) cs.correct += 1;
  cs.lastTs = now;
  s.cat[cat] = cs;

  if (isCorrect) {
    cur.correct += 1;
    cur.streak = cur.streak + 1;
    // Slightly increase ease with success
    cur.ease = clamp(cur.ease + 0.05, 1.3, 2.5);
    const interval = calcIntervalMs(cur.streak, cur.ease);
    cur.dueTs = now + Math.max(60_000, interval); // at least 1 min
  } else {
    cur.wrong += 1;
    cur.streak = 0;
    // Penalize ease, schedule a near-term retry
    cur.ease = clamp(cur.ease - 0.15, 1.3, 2.5);
    // Wrong -> retry soon: 15 minutes, then 2 hours if repeatedly wrong.
    const penalty = Math.min(6, cur.wrong);
    const minutes = penalty <= 2 ? 15 : penalty <= 4 ? 120 : 360;
    cur.dueTs = now + minutes * 60_000;
  }

  s.q[id] = cur;
  setState(s);
}

export function getWeakCategories(limit = 3) {
  const s = getState();
  const rows = Object.entries(s.cat)
    .map(([cat, st]) => {
      const acc = st.total > 0 ? st.correct / st.total : 0;
      return { cat, acc, total: st.total };
    })
    .filter((r) => r.total >= 6) // need some signal
    .sort((a, b) => a.acc - b.acc);
  return rows.slice(0, limit);
}

export function getDueCount(now = Date.now()) {
  const s = getState();
  let n = 0;
  for (const it of Object.values(s.q)) {
    if ((it.dueTs || 0) > 0 && it.dueTs <= now) n += 1;
  }
  return n;
}

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type PickOpts = {
  excludeIds?: string[];
  focusCategories?: string[];
  now?: number;
};

/**
 * Picks questions prioritizing:
 * 1) due items (spaced repetition)
 * 2) focusCategories (weak areas / session wrongs)
 * 3) generally weak categories
 * 4) random fill
 */
export function pickAdaptiveQuestions(bank: QuizQuestion[], count: number, opts: PickOpts = {}): QuizQuestion[] {
  const now = opts.now ?? Date.now();
  const exclude = new Set(opts.excludeIds || []);
  const focus = new Set((opts.focusCategories || []).map(String));
  const s = getState();
  const byId = new Map(bank.map((q) => [q.id, q] as const));

  // 1) due items
  const dueIds = Object.entries(s.q)
    .filter(([id, st]) => {
      if (exclude.has(id)) return false;
      if (!byId.has(id)) return false;
      return (st.dueTs || 0) > 0 && st.dueTs <= now;
    })
    .map(([id, st]) => ({ id, st }))
    .sort((a, b) => {
      // earlier due first, then more wrongs
      if ((a.st.dueTs || 0) !== (b.st.dueTs || 0)) return (a.st.dueTs || 0) - (b.st.dueTs || 0);
      return (b.st.wrong || 0) - (a.st.wrong || 0);
    })
    .map((x) => x.id);

  const picked: QuizQuestion[] = [];
  for (const id of dueIds) {
    if (picked.length >= count) break;
    const q = byId.get(id);
    if (!q) continue;
    picked.push(q);
    exclude.add(id);
  }

  // 2) focus categories
  if (picked.length < count && focus.size > 0) {
    const pool = bank.filter((q) => !exclude.has(q.id) && focus.has(String((q as any).category || "other")));
    // prioritize ones with more wrongs or unseen
    pool.sort((a, b) => {
      const sa = s.q[a.id];
      const sb = s.q[b.id];
      const wa = sa ? sa.wrong : 0;
      const wb = sb ? sb.wrong : 0;
      if (wb !== wa) return wb - wa;
      const va = sa ? sa.seen : 0;
      const vb = sb ? sb.seen : 0;
      return va - vb;
    });
    for (const q of pool) {
      if (picked.length >= count) break;
      picked.push(q);
      exclude.add(q.id);
    }
  }

  // 3) weak categories globally
  if (picked.length < count) {
    const weak = getWeakCategories(3).map((r) => r.cat);
    const weakSet = new Set(weak);
    const pool = bank.filter((q) => !exclude.has(q.id) && weakSet.has(String((q as any).category || "other")));
    pool.sort((a, b) => {
      const sa = s.q[a.id];
      const sb = s.q[b.id];
      const wa = sa ? sa.wrong : 0;
      const wb = sb ? sb.wrong : 0;
      if (wb !== wa) return wb - wa;
      const va = sa ? sa.seen : 0;
      const vb = sb ? sb.seen : 0;
      return va - vb;
    });
    for (const q of pool) {
      if (picked.length >= count) break;
      picked.push(q);
      exclude.add(q.id);
    }
  }

  // 4) random fill
  if (picked.length < count) {
    const rest = shuffle(bank.filter((q) => !exclude.has(q.id)));
    picked.push(...rest.slice(0, count - picked.length));
  }

  return picked.slice(0, Math.min(count, picked.length));
}
