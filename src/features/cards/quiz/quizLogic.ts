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

const LS_DAILY = "nd_quiz_daily";
const LS_WEEKLY = "nd_quiz_weekly";

export function getDailyState() {
  return JSON.parse(localStorage.getItem(LS_DAILY) || '{"status":"idle","streak":0}');
}

export function getWeeklyState() {
  return JSON.parse(localStorage.getItem(LS_WEEKLY) || '{"status":"idle"}');
}

export function setDailyState(v: any) {
  localStorage.setItem(LS_DAILY, JSON.stringify(v));
}

export function setWeeklyState(v: any) {
  localStorage.setItem(LS_WEEKLY, JSON.stringify(v));
}

export function calcDailyReward(correct: number, total: number, perfect: boolean, streak: number) {
  return 20 + correct * 5 + (perfect ? 10 : 0) + streak * 2;
}

export function calcWeeklyReward(correct: number, total: number, perfect: boolean) {
  return 60 + correct * 8 + (perfect ? 20 : 0);
}

export function getNextDailyResetMs() {
  const now = new Date();
  const next = new Date();
  next.setHours(24, 0, 0, 0);
  return next.getTime() - now.getTime();
}

export function getNextWeeklyResetMs() {
  const now = new Date();
  const next = new Date(now);
  const day = now.getDay() || 7;
  if (day !== 1) next.setDate(now.getDate() + (8 - day));
  next.setHours(0, 0, 0, 0);
  return next.getTime() - now.getTime();
}
