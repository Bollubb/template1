type LearnState = {
  v: 1;
  // most-recent-first question ids
  ids: string[];
};

const LS = "nd_quiz_learn_v1";

const isBrowser = () => typeof window !== "undefined" && typeof localStorage !== "undefined";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function getState(): LearnState {
  const fallback: LearnState = { v: 1, ids: [] };
  if (!isBrowser()) return fallback;
  return safeParse<LearnState>(localStorage.getItem(LS), fallback) || fallback;
}

function setState(s: LearnState) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(LS, JSON.stringify(s));
  } catch {}
}

/** Record that the user opened "Mini-learn" for a question. */
export function recordLearn(questionId: string) {
  const s = getState();
  const next = [questionId, ...s.ids.filter((id) => id !== questionId)].slice(0, 50);
  setState({ v: 1, ids: next });
}

export function getLearnedIds(limit = 20): string[] {
  const s = getState();
  return (s.ids || []).slice(0, limit);
}

export function clearLearned() {
  setState({ v: 1, ids: [] });
}
