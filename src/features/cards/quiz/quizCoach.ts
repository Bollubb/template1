import type { UniPresetId } from "./quizUniversity";
import { getDueCount, getWeakCategories } from "./quizAdaptive";

type CoachState = {
  v: 1;
  // weekly goals
  weekStartIso: string; // Monday ISO date
  weekGoal: number; // questions
  weekDone: number; // questions
  // reminder (in-app)
  reminderHour: number; // 0 = off
};

const LS = "nd_quiz_coach_v1";
const isBrowser = () => typeof window !== "undefined" && typeof localStorage !== "undefined";

function mondayIso(d = new Date()) {
  const dd = new Date(d);
  const day = (dd.getDay() + 6) % 7; // Mon=0
  dd.setDate(dd.getDate() - day);
  dd.setHours(0, 0, 0, 0);
  return dd.toISOString().slice(0, 10);
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function getCoachState(): CoachState {
  const fallback: CoachState = { v: 1, weekStartIso: mondayIso(), weekGoal: 150, weekDone: 0, reminderHour: 0 };
  if (!isBrowser()) return fallback;
  const s = safeParse<CoachState>(localStorage.getItem(LS), fallback);
  // roll week if needed
  const nowWeek = mondayIso();
  if (s.weekStartIso !== nowWeek) {
    const rolled: CoachState = { ...s, weekStartIso: nowWeek, weekDone: 0 };
    try { localStorage.setItem(LS, JSON.stringify(rolled)); } catch {}
    return rolled;
  }
  return s;
}

function setCoachState(next: CoachState) {
  if (!isBrowser()) return;
  try { localStorage.setItem(LS, JSON.stringify(next)); } catch {}
}

export function setCoachWeeklyGoal(goal: number) {
  const s = getCoachState();
  setCoachState({ ...s, weekGoal: Math.max(50, Math.min(500, Math.round(goal))) });
}

export function setCoachReminderHour(hour: number) {
  const s = getCoachState();
  const h = hour <= 0 ? 0 : Math.max(6, Math.min(23, Math.round(hour)));
  setCoachState({ ...s, reminderHour: h });
}

export function recordCoachSession(args: { track: "core" | "concorso" | "uni"; mode: string; total: number; correct: number; ms: number }) {
  const s = getCoachState();
  setCoachState({ ...s, weekDone: s.weekDone + Math.max(0, Math.round(args.total || 0)) });
}

export function getTodayCoachPlan(ctx: { uniPreset: UniPresetId; simTrack: "concorso" | "uni" }) {
  // Priority:
  // 1) if many due items -> review
  // 2) if weak categories include uni subjects -> uni focus
  // 3) otherwise -> rapid session
  const due = getDueCount();
  if (due >= 8) {
    return { kind: "review" as const, headline: `Recupero intelligente: ${due} domande da ripassare oggi.` };
  }

  const weak = getWeakCategories(5).map((x) => String(x.cat || "").toLowerCase());
  const uni: Array<{ preset: UniPresetId; label: string }> = [
    { preset: "farmacologia", label: "Farmacologia" },
    { preset: "anatomia", label: "Anatomia" },
    { preset: "fisiologia", label: "Fisiologia" },
  ];
  const pick = uni.find((u) => weak.includes(u.preset)) ?? uni[0];

  return { kind: "uni" as const, preset: pick.preset, headline: `Focus oggi: ${pick.label}. Mini test da 10Q per consolidare.` };
}
