import { getCareer, type Career } from "@/features/career/career";

const LS = {
  claimed: "nd_weekly_challenge_claimed",
} as const;

export type WeeklyChallenge = {
  weekKey: string;
  career: Career | "none";
  title: string;
  goalXp: number;
  rewardPills: number;
};

export function currentWeekKey(d = new Date()): string {
  // ISO week key (YYYY-Www) without needing heavy deps.
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7; // 1..7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  const yyyy = date.getUTCFullYear();
  return `${yyyy}-W${String(weekNo).padStart(2, "0")}`;
}

export function getWeeklyChallenge(): WeeklyChallenge {
  const c = (typeof window === "undefined" ? null : getCareer()) || null;

  // Keep it simple + meaningful: earn XP this week.
  // (Later we can swap goal based on category/difficulty.)
  const base = c ?? "none";

  const preset: Record<string, { title: string; goalXp: number; rewardPills: number }> = {
    general: { title: "Sfida settimanale (Generale)", goalXp: 250, rewardPills: 120 },
    emergency: { title: "Sfida settimanale (Emergenza)", goalXp: 300, rewardPills: 150 },
    critical: { title: "Sfida settimanale (Area critica)", goalXp: 300, rewardPills: 150 },
    pediatrics: { title: "Sfida settimanale (Pediatria)", goalXp: 250, rewardPills: 120 },
    none: { title: "Sfida settimanale", goalXp: 250, rewardPills: 120 },
  };

  const p = preset[base] || preset.none;
  return { weekKey: currentWeekKey(), career: (c ?? "none") as any, ...p };
}

type ClaimedMap = Record<string, boolean>;

export function isWeeklyChallengeClaimed(weekKey: string): boolean {
  if (typeof window === "undefined") return false;
  const raw = localStorage.getItem(LS.claimed);
  const map: ClaimedMap = raw ? safeJson(raw, {}) : {};
  return !!map[weekKey];
}

export function setWeeklyChallengeClaimed(weekKey: string) {
  if (typeof window === "undefined") return;
  const raw = localStorage.getItem(LS.claimed);
  const map: ClaimedMap = raw ? safeJson(raw, {}) : {};
  map[weekKey] = true;
  localStorage.setItem(LS.claimed, JSON.stringify(map));
}

function safeJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
