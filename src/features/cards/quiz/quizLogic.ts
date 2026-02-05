import type { QuizQuestion } from "./quizBank";

export type QuizKind = "daily" | "weekly";

export type QuizSession = {
  kind: QuizKind;
  startedAt: number;
  questions: QuizQuestion[];
  idx: number;
  correct: number;
  selected: number | null;
  done: boolean;
};

export function pickQuestions(bank: QuizQuestion[], n: number, rng: () => number = Math.random): QuizQuestion[] {
  const copy = [...bank];
  // Fisher–Yates shuffle
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(n, copy.length));
}

export function calcDailyReward(correct: number, total: number, streak: number): number {
  const base = 40;
  const perCorrect = 5;
  const streakBonus = Math.min(50, Math.max(0, streak - 1) * 10);
  // bonus precisione: 100% -> +20
  const perfect = correct === total ? 20 : 0;
  return base + correct * perCorrect + streakBonus + perfect;
}

export function calcWeeklyReward(correct: number, total: number): number {
  const base = 150;
  const perCorrect = 10;
  const perfect = correct === total ? 60 : 0;
  return base + correct * perCorrect + perfect;
}

// Helpers date
export function startOfToday(ts = Date.now()): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function startOfNextDay(ts = Date.now()): number {
  const d = new Date(ts);
  d.setHours(24, 0, 0, 0);
  return d.getTime();
}

// Monday 00:00
export function startOfWeek(ts = Date.now()): number {
  const d = new Date(ts);
  const day = (d.getDay() + 6) % 7; // Monday=0
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d.getTime();
}

export function startOfNextWeek(ts = Date.now()): number {
  const d = new Date(startOfWeek(ts));
  d.setDate(d.getDate() + 7);
  return d.getTime();
}