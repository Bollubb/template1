import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

import Page from "../layouts/Page";
import Section from "../layouts/Section";
import NurseBottomNav from "../components/nursediary/NurseBottomNav";
import PremiumUpsellModal from "@/components/nursediary/PremiumUpsellModal";

import { QUIZ_BANK, type QuizQuestion } from "@/features/cards/quiz/quizBank";
import { QUIZ_BANK_CONCORSO } from "@/features/cards/quiz/quizBankConcorso";
import {
  calcDailyReward,
  calcWeeklyReward,
  getDailyState,
  getWeeklyState,
  setDailyState,
  setWeeklyState,
  getNextDailyResetMs,
  getNextWeeklyResetMs,
  pushHistory,
  type QuizHistoryItem,
} from "@/features/cards/quiz/quizLogic";
import { addXp } from "@/features/progress/xp";
import { recordMistake, pickMistakeReviewQuestions } from "@/features/cards/quiz/quizMistakes";

type QuizRun = {
  mode: "daily" | "weekly" | "concorso" | "review";
  idx: number;
  correct: number;
  questions: QuizQuestion[];
  answers: number[]; // chosen option index, -1 if none
  startedAt: number;
  // optional timer (used by concorso presets)
  timeLimitMs?: number;
  endsAt?: number;
};

type QuizResult = {
  mode: QuizRun["mode"];
  correct: number;
  total: number;
  ms: number;
  byCategory: Record<string, { correct: number; total: number }>;
  perfect: boolean;
  wrong: { q: QuizQuestion; chosen: number }[];
};

const LS = {
  premium: "nd_premium",
  favs: "nd_quiz_favs",
  lastHomeTab: "nd_quiz_home_tab",
  seen: "nd_quiz_seen_v1",
  dailyRunsPrefix: "nd_quiz_daily_runs_",
  dailyUnlocksPrefix: "nd_quiz_daily_unlocks_",
  weeklyRunsPrefix: "nd_quiz_weekly_runs_",
  weeklyUnlocksPrefix: "nd_quiz_weekly_unlocks_",
  concorsoRunsPrefix: "nd_quiz_concorso_runs_",
  concorsoUnlocksPrefix: "nd_quiz_concorso_unlocks_",
  concorsoSeen: "nd_quiz_concorso_seen_v1",
};

type HomeTab = "daily" | "weekly" | "concorso" | "review";

function dayKey(ts = Date.now()) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function isoWeekKey(ts = Date.now()) {
  // ISO week (YYYY-Www)
  const d = new Date(ts);
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function readInt(key: string, fallback = 0) {
  try {
    const v = localStorage.getItem(key);
    const n = v ? Number(v) : fallback;
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : fallback;
  } catch {
    return fallback;
  }
}

function writeInt(key: string, v: number) {
  try {
    localStorage.setItem(key, String(Math.max(0, Math.floor(v))));
  } catch {}
}

type SeenItem = { id: string; ts: number };

function getRecentSeenIds(max = 140): string[] {
  try {
    const raw = localStorage.getItem(LS.seen);
    if (!raw) return [];
    const v = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    const items = v
      .filter((x): x is SeenItem => x && typeof x.id === "string" && typeof x.ts === "number")
      .sort((a, b) => b.ts - a.ts)
      .slice(0, max);
    return items.map((x) => x.id);
  } catch {
    return [];
  }
}

function pushSeen(ids: string[]) {
  try {
    const raw = localStorage.getItem(LS.seen);
    const prev = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    const next: SeenItem[] = [
      ...(Array.isArray(prev) ? prev.filter((x: any) => x && typeof x.id === "string" && typeof x.ts === "number") : []),
      ...ids.map((id) => ({ id, ts: now })),
    ];
    // keep last ~600
    next.sort((a, b) => b.ts - a.ts);
    localStorage.setItem(LS.seen, JSON.stringify(next.slice(0, 600)));
  } catch {}
}

function pickQuestions(bank: QuizQuestion[], count: number, avoidIds: Set<string>) {
  const pool = bank.filter((q) => !avoidIds.has(q.id));
  const src = pool.length >= count ? pool : bank;
  // Fisher-Yates shuffle copy
  const arr = [...src];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, count);
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function msToHMS(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hh > 0 ? `${hh}:${pad(mm)}:${pad(ss)}` : `${mm}:${pad(ss)}`;
}

function card(): React.CSSProperties {
  return {
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    borderRadius: 18,
    padding: 14,
  };
}

function primaryBtn(disabled?: boolean): React.CSSProperties {
  return {
    width: "100%",
    padding: "12px 12px",
    borderRadius: 14,
    border: "1px solid rgba(56,189,248,0.35)",
    background: disabled ? "rgba(255,255,255,0.06)" : "rgba(56,189,248,0.22)",
    color: "rgba(255,255,255,0.95)",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 900,
  };
}

function ghostBtn(disabled?: boolean): React.CSSProperties {
  return {
    padding: "12px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    color: "rgba(255,255,255,0.88)",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 850,
  };
}

type ChipVariant = "sky" | "amber" | "slate" | "green";
type BtnVariant = "emerald" | "indigo" | "sky" | "ghost";

function chipStyle(v: ChipVariant): React.CSSProperties {
  const common: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0.2,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.92)",
    whiteSpace: "nowrap",
  };

  if (v === "sky") return { ...common, border: "1px solid rgba(56,189,248,0.35)", background: "rgba(56,189,248,0.16)" };
  if (v === "amber") return { ...common, border: "1px solid rgba(251,191,36,0.35)", background: "rgba(251,191,36,0.14)" };
  if (v === "green") return { ...common, border: "1px solid rgba(52,211,153,0.35)", background: "rgba(52,211,153,0.14)" };
  return { ...common, border: "1px solid rgba(148,163,184,0.25)", background: "rgba(148,163,184,0.08)" };
}

function pillStyle(v: ChipVariant): React.CSSProperties {
  return {
    ...chipStyle(v),
    padding: "5px 10px",
    fontSize: 11,
    fontWeight: 950,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  };
}

function btnStyle(v: BtnVariant, disabled?: boolean): React.CSSProperties {
  const common: React.CSSProperties = {
    width: "100%",
    padding: "12px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.92)",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 950,
  };

  if (v === "emerald") return { ...common, border: "1px solid rgba(52,211,153,0.35)", background: disabled ? "rgba(255,255,255,0.06)" : "rgba(52,211,153,0.18)" };
  if (v === "indigo") return { ...common, border: "1px solid rgba(129,140,248,0.35)", background: disabled ? "rgba(255,255,255,0.06)" : "rgba(129,140,248,0.16)" };
  if (v === "sky") return { ...common, border: "1px solid rgba(56,189,248,0.35)", background: disabled ? "rgba(255,255,255,0.06)" : "rgba(56,189,248,0.18)" };
  return common;
}

function miniChipBtn(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.92)",
    fontWeight: 900,
    fontSize: 12,
    cursor: "pointer",
  };
}

function optionBtnStyle(opts: { active: boolean; correct: boolean; wrong: boolean; disabled: boolean }): React.CSSProperties {
  const baseBg = "rgba(255,255,255,0.04)";
  const baseBorder = "1px solid rgba(255,255,255,0.10)";

  let background = baseBg;
  let border = baseBorder;

  if (opts.active && !opts.disabled) {
    background = "rgba(56,189,248,0.16)";
    border = "1px solid rgba(56,189,248,0.38)";
  }
  if (opts.correct) {
    background = "rgba(34,197,94,0.16)";
    border = "1px solid rgba(34,197,94,0.40)";
  }
  if (opts.wrong) {
    background = "rgba(239,68,68,0.14)";
    border = "1px solid rgba(239,68,68,0.40)";
  }

  return {
    width: "100%",
    textAlign: "left",
    padding: "12px 12px",
    borderRadius: 14,
    border,
    background,
    color: "rgba(255,255,255,0.92)",
    cursor: opts.disabled ? "not-allowed" : "pointer",
    fontWeight: 850,
    lineHeight: 1.25,
    boxShadow: opts.active && !opts.disabled ? "0 0 0 3px rgba(56,189,248,0.10)" : "none",
    transition: "transform 120ms ease, background 120ms ease, border-color 120ms ease",
  };
}



function optionLetterStyle(opts: { idx: number; active: boolean; correct: boolean; wrong: boolean; disabled: boolean }): React.CSSProperties {
  // base palette by index to make A/B/C/D more visible
  const palettes = [
    { bg: "rgba(56,189,248,0.16)", bd: "rgba(56,189,248,0.35)", fg: "rgba(240,252,255,0.96)" }, // A - sky
    { bg: "rgba(167,139,250,0.16)", bd: "rgba(167,139,250,0.35)", fg: "rgba(250,245,255,0.96)" }, // B - violet
    { bg: "rgba(251,191,36,0.16)", bd: "rgba(251,191,36,0.38)", fg: "rgba(255,251,235,0.96)" }, // C - amber
    { bg: "rgba(34,197,94,0.14)", bd: "rgba(34,197,94,0.34)", fg: "rgba(240,253,244,0.96)" }, // D - green
  ];
  const p = palettes[Math.max(0, Math.min(3, opts.idx))];

  let background = p.bg;
  let borderColor = p.bd;
  let color = p.fg;

  if (opts.active && !opts.disabled) {
    background = "rgba(56,189,248,0.22)";
    borderColor = "rgba(56,189,248,0.55)";
    color = "rgba(240,252,255,0.98)";
  }
  if (opts.correct) {
    background = "rgba(34,197,94,0.22)";
    borderColor = "rgba(34,197,94,0.60)";
    color = "rgba(240,253,244,0.98)";
  }
  if (opts.wrong) {
    background = "rgba(239,68,68,0.20)";
    borderColor = "rgba(239,68,68,0.60)";
    color = "rgba(254,242,242,0.98)";
  }

  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    borderRadius: 10,
    border: `1px solid ${borderColor}`,
    background,
    color,
    fontWeight: 950,
    fontSize: 12,
    flex: "0 0 auto",
    boxShadow: opts.active && !opts.disabled ? "0 0 0 3px rgba(56,189,248,0.10)" : "none",
  };
}

function tileStyle(): React.CSSProperties {
  return {
    border: "1px solid rgba(255,255,255,0.10)",
    background: "linear-gradient(180deg, rgba(56,189,248,0.08), rgba(255,255,255,0.02))",
    borderRadius: 18,
    padding: 14,
  };
}

function progressWrapStyle(): React.CSSProperties {
  return { height: 8, borderRadius: 999, background: "rgba(255,255,255,0.10)", overflow: "hidden" };
}

function progressFillStyle(widthPct: number, v: "emerald" | "indigo" | "sky" = "sky"): React.CSSProperties {
  const bg =
    v === "emerald" ? "rgba(52,211,153,0.70)" :
    v === "indigo" ? "rgba(129,140,248,0.70)" :
    "rgba(56,189,248,0.70)";
  return { height: "100%", width: `${Math.round(clamp01(widthPct) * 100)}%`, background: bg, borderRadius: 999, transition: "width 220ms ease" };
}

function bar(p: number): React.CSSProperties {
  return {
    height: 6,
    borderRadius: 999,
    background: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  };
}
function barFill(p: number): React.CSSProperties {
  return {
    height: "100%",
    width: `${Math.round(clamp01(p) * 100)}%`,
    borderRadius: 999,
    background: "rgba(56,189,248,0.65)",
    transition: "width 220ms ease",
  };
}

function getFavs(): string[] {
  try {
    const raw = localStorage.getItem(LS.favs);
    if (!raw) return [];
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export default function QuizPage(): JSX.Element {
  const router = useRouter();
  const goTab = (tab: "home" | "didattica" | "carte" | "profilo") => router.push(`/?tab=${tab}`);

  const [dailyLeft, setDailyLeft] = useState(0);
  const [weeklyLeft, setWeeklyLeft] = useState(0);
  const [premium, setPremium] = useState(false);
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);
  const [premiumContextUnlock, setPremiumContextUnlock] = useState<null | "daily" | "weekly" | "concorso">(null);

  const [homeTab, setHomeTab] = useState<HomeTab>("daily");
  const [unlockModal, setUnlockModal] = useState<null | { kind: "daily" | "weekly"; remaining: number }>(null);

  const [runQuiz, setRunQuiz] = useState<QuizRun | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [reveal, setReveal] = useState<null | { isCorrect: boolean; correctIdx: number; chosen: number }>(null);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [lastReward, setLastReward] = useState<{ xp: number; pills: number } | null>(null);
  const [nowTs, setNowTs] = useState<number>(Date.now());

  const [favs, setFavs] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const tick = () => {
      setDailyLeft(getNextDailyResetMs());
      setWeeklyLeft(getNextWeeklyResetMs());
    };
    tick();
    try {
      setPremium(localStorage.getItem(LS.premium) === "1");
      setFavs(getFavs());
      const savedTab = (localStorage.getItem(LS.lastHomeTab) || "daily") as HomeTab;
      if (savedTab === "daily" || savedTab === "weekly" || savedTab === "concorso" || savedTab === "review") setHomeTab(savedTab);
    } catch {}
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LS.lastHomeTab, homeTab);
    } catch {}
  }, [homeTab]);

  useEffect(() => {
    if (!runQuiz) return;
    const id = window.setInterval(() => setNowTs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [runQuiz]);

  const daily = useMemo(() => getDailyState(), [dailyLeft]);
  const weekly = useMemo(() => getWeeklyState(), [weeklyLeft]);

  // soft streak (derived from history if available)
  const streak = useMemo(() => {
    try {
      const raw = localStorage.getItem("nd_quiz_streak");
      const n = raw ? Number(raw) : 0;
      return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
    } catch {
      return 0;
    }
  }, [dailyLeft, weeklyLeft]);

  const dailyProgress = useMemo(() => 1 - clamp01(dailyLeft / (24 * 60 * 60 * 1000)), [dailyLeft]);
  const weeklyProgress = useMemo(() => 1 - clamp01(weeklyLeft / (7 * 24 * 60 * 60 * 1000)), [weeklyLeft]);

  function persistFavs(next: string[]) {
    setFavs(next);
    try {
      localStorage.setItem(LS.favs, JSON.stringify(next));
    } catch {}
  }

  function toggleFav(qid: string) {
    if (!premium) {
      setPremiumModalOpen(true);
      return;
    }
    const next = favs.includes(qid) ? favs.filter((x) => x !== qid) : [...favs, qid];
    persistFavs(next);
  }

  function start(mode: QuizRun["mode"], opts?: { questions?: QuizQuestion[] }) {
    const questions =
      opts?.questions ??
      (() => {
        const avoid = new Set(getRecentSeenIds(140));
        if (mode === "daily") return pickQuestions(QUIZ_BANK, 10, avoid);
        if (mode === "weekly") return pickQuestions(QUIZ_BANK, 25, avoid);
        if (mode === "concorso") return pickQuestions(QUIZ_BANK_CONCORSO, 40, avoid);
        // review
        const picked = pickMistakeReviewQuestions(QUIZ_BANK, 10);
        return picked.length ? picked : pickQuestions(QUIZ_BANK, 10, avoid);
      })();

    setQuizResult(null);
    setLastReward(null);
    setSelected(null);
    setReveal(null);
    setRunQuiz({
      mode,
      idx: 0,
      correct: 0,
      questions,
      answers: Array.from({ length: questions.length }, () => -1),
      startedAt: Date.now(),
    });
  }

  function finish(run: QuizRun) {
    const wrong: { q: QuizQuestion; chosen: number }[] = [];
    run.questions.forEach((q, i) => {
      const chosen = run.answers[i];
      if (chosen !== q.answer) wrong.push({ q, chosen });
    });

    const ms = Date.now() - run.startedAt;

    // mark done + rewards ONLY on first run per reset
    if (run.mode === "daily") {
      const dk = dayKey();
      const rk = `${LS.dailyRunsPrefix}${dk}`;
      const usedBefore = readInt(rk, 0);

      // streak counts only on the first completion of the day
      let streakForReward = daily.streak;
      if (daily.status !== "done") {
        const nextStreak = daily.streak + 1;
        streakForReward = nextStreak;
        setDailyState({ ...daily, status: "done", streak: nextStreak });
        try {
          localStorage.setItem("nd_quiz_streak", String(nextStreak));
        } catch {}
      }

      const baseXp = calcDailyReward(run.correct, run.questions.length, run.correct === run.questions.length, streakForReward);
      const mult = usedBefore === 0 ? 1 : 0.6; // extra daily runs still reward, but a bit less
      const xpEarn = Math.max(5, Math.round(baseXp * mult));
            // Derive pills from XP locally to avoid relying on a missing helper in some builds.
      // ~1 pill every 18 XP, minimum 1 when xp>0
      const pillsEarn = Math.max(1, Math.floor(xpEarn / 18));

      addXp(xpEarn);
      addPills(pillsEarn);
      setLastReward({ xp: xpEarn, pills: pillsEarn });

      writeInt(rk, usedBefore + 1);
    } else if (run.mode === "weekly") {
      const wk = isoWeekKey();
      const rk = `${LS.weeklyRunsPrefix}${wk}`;
      const usedBefore = readInt(rk, 0);

      if (weekly.status !== "done") setWeeklyState({ ...weekly, status: "done" });

      const baseXp = calcWeeklyReward(run.correct, run.questions.length, run.correct === run.questions.length);
      const mult = usedBefore === 0 ? 1 : 0.7; // extra weekly run rewards, slightly reduced
      const xpEarn = Math.max(10, Math.round(baseXp * mult));
      const pillsEarn = Math.max(1, Math.floor(xpEarn / 18));

      addXp(xpEarn);
      addPills(pillsEarn);
      setLastReward({ xp: xpEarn, pills: pillsEarn });

      writeInt(rk, usedBefore + 1);
    } else {
      // concorso / review
      const perfect = run.correct === run.questions.length;
      const baseXp =
        run.mode === "concorso"
          ? 35 + run.correct * 4 + (perfect ? 20 : 0)
          : 22 + run.correct * 3 + (perfect ? 12 : 0);

      const xpEarn = Math.max(5, Math.round(baseXp));
      const pillsEarn = Math.max(1, Math.floor(xpEarn / 18));

      addXp(xpEarn);
      addPills(pillsEarn);
      setLastReward({ xp: xpEarn, pills: pillsEarn });
    }

// store seen ids to reduce repeats
    pushSeen(run.questions.map((q) => q.id));
// mistakes log
    wrong.forEach((w) => recordMistake(w.q.id));

    // history (for recency)
    const byCategory: QuizHistoryItem["byCategory"] = {};

    try {
      run.questions.forEach((q, i) => {
        const cat = String((q as any).category || "other");
        const bucket = (byCategory as any)[cat] || { correct: 0, total: 0 };
        bucket.total += 1;
        const chosen = run.answers[i];
        if (chosen === q.answer) bucket.correct += 1;
        (byCategory as any)[cat] = bucket;
      });

      const item: QuizHistoryItem = {
        ts: Date.now(),
        mode: run.mode,
        correct: run.correct,
        total: run.questions.length,
        byCategory,
      };
      pushHistory(item);
    } catch {}

    setRunQuiz(null);
    setSelected(null);
    setQuizResult({
      mode: run.mode,
      correct: run.correct,
      total: run.questions.length,
      ms,
      timeLimitMs: run.timeLimitMs,
      byCategory,
      perfect: run.correct === run.questions.length,
      wrong,
    });
  }


  // --- AUTO-FINISH CONCORSO TIMER ---
  useEffect(() => {
    if (!runQuiz?.endsAt) return;
    if (nowTs >= runQuiz.endsAt) {
      // finish immediately when timer expires
      finish(runQuiz);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nowTs, runQuiz?.endsAt]);

  // --- Ads / unlock scaffolding (no SDK yet) ---
  async function unlockViaAd(kind: "daily" | "weekly") {
    // TODO: replace with real rewarded ad flow.
    // For now we "simulate" success so UI/logic is ready.
    await new Promise((r) => setTimeout(r, 350));
    const key = kind === "daily" ? `${LS.dailyUnlocksPrefix}${dayKey()}` : `${LS.weeklyUnlocksPrefix}${isoWeekKey()}`;
    writeInt(key, readInt(key, 0) + 1);
    return true;
  }

  
  function getConcorsoCaps() {
    const wk = isoWeekKey();
    const used = readInt(`${LS.concorsoRunsPrefix}${wk}`, 0);
    const unlocks = readInt(`${LS.concorsoUnlocksPrefix}${wk}`, 0);
    const free = 1;
    const max = 4; // 1 free + up to 3 unlocks
    const allowed = premium ? 999 : Math.min(max, free + unlocks);
    return { used, free, max, unlocks, allowed, wk };
  }

  async function unlockConcorsoViaAd() {
    await new Promise((r) => setTimeout(r, 350));
    const wk = isoWeekKey();
    const key = `${LS.concorsoUnlocksPrefix}${wk}`;
    writeInt(key, readInt(key, 0) + 1);
    return true;
  }

  function pickConcorsoQuestions(total: number) {
    const avoid = new Set<string>();
    // keep concorso recency separate (by id)
    try {
      const raw = localStorage.getItem(LS.concorsoSeen) || "[]";
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) arr.slice(-350).forEach((id) => avoid.add(String(id)));
    } catch {}

    // IMPORTANT: prevent duplicates within the same run (some concorso banks may contain repeated stems).
    const normalizeStem = (s: string) =>
      String(s)
        .toLowerCase()
        .replace(/\s+/g, " ")
        .replace(/[“”]/g, '"')
        .trim();

    const pool = QUIZ_BANK_CONCORSO.filter((q) => !avoid.has(q.id));
    const src = pool.length >= total ? pool : QUIZ_BANK_CONCORSO;

    // shuffle once, then take unique-by-stem
    const arr = [...src];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }

    const seenStem = new Set<string>();
    const out: QuizQuestion[] = [];
    for (const q of arr) {
      const stem = normalizeStem(q.q);
      if (seenStem.has(stem)) continue;
      seenStem.add(stem);
      out.push(q);
      if (out.length >= total) break;
    }

    // fallback (should almost never happen): fill remaining even if repeated stems
    if (out.length < total) {
      for (const q of arr) {
        if (out.length >= total) break;
        if (out.some((x) => x.id === q.id)) continue;
        out.push(q);
      }
    }

    return out.slice(0, total);
  }

  function startConcorso(preset: { id: string; title: string; total: number; minutes: number }) {
    const questions = pickConcorsoQuestions(preset.total);
    setQuizResult(null);
    setLastReward(null);
    setSelected(null);
    setReveal(null);
    const startedAt = Date.now();
    const timeLimitMs = preset.minutes * 60 * 1000;
    setRunQuiz({
      mode: "concorso",
      idx: 0,
      correct: 0,
      questions,
      answers: Array.from({ length: questions.length }, () => -1),
      startedAt,
      timeLimitMs,
      endsAt: startedAt + timeLimitMs,
    });
  }

function getRunCaps(kind: "daily" | "weekly") {
    if (kind === "daily") {
      const dk = dayKey();
      const used = readInt(`${LS.dailyRunsPrefix}${dk}`, 0);
      const unlocks = readInt(`${LS.dailyUnlocksPrefix}${dk}`, 0);
      const free = 1;
      const max = 3;
      const allowed = premium ? max : Math.min(max, free + unlocks);
      return { used, free, max, unlocks, allowed };
    }
    const wk = isoWeekKey();
    const used = readInt(`${LS.weeklyRunsPrefix}${wk}`, 0);
    const unlocks = readInt(`${LS.weeklyUnlocksPrefix}${wk}`, 0);
    const free = 1;
    const max = 2;
    const allowed = premium ? max : Math.min(max, free + unlocks);
    return { used, free, max, unlocks, allowed };
  }

  async function handleStart(kind: "daily" | "weekly") {
    const caps = getRunCaps(kind);
    const remaining = Math.max(0, caps.allowed - caps.used);
    if (remaining > 0) {
      start(kind);
      return;
    }
    if (premium) {
      // premium but reached cap: no start
      return;
    }
    // show Premium summary (with optional rewarded unlock)
    setPremiumContextUnlock(kind);
    setPremiumModalOpen(true);
    return;}

  function confirmAnswer() {
    if (!runQuiz) return;
    if (selected === null) return;
    if (reveal) return;

    const q = runQuiz.questions[runQuiz.idx];
    const answers = [...runQuiz.answers];
    answers[runQuiz.idx] = selected;

    const isCorrect = selected === q.answer;
    const correct = runQuiz.correct + (isCorrect ? 1 : 0);

    // stay on same question, reveal feedback first
    setRunQuiz({ ...runQuiz, answers, correct });
    setReveal({ isCorrect, correctIdx: q.answer, chosen: selected });
  }

  function goNext() {
    if (!runQuiz) return;
    if (!reveal) return;

    const nextIdx = runQuiz.idx + 1;
    const next: QuizRun = { ...runQuiz, idx: nextIdx };

    setReveal(null);
    setSelected(null);

    if (nextIdx >= runQuiz.questions.length) {
      finish(next);
    } else {
      setRunQuiz(next);
    }
  }


  const headerOverride = useMemo(
    () => ({
      title: "Quiz",
      subtitle: "Daily • Weekly • Simulazione Concorsi",
      showBack: true,
      onBack: () => router.back(),
    }),
    [router]
  );

  return (
    <Page title="Quiz" headerOverride={headerOverride}>
      <>
<Section>
        <div className="mx-auto w-full max-w-[560px]">
        {!runQuiz && !quizResult && (
          <div className="grid gap-3">
            <div className="nd-card nd-card-pad" style={card()}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="nd-badge nd-badge-sky" style={chipStyle("sky")}>Quiz</span>
                  {streak > 0 && <span className="nd-badge nd-badge-amber" style={chipStyle("amber")}>🔥 {streak}</span>}
                </div>
                {!premium && <span className="nd-pill nd-pill-amber" style={pillStyle("amber")}>Premium</span>}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button type="button" className="nd-badge nd-press" onClick={() => setHomeTab("daily")} style={homeTab === "daily" ? chipStyle("sky") : chipStyle("slate")}>Daily</button>
                <button type="button" className="nd-badge nd-press" onClick={() => setHomeTab("weekly")} style={homeTab === "weekly" ? chipStyle("sky") : chipStyle("slate")}>Weekly</button>
                <button type="button" className="nd-badge nd-press" onClick={() => setHomeTab("concorso")} style={homeTab === "concorso" ? chipStyle("sky") : chipStyle("slate")}>Concorsi</button>
                <button type="button" className="nd-badge nd-press" onClick={() => setHomeTab("review")} style={homeTab === "review" ? chipStyle("sky") : chipStyle("slate")}>Errori</button>
              </div>

              
{/* Daily */}
{homeTab === "daily" && (() => {
  const caps = getRunCaps("daily");
  const remaining = Math.max(0, caps.allowed - caps.used);
  return (
    <div className="mt-3 grid gap-2">
      <div className="nd-tile" style={tileStyle()}>
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-extrabold text-white">Daily</div>
            <div className="nd-help">Reset: {msToHMS(dailyLeft)}</div>
          </div>
          <span
            className={remaining > 0 ? "nd-pill nd-pill-slate" : "nd-pill nd-pill-green"}
            style={pillStyle(remaining > 0 ? "slate" : "green")}
          >
            {`Rimanenti ${remaining}/${caps.max}`}
          </span>
        </div>
        <div className="mt-2 nd-help">1 gratuito • altri con pubblicità o Premium</div>
      </div>

      <button
        type="button"
        onClick={() => handleStart("daily")}
        className="nd-btn nd-btn-sky nd-press"
        style={btnStyle("sky")}
      >
        Avvia Daily
      </button>

      {!premium && remaining === 0 && (
        <div className="nd-help">
          <button
            type="button"
            onClick={() => {
              setPremiumContextUnlock("daily");
              setPremiumModalOpen(true);
            }}
            className="nd-btn-chip nd-press"
            style={miniChipBtn()}
          >
            Sblocca con pubblicità / Premium
          </button>
        </div>
      )}
    </div>
  );
})()}

{/* Weekly */}
{homeTab === "weekly" && (() => {
  const caps = getRunCaps("weekly");
  const remaining = Math.max(0, caps.allowed - caps.used);
  return (
    <div className="mt-3 grid gap-2">
      <div className="nd-tile" style={tileStyle()}>
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-extrabold text-white">Weekly</div>
            <div className="nd-help">Reset: {msToHMS(weeklyLeft)}</div>
          </div>
          <span
            className={remaining > 0 ? "nd-pill nd-pill-slate" : "nd-pill nd-pill-green"}
            style={pillStyle(remaining > 0 ? "slate" : "green")}
          >
            {`Rimanenti ${remaining}/${caps.max}`}
          </span>
        </div>
        <div className="mt-2 nd-help">1 gratuito • extra con pubblicità o Premium</div>
      </div>

      <button
        type="button"
        onClick={() => handleStart("weekly")}
        className="nd-btn nd-btn-sky nd-press"
        style={btnStyle("sky")}
      >
        Avvia Weekly (25)
      </button>

      {!premium && remaining === 0 && (
        <div className="nd-help">
          <button
            type="button"
            onClick={() => {
              setPremiumContextUnlock("weekly");
              setPremiumModalOpen(true);
            }}
            className="nd-btn-chip nd-press"
            style={miniChipBtn()}
          >
            Sblocca con pubblicità / Premium
          </button>
        </div>
      )}
    </div>
  );
})()}

{/* Concorso */}
{homeTab === "concorso" && (() => {
  const caps = getConcorsoCaps();
  const remaining = Math.max(0, caps.allowed - caps.used);
  const presets = [
    { id: "asl", title: "Concorso ASL/AO", total: 40, minutes: 35 },
    { id: "reg", title: "Concorso Regione", total: 50, minutes: 45 },
    { id: "mega", title: "Mega concorso", total: 60, minutes: 55 },
    { id: "month", title: "Concorso del mese", total: 50, minutes: 45 },
  ];

  return (
    <div className="mt-3 grid gap-2">
      <div className="nd-tile" style={tileStyle()}>
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-extrabold text-white">Simulazione Concorsi</div>
            <div className="nd-help">Timer + punteggio con penalità</div>
          </div>
          <span className={remaining > 0 ? "nd-pill nd-pill-slate" : "nd-pill nd-pill-amber"} style={pillStyle(remaining > 0 ? "slate" : "amber")}>
            {`Rimanenti ${remaining}/${premium ? "∞" : caps.max}`}
          </span>
        </div>
        <div className="mt-2 nd-help">1 gratuita/sett. • extra con pubblicità o Premium</div>
      </div>

      <div className="grid gap-2">
        {presets.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={async () => {
              if (remaining <= 0 && !premium) {
                setPremiumContextUnlock("concorso");
                setPremiumModalOpen(true);
                return;
              }
              // register run consumption
              writeInt(`${LS.concorsoRunsPrefix}${caps.wk}`, caps.used + 1);
              startConcorso(p);
            }}
            className="nd-btn nd-btn-ghost nd-press"
            style={btnStyle("ghost")}
          >
            {p.title} • {p.total} domande • {p.minutes} min
          </button>
        ))}
      </div>

      {!premium && remaining === 0 && (
        <div className="nd-help">
          <button
            type="button"
            onClick={() => {
              setPremiumContextUnlock("concorso");
              setPremiumModalOpen(true);
            }}
            className="nd-btn-chip nd-press"
            style={miniChipBtn()}
          >
            Sblocca con pubblicità / Premium
          </button>
        </div>
      )}
    </div>
  );
})()}

{/* Review */}
              {homeTab === "review" && (
                <div className="mt-3 nd-tile" style={tileStyle()}>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-extrabold text-white">Ripasso errori</div>
                      <div className="nd-help">10 domande</div>
                    </div>
                    {!premium && <span className="nd-pill nd-pill-amber" style={pillStyle("amber")}>Premium</span>}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!premium) {
                        setPremiumModalOpen(true);
                        return;
                      }
                      start("review", { questions: pickMistakeReviewQuestions(QUIZ_BANK, 10) });
                    }}
                    className="mt-3 nd-btn nd-btn-ghost nd-press"
                    style={btnStyle("ghost")}
                  >
                    Avvia (10)
                  </button>

                  {!premium && (
                    <div className="mt-2 nd-help">
                      <button type="button" onClick={() => setPremiumModalOpen(true)} className="nd-btn-chip nd-press" style={miniChipBtn()}>
                        Sblocca Premium
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {runQuiz && (
          <div className="grid gap-3">
            <div className="nd-card nd-card-pad" style={card()}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontWeight: 950 }}>
                  {runQuiz.mode === "daily" ? "Daily" : runQuiz.mode === "weekly" ? "Weekly" : runQuiz.mode === "concorso" ? "Simulazione Concorsi" : "Ripasso errori"}
                </div>
                <div style={{ opacity: 0.78, fontWeight: 900, fontSize: 12 }}>
                  {runQuiz.idx + 1}/{runQuiz.questions.length} • {runQuiz.endsAt ? `⏳ ${msToHMS(Math.max(0, runQuiz.endsAt - nowTs))}` : msToHMS(nowTs - runQuiz.startedAt)}
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                <div className="nd-progress" style={progressWrapStyle()}>
                  <div className="nd-progress-fill" style={progressFillStyle(((runQuiz.idx + (reveal ? 1 : 0)) / runQuiz.questions.length), "sky")} />
                </div>
                {reveal && (
                  <div className={`nd-quiz-feedback ${reveal.isCorrect ? "ok" : "bad"}`} style={{ marginTop: 10 }}>
                    {reveal.isCorrect ? "✅ Corretto!" : "❌ Non proprio."} <span style={{ opacity: 0.82 }}>Risposta corretta: {runQuiz.questions[runQuiz.idx].options[reveal.correctIdx]}</span>
                  </div>
                )}
              </div>

              <div style={{ marginTop: 10, fontWeight: 900, fontSize: 15 }}>{runQuiz.questions[runQuiz.idx].q}</div>

              {!reveal && (
                <div style={{ marginTop: 6, fontSize: 12, fontWeight: 850, opacity: 0.72 }}>
                  Tocca una risposta e poi premi <span style={{ opacity: 0.95 }}>“Conferma”</span>.
                </div>
              )}


              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                {runQuiz.questions[runQuiz.idx].options.map((opt, i) => {
                  const active = selected === i;
                  const correct = reveal ? i === reveal.correctIdx : false;
                  const wrong = reveal ? i === reveal.chosen && !reveal.isCorrect : false;

                  const cls =
                    "nd-quiz-option" +
                    (active && !reveal ? " nd-quiz-option--active" : "") +
                    (correct ? " nd-quiz-option--correct" : "") +
                    (wrong ? " nd-quiz-option--wrong" : "");

                  const letter = String.fromCharCode(65 + i);
                  const style = optionBtnStyle({ active: active && !reveal, correct, wrong, disabled: !!reveal });

                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setSelected(i);
                      }}
                      disabled={!!reveal}
                      className={cls}
                      style={style}
                      aria-pressed={active}
                    >
                      <span style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 26,
                            height: 26,
                            borderRadius: 10,
                            border: "1px solid rgba(255,255,255,0.16)",
                            background: "rgba(255,255,255,0.06)",
                            fontWeight: 950,
                            fontSize: 12,
                            flex: "0 0 auto",
                          }}
                        >
                          {letter}
                        </span>
                        <span style={{ flex: 1, paddingTop: 2 }}>{opt}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => {
                    setRunQuiz(null);
                    setReveal(null);
                    setSelected(null);
                  }}
                  className="nd-btn-ghost nd-press"
                  style={ghostBtn()}
                >
                  Esci
                </button>

                {!reveal ? (
                  <button type="button" onClick={confirmAnswer} disabled={selected === null} className="nd-btn-primary nd-press" style={primaryBtn(selected === null)}>
                    Conferma
                  </button>
                ) : (
                  <button type="button" onClick={goNext} className="nd-btn-primary nd-press" style={primaryBtn(false)}>
                    Avanti
                  </button>
                )}
              </div>

            </div>
          </div>
        )}

        {!runQuiz && quizResult && (
          <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
            <div className="nd-card nd-card-pad" style={card()}>
              <div style={{ fontWeight: 950, fontSize: 16 }}>Risultato</div>
              {lastReward && (
                <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span className="nd-pill nd-pill-slate" style={pillStyle("slate")}>+{lastReward.xp} XP</span>
                  <span className="nd-pill nd-pill-amber" style={pillStyle("amber")}>+{lastReward.pills} pillole</span>
                </div>
              )}
              {!premium && (
                <div className="nd-card nd-card-pad" style={{ ...card(), marginTop: 10 }}>
                  <div className="flex items-center justify-between gap-2">
                    <div style={{ fontWeight: 950 }}>Sblocca Premium</div>
                    <span className="nd-pill nd-pill-amber" style={pillStyle("amber")}>Premium</span>
                  </div>
                  <div className="mt-2 nd-help">Simulazione Concorsi (25) + Ripasso errori + XP bonus.</div>
                  <div className="mt-3" style={{ display: "flex", gap: 10 }}>
                    <button type="button" onClick={() => setPremiumModalOpen(true)} className="nd-btn-primary nd-press">
                      Scopri Premium
                    </button>
                  </div>
                </div>
              )}

              <div style={{ marginTop: 6, opacity: 0.85, fontWeight: 850, fontSize: 13, display: "grid", gap: 6 }}>
                <div>
                  {quizResult.correct}/{quizResult.total} corrette • {msToHMS(quizResult.ms)}
                  {quizResult.timeLimitMs ? <> • Tempo limite {msToHMS(quizResult.timeLimitMs)}</> : null}
                </div>

                {quizResult.mode === "concorso" ? (
                  <div style={{ opacity: 0.95 }}>
                    {(() => {
                      const wrongN = quizResult.wrong?.length || 0;
                      const omitted = Math.max(0, quizResult.total - quizResult.correct - wrongN);
                      const score = quizResult.correct * 1 - wrongN * 0.25;
                      return (
                        <span>
                          <span style={{ fontWeight: 950 }}>Punteggio: {score.toFixed(2)}</span>{" "}
                          <span style={{ opacity: 0.85 }}>(+1 corretta, −0.25 errata, 0 omessa • Errate {wrongN} • Omesse {omitted})</span>
                        </span>
                      );
                    })()}
                  </div>
                ) : null}
              </div>

              {Object.keys(quizResult.byCategory || {}).length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div className="nd-subtitle">Categorie da ripassare</div>
                  <div className="mt-2" style={{ display: "grid", gap: 8 }}>
                    {Object.entries(quizResult.byCategory)
                      .map(([k, v]) => ({ k, ...v, rate: v.total ? v.correct / v.total : 0 }))
                      .sort((a, b) => a.rate - b.rate)
                      .slice(0, 3)
                      .map((it) => (
                        <div key={it.k} style={{ padding: 10, borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                            <div style={{ fontWeight: 900 }}>{it.k}</div>
                            <div className="nd-meta">{it.correct}/{it.total}</div>
                          </div>
                          <div className="mt-2 nd-progress">
                            <div className="nd-progress-fill" style={{ width: `${Math.round(Math.max(0, Math.min(1, it.rate)) * 100)}%` }} />
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
              {quizResult.mode === "concorso" && Object.keys(quizResult.byCategory || {}).length > 0 ? (
                <div style={{ marginTop: 12 }}>
                  <div className="nd-subtitle">Breakdown per categoria</div>
                  <div className="mt-2" style={{ display: "grid", gap: 8 }}>
                    {Object.entries(quizResult.byCategory)
                      .map(([k, v]) => ({ k, ...v, rate: v.total ? v.correct / v.total : 0 }))
                      .sort((a, b) => a.k.localeCompare(b.k))
                      .map((it) => (
                        <div key={it.k} style={{ padding: 10, borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                            <div style={{ fontWeight: 900 }}>{it.k}</div>
                            <div className="nd-meta">{it.correct}/{it.total} • {Math.round(it.rate * 100)}%</div>
                          </div>
                          <div className="mt-2 nd-progress">
                            <div className="nd-progress-fill" style={{ width: `${Math.round(Math.max(0, Math.min(1, it.rate)) * 100)}%` }} />
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ) : null}


              </div>
              <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
                <button type="button" onClick={() => setQuizResult(null)} className="nd-btn-ghost nd-press">
                  Chiudi
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (quizResult.mode === "daily") start("daily");
                    else if (quizResult.mode === "weekly") start("weekly");
                    else if (quizResult.mode === "concorso") setHomeTab("concorso");
                    else start("review", { questions: pickMistakeReviewQuestions(QUIZ_BANK, 10) });
                  }}
                  className="nd-btn-primary nd-press"
                >
                  Rifai
                </button>
              </div>
            </div>

            {quizResult.wrong.length > 0 && (
              <div className="nd-card nd-card-pad" style={card()}>
                <div style={{ fontWeight: 950 }}>Errori da rivedere</div>
                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  {quizResult.wrong.slice(0, 12).map((w, idx) => {
                    const isFav = favs.includes(w.q.id);
                    return (
                      <div key={idx} style={{ padding: 12, borderRadius: 16, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                          <div style={{ fontWeight: 900 }}>{w.q.q}</div>
                          <button
                            type="button"
                            onClick={() => toggleFav(w.q.id)}
                            style={{ border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: "6px 10px", fontWeight: 950, cursor: "pointer" }}
                            aria-label={isFav ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}
                          >
                            {isFav ? "★" : "☆"}
                          </button>
                        </div>
                        <div style={{ marginTop: 6, fontWeight: 800, opacity: 0.85 }}>La tua: {w.q.options[w.chosen] ?? "(non risposta)"}</div>
                        <div style={{ marginTop: 4, fontWeight: 900 }}>Corretta: {w.q.options[w.q.answer]}</div>
                        <div style={{ marginTop: 6, opacity: 0.82, fontWeight: 800, fontSize: 13 }}>💡 {w.q.explain}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
        </div>
      </Section>

      {/* Unlock modal (rewarded ad / premium) */}
      {unlockModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            padding: 12,
            zIndex: 50,
          }}
          onClick={() => setUnlockModal(null)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 560,
              ...card(),
              padding: 14,
              borderRadius: 18,
              marginBottom: 64,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontWeight: 950, fontSize: 15 }}>Sblocca {unlockModal.kind === "daily" ? "Daily" : "Weekly"}</div>
              <button type="button" onClick={() => setUnlockModal(null)} style={miniChipBtn()}>
                ✕
              </button>
            </div>
            <div className="nd-help" style={{ marginTop: 8 }}>
              Gratis: 1 {unlockModal.kind === "daily" ? "al giorno" : "a settimana"}. Extra con pubblicità o Premium.
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              <button
                type="button"
                onClick={async () => {
                  const ok = await unlockViaAd(unlockModal.kind);
                  if (ok) {
                    setUnlockModal(null);
                    // start immediately after unlock
                    await new Promise((r) => setTimeout(r, 50));
                    start(unlockModal.kind);
                  }
                }}
                className="nd-btn nd-btn-sky nd-press"
                style={btnStyle("sky")}
              >
                Guarda pubblicità
              </button>

              <button
                type="button"
                onClick={() => {
                  setUnlockModal(null);
                  setPremiumModalOpen(true);
                }}
                className="nd-btn nd-btn-ghost nd-press"
                style={btnStyle("ghost")}
              >
                Passa a Premium
              </button>
            </div>
          </div>
        </div>
      )}

      <NurseBottomNav active="didattica" onChange={(t) => { void goTab(t); }} />

      <PremiumUpsellModal
        open={premiumModalOpen}
        context="quiz"
        secondaryCta={premiumContextUnlock ? "Guarda pubblicità" : undefined}
        onSecondary={
          premiumContextUnlock
            ? async () => {
                const k = premiumContextUnlock;
                setPremiumContextUnlock(null);
                setPremiumModalOpen(false);
                if (k === "concorso") {
                  await unlockConcorsoViaAd();
                  setHomeTab("concorso");
                  return;
                }
                const ok = await unlockViaAd(k);
                if (ok) start(k);
              }
            : undefined
        }
        onClose={() => {
          setPremiumContextUnlock(null);
          setPremiumModalOpen(false);
        }}
      />
      </>
    </Page>);
}

function addPills(amount: number) {
  try {
    if (typeof window === "undefined") return;
    const key = "nd_pills";
    const cur = Number(localStorage.getItem(key) || "0");
    const next = (Number.isFinite(cur) ? cur : 0) + amount;
    localStorage.setItem(key, String(Math.max(0, Math.floor(next))));
    window.dispatchEvent(new StorageEvent("storage", { key }));
  } catch {}
}

// (pills-from-xp helper intentionally inlined where used)
