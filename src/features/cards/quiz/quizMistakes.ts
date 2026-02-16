import type { QuizQuestion } from "./quizBank";

type MistakeItem = { c: number; lastTs: number };
type MistakeState = { v: 1; items: Record<string, MistakeItem> };

const LS = "nd_quiz_mistakes_v1";
const isBrowser = () => typeof window !== "undefined" && typeof localStorage !== "undefined";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function getState(): MistakeState {
  const fallback: MistakeState = { v: 1, items: {} };
  if (!isBrowser()) return fallback;
  return safeParse<MistakeState>(localStorage.getItem(LS), fallback) || fallback;
}

function setState(s: MistakeState) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(LS, JSON.stringify(s));
  } catch {}
}

export function recordMistake(questionId: string) {
  const s = getState();
  const now = Date.now();
  const cur = s.items[questionId] || { c: 0, lastTs: 0 };
  s.items[questionId] = { c: cur.c + 1, lastTs: now };
  setState(s);
}

export function clearMistakes() {
  setState({ v: 1, items: {} });
}

export type MistakeRow = { q: QuizQuestion; count: number; lastTs: number };

export function getTopMistakes(bank: QuizQuestion[], limit = 10): MistakeRow[] {
  const s = getState();
  const byId = new Map(bank.map((q) => [q.id, q] as const));

  const rows: MistakeRow[] = Object.entries(s.items)
    .map(([id, it]) => {
      const q = byId.get(id);
      if (!q) return null;
      return { q, count: it.c, lastTs: it.lastTs };
    })
    .filter(Boolean) as MistakeRow[];

  rows.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return b.lastTs - a.lastTs;
  });
  return rows.slice(0, limit);
}

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pickMistakeReviewQuestions(bank: QuizQuestion[], count: number, excludeIds: string[] = []): QuizQuestion[] {
  const exclude = new Set(excludeIds);
  const top = getTopMistakes(bank, 50)
    .map((r) => r.q)
    .filter((q) => !exclude.has(q.id));

  const picked: QuizQuestion[] = [];
  for (const q of top) {
    if (picked.length >= count) break;
    picked.push(q);
    exclude.add(q.id);
  }

  if (picked.length < count) {
    const restPool = bank.filter((q) => !exclude.has(q.id));
    const fill = shuffle(restPool).slice(0, count - picked.length);
    picked.push(...fill);
  }

  return picked.slice(0, Math.min(count, picked.length));
}
