import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

import Page from "../layouts/Page";
import Section from "../layouts/Section";
import NurseBottomNav from "../components/nursediary/NurseBottomNav";
import PremiumUpsellModal from "@/components/nursediary/PremiumUpsellModal";

import { QUIZ_BANK, type QuizQuestion } from "@/features/cards/quiz/quizBank";
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
  mode: "daily" | "weekly" | "sim" | "review";
  idx: number;
  correct: number;
  questions: QuizQuestion[];
  answers: number[];
  startTs: number;
  timerEnabled?: boolean;
  timeLimitMs?: number;
};

type QuizResult = {
  mode: QuizRun["mode"];
  correct: number;
  total: number;
  pct: number;
  badge: { label: string; emoji: string };
  pillsGain: number;
  xpGain: number;
  elapsedMs: number;
  bestText?: string;
  improvedBest?: boolean;
  wrong: { q: QuizQuestion; chosen: number }[];
  questions: QuizQuestion[];
  answers: number[];
};

function msToHMS(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function pickRandom<T>(arr: T[], n: number) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

function shuffleQuestion(q: QuizQuestion): QuizQuestion {
  // shuffle options per-run to reduce memorizzazione (remap answer index)
  const idxs = q.options.map((_, i) => i);
  for (let i = idxs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idxs[i], idxs[j]] = [idxs[j], idxs[i]];
  }
  const options = idxs.map((i) => q.options[i]);
  const answer = idxs.indexOf(q.answer);
  return { ...q, options, answer };
}

const LS = {
  pills: "nd_pills",
  premium: "nd_premium",
  favs: "nd_quiz_favs_v1",
  bestDaily: "nd_quiz_best_daily_v1",
  bestWeekly: "nd_quiz_best_weekly_v1",
  bestSim: "nd_quiz_best_sim_v1",
} as const;

const isBrowser = () => typeof window !== "undefined" && typeof localStorage !== "undefined";

function safeJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function badgeForPct(pct: number): { label: string; emoji: string } {
  if (pct >= 90) return { label: "Eccellente", emoji: "🏅" };
  if (pct >= 75) return { label: "Ottimo", emoji: "⭐" };
  if (pct >= 60) return { label: "Buono", emoji: "✅" };
  if (pct >= 40) return { label: "Da migliorare", emoji: "📚" };
  return { label: "Riprova", emoji: "🔁" };
}

function fmtMSS(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}:${String(ss).padStart(2, "0")}`;
}

function bestKeyFor(mode: QuizRun["mode"]) {
  if (mode === "daily") return LS.bestDaily;
  if (mode === "weekly") return LS.bestWeekly;
  return LS.bestSim;
}

type BestState = { v: 1; bestPct: number; bestTimeMs: number; bestCorrect: number; ts: number };

function getBest(mode: QuizRun["mode"]): BestState | null {
  if (!isBrowser()) return null;
  const key = bestKeyFor(mode);
  const s = safeJson<BestState | null>(localStorage.getItem(key), null);
  return s && s.v === 1 ? s : null;
}

function setBest(mode: QuizRun["mode"], s: BestState) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(bestKeyFor(mode), JSON.stringify(s));
  } catch {}
}

function getFavs(): string[] {
  if (!isBrowser()) return [];
  return safeJson<string[]>(localStorage.getItem(LS.favs), []);
}

function setFavs(ids: string[]) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(LS.favs, JSON.stringify(ids));
  } catch {}
}

function card(): React.CSSProperties {
  return {
    padding: 14,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    boxShadow: "0 12px 28px rgba(0,0,0,0.35)",
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

export default function QuizPage(): JSX.Element {
  const router = useRouter();
  const goTab = (tab: "home" | "didattica" | "carte" | "profilo") => router.push(`/?tab=${tab}`);

  const [dailyLeft, setDailyLeft] = useState(0);
  const [weeklyLeft, setWeeklyLeft] = useState(0);
  const [premium, setPremium] = useState(false);
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);
  const [runQuiz, setRunQuiz] = useState<QuizRun | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [simTimer, setSimTimer] = useState(false);
  const [nowTs, setNowTs] = useState<number>(Date.now());
  const [favs, setFavsState] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const tick = () => {
      setDailyLeft(getNextDailyResetMs());
      setWeeklyLeft(getNextWeeklyResetMs());
    };
    tick();
    try {
      setPremium(localStorage.getItem(LS.premium) === "1");
      setFavsState(getFavs());
    } catch {}
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!runQuiz) return;
    const id = window.setInterval(() => setNowTs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [runQuiz]);

  const daily = useMemo(() => getDailyState(), [dailyLeft]);
  const weekly = useMemo(() => getWeeklyState(), [weeklyLeft]);

  const DAY_MS = 24 * 60 * 60 * 1000;
  const WEEK_MS = 7 * DAY_MS;
  const dailyProgress = Math.max(0, Math.min(1, 1 - dailyLeft / DAY_MS));
  const weeklyProgress = Math.max(0, Math.min(1, 1 - weeklyLeft / WEEK_MS));

  function startQuiz(mode: "daily" | "weekly" | "sim" | "review", opts?: { questions?: QuizQuestion[] }) {
    if (mode === "daily") {
      const d = getDailyState();
      if (d.status === "done") return;
    }
    if (mode === "weekly") {
      const w = getWeeklyState();
      if (w.status === "done") return;
    }

    if (mode === "review" && !(localStorage.getItem(LS.premium) === "1")) return;

    const n = mode === "daily" ? 5 : mode === "weekly" ? 12 : mode === "sim" ? 25 : 10;


    // anti-ripetizione "soft"
    const recentKey = "nd_quiz_recent_v1";
    const recent = (() => {
      try {
        const raw = localStorage.getItem(recentKey);
        return raw ? (JSON.parse(raw) as string[]) : [];
      } catch {
        return [];
      }
    })();
    const candidates = QUIZ_BANK.filter((q) => !recent.includes(q.id));
    const pool = candidates.length >= n ? candidates : QUIZ_BANK;

    const questionsRaw = opts?.questions?.length ? opts.questions : pickRandom(pool, n);
    const questions = questionsRaw.map(shuffleQuestion);
    try {
      const nextRecent = [...questions.map((q) => q.id), ...recent].slice(0, 50);
      localStorage.setItem(recentKey, JSON.stringify(nextRecent));
    } catch {}

    const timeLimitMs = mode === "sim" && simTimer ? 25 * 60 * 1000 : undefined;
    setRunQuiz({ mode, idx: 0, correct: 0, questions, answers: [], startTs: Date.now(), timerEnabled: mode === "sim" ? simTimer : false, timeLimitMs });
    setSelected(null);
    setQuizResult(null);
  }

  function finishRun(run: QuizRun, answers: number[], finalCorrect: number) {
    const total = run.questions.length;
    const perfect = finalCorrect === total;
    const elapsedMs = Date.now() - run.startTs;

    const wrong: { q: QuizQuestion; chosen: number }[] = [];
    for (let k = 0; k < total; k++) {
      const qq = run.questions[k];
      const chosen = answers[k];
      if (chosen !== qq.answer) wrong.push({ q: qq, chosen });
    }

    // rewards
    let pillsGain = 0;
    if (run.mode === "daily") {
      const d = getDailyState();
      const nextStreak = d.status === "done" ? d.streak : (d.streak || 0) + 1;
      pillsGain = calcDailyReward(finalCorrect, total, perfect, nextStreak);
      setDailyState({ ...d, status: "done", streak: nextStreak });
    } else if (run.mode === "weekly") {
      pillsGain = calcWeeklyReward(finalCorrect, total, perfect);
      const w = getWeeklyState();
      setWeeklyState({ ...w, status: "done" });
    } else {
      pillsGain = 0;
    }

    const xpGain =
      run.mode === "sim"
        ? 30 + finalCorrect * 2 + (perfect ? 15 : 0)
        : run.mode === "review"
        ? 15 + finalCorrect
        : 20 + finalCorrect * (run.mode === "daily" ? 6 : 8) + (perfect ? 20 : 0);

    if (run.mode !== "review") {
      try {
        const cur = Number(localStorage.getItem(LS.pills) || "0") || 0;
        localStorage.setItem(LS.pills, String(cur + pillsGain));
      } catch {}
    }

    addXp(xpGain);

    // history only for main modes
    if (run.mode !== "review") {
      const item: QuizHistoryItem = {
        ts: Date.now(),
        mode: run.mode === "sim" ? "sim" : run.mode,
        correct: finalCorrect,
        total,
        byCategory: {},
      };
      pushHistory(item);
    }

    // best record (only for sim)
    const pct = Math.round((finalCorrect / total) * 100);
    const badge = badgeForPct(pct);
    let bestText: string | undefined;
    let improvedBest = false;
    if (run.mode === "sim") {
      const prev = getBest("sim");
      const better = !prev || pct > prev.bestPct || (pct === prev.bestPct && elapsedMs < prev.bestTimeMs);
      if (better) {
        improvedBest = true;
        setBest("sim", { v: 1, bestPct: pct, bestTimeMs: elapsedMs, bestCorrect: finalCorrect, ts: Date.now() });
      }
      const curBest = getBest("sim");
      if (curBest) bestText = `Record: ${curBest.bestPct}% • ${fmtMSS(curBest.bestTimeMs)}`;
    }

    // record mistakes for wrong answers (all modes)
    for (const w of wrong) recordMistake(w.q.id);

    setQuizResult({
      mode: run.mode,
      correct: finalCorrect,
      total,
      pct,
      badge,
      pillsGain,
      xpGain,
      elapsedMs,
      bestText,
      improvedBest,
      wrong,
      questions: run.questions,
      answers,
    });
    setRunQuiz(null);
    setSelected(null);
  }

  function answerQuiz(i: number) {
    if (!runQuiz) return;
    const q = runQuiz.questions[runQuiz.idx];
    const ok = i === q.answer;
    const nextCorrect = runQuiz.correct + (ok ? 1 : 0);

    const answers = [...runQuiz.answers];
    answers[runQuiz.idx] = i;
    setSelected(i);

    window.setTimeout(() => {
      const isLast = runQuiz.idx >= runQuiz.questions.length - 1;
      if (!isLast) {
        setRunQuiz({ ...runQuiz, idx: runQuiz.idx + 1, correct: nextCorrect, answers });
        setSelected(null);
        return;
      }

      finishRun(runQuiz, answers, nextCorrect);
    }, 450);
  }

  // timer auto-finish (sim)
  useEffect(() => {
    if (!runQuiz) return;
    if (!runQuiz.timerEnabled || !runQuiz.timeLimitMs) return;
    const elapsed = nowTs - runQuiz.startTs;
    if (elapsed < runQuiz.timeLimitMs) return;

    // fill unanswered with -1 and finish
    const answers = [...runQuiz.answers];
    for (let k = 0; k < runQuiz.questions.length; k++) {
      if (typeof answers[k] !== "number") answers[k] = -1;
    }
    let c = 0;
    for (let k = 0; k < runQuiz.questions.length; k++) {
      if (answers[k] === runQuiz.questions[k].answer) c++;
    }
    finishRun(runQuiz, answers, c);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nowTs, runQuiz]);

  function toggleFav(id: string) {
    const cur = new Set(favs);
    if (cur.has(id)) cur.delete(id);
    else cur.add(id);
    const next = Array.from(cur);
    setFavsState(next);
    setFavs(next);
  }

  function startRetryMistakes() {
    if (!quizResult) return;
    const wrongIds = quizResult.wrong.map((w) => w.q.id);
    if (!wrongIds.length) return;
    const picked = pickMistakeReviewQuestions(QUIZ_BANK, Math.min(20, wrongIds.length), []);
    // Ensure we prioritize the just-missed questions first
    const byId = new Map(QUIZ_BANK.map((q) => [q.id, q] as const));
    const ordered: QuizQuestion[] = [];
    for (const id of wrongIds) {
      const q = byId.get(id);
      if (q) ordered.push(q);
    }
    // fill with picked (avoid duplicates)
    const seen = new Set(ordered.map((q) => q.id));
    for (const q of picked) {
      if (ordered.length >= 20) break;
      if (!seen.has(q.id)) ordered.push(q);
    }
    startQuiz("review", { questions: ordered });
  }

  return (
    <Page
      title="Quiz"
      headerOverride={{ title: "Quiz", subtitle: "Daily • Weekly • Simulazione", showBack: true }}>
      <div style={card()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 950, fontSize: 18 }}>Quiz</div>
                <div style={{ opacity: 0.78, fontWeight: 800, fontSize: 12 }}>Daily • Weekly • Simulazione</div>
              </div>

              <div style={{ textAlign: "right", opacity: 0.78, fontWeight: 900, fontSize: 12, lineHeight: 1.25 }}>
                <div>Reset Daily: {msToHMS(dailyLeft)}</div>
                <div>Reset Weekly: {msToHMS(weeklyLeft)}</div>
                {daily?.streak ? <div style={{ marginTop: 4, opacity: 0.9 }}>Streak: {daily.streak}🔥</div> : null}
              </div>
            </div>

            {/* progress bars */}
            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 850, opacity: 0.86 }}>
                  <span>Daily</span>
                  <span>{Math.round(dailyProgress * 100)}%</span>
                </div>
                <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden", marginTop: 6 }}>
                  <div style={{ height: "100%", width: `${Math.round(dailyProgress * 100)}%`, background: "rgba(96,165,250,0.55)" }} />
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 850, opacity: 0.86 }}>
                  <span>Weekly</span>
                  <span>{Math.round(weeklyProgress * 100)}%</span>
                </div>
                <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden", marginTop: 6 }}>
                  <div style={{ height: "100%", width: `${Math.round(weeklyProgress * 100)}%`, background: "rgba(34,197,94,0.45)" }} />
                </div>
              </div>
            </div>

            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button type="button" onClick={() => startQuiz("daily")} disabled={daily.status === "done" || !!runQuiz} style={primaryBtn(daily.status === "done" || !!runQuiz)}>
                {daily.status === "done" ? "Daily completato ✅" : "Avvia Daily"}
              </button>
              <button type="button" onClick={() => startQuiz("weekly")} disabled={weekly.status === "done" || !!runQuiz} style={ghostBtn(weekly.status === "done" || !!runQuiz)}>
                {weekly.status === "done" ? "Weekly completato ✅" : "Avvia Weekly"}
              </button>
            </div>

            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              <button
                type="button"
                onClick={() => startQuiz("sim")}
                disabled={!!runQuiz}
                style={ghostBtn(!!runQuiz)}
              >
                Simulazione esame (25 domande)
              </button>

              <label style={{ display: "flex", alignItems: "center", gap: 10, opacity: 0.92, fontWeight: 850, fontSize: 13 }}>
                <input type="checkbox" checked={simTimer} onChange={(e) => setSimTimer(e.target.checked)} />
                Timer (25 min) opzionale
              </label>

              <button
                type="button"
                onClick={() => {
                  if (!premium) { setPremiumModalOpen(true); return; }
                  const qs = pickMistakeReviewQuestions(QUIZ_BANK, 10);
                  startQuiz("review", { questions: qs });
                }}
                disabled={!!runQuiz}
                style={ghostBtn(!!runQuiz)}
              >
                {premium ? "Ripasso errori (10) — Premium" : "Ripasso errori (10) 🔒 Premium"}
              </button>

              {!premium && (
                <div style={{ opacity: 0.72, fontSize: 12, fontWeight: 700 }}>
                  Premium sblocca il ripasso errori + strumenti avanzati.
                </div>
              )}
            </div>
          </div>
: 0.72, fontSize: 12, fontWeight: 700 }}>
                  Attiva Premium dal profilo per sbloccare la simulazione completa + correzione errori.
                </div>
              )}
            </div>



            {runQuiz && (
              <div style={{ marginTop: 12, borderTop: "1px solid rgba(255,255,255,0.10)", paddingTop: 12 }}>
                <div style={{ fontWeight: 950 }}>
                  {runQuiz.mode === "review" ? "REVISIONE" : runQuiz.mode.toUpperCase()} • Domanda {runQuiz.idx + 1}/{runQuiz.questions.length}
                  <span style={{ marginLeft: 8, opacity: 0.75, fontWeight: 900 }}>
                    • Tempo: {fmtMSS(nowTs - runQuiz.startTs)}
                    {runQuiz.timerEnabled && runQuiz.timeLimitMs ? ` • Rimasto: ${fmtMSS(Math.max(0, runQuiz.timeLimitMs - (nowTs - runQuiz.startTs)))}` : ""}
                  </span>
                </div>
                <div style={{ marginTop: 6, opacity: 0.9, fontWeight: 850 }}>{runQuiz.questions[runQuiz.idx].q}</div>

                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  {runQuiz.questions[runQuiz.idx].options.map((op, i) => (
                    <button key={i} type="button" onClick={() => answerQuiz(i)} disabled={selected !== null} style={(() => {
                        const q = runQuiz.questions[runQuiz.idx];
                        const locked = selected !== null;
                        const base = primaryBtn(locked);
                        if (!locked) return base;

                        const isCorrect = i === q.answer;
                        const isChosen = i === selected;

                        // When locked: show correct in green, chosen wrong in red.
                        const bg = isCorrect
                          ? "rgba(34,197,94,0.18)"
                          : isChosen && !isCorrect
                          ? "rgba(239,68,68,0.16)"
                          : "rgba(255,255,255,0.04)";
                        const br = isCorrect
                          ? "1px solid rgba(34,197,94,0.35)"
                          : isChosen && !isCorrect
                          ? "1px solid rgba(239,68,68,0.35)"
                          : base.border;

                        return { ...base, background: bg, border: br };
                      })()}>
                      {op}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {quizResult && (
              <div style={{ marginTop: 12, borderTop: "1px solid rgba(255,255,255,0.10)", paddingTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 950, fontSize: 18 }}>Risultati</div>
                    <div style={{ opacity: 0.8, fontWeight: 850, fontSize: 12 }}>
                      {quizResult.mode === "review" ? "Revisione errori" : quizResult.mode.toUpperCase()} • {fmtMSS(quizResult.elapsedMs)}
                    </div>
                  </div>
                  <div style={{ padding: "8px 12px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", fontWeight: 950 }}>
                    {quizResult.badge.emoji} {quizResult.badge.label}
                  </div>
                </div>

                <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div style={{ padding: 12, borderRadius: 16, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)" }}>
                    <div style={{ opacity: 0.78, fontWeight: 900, fontSize: 12 }}>Percentuale</div>
                    <div style={{ fontSize: 28, fontWeight: 980 }}>{quizResult.pct}%</div>
                    <div style={{ opacity: 0.8, fontWeight: 850 }}>{quizResult.correct}/{quizResult.total} corrette</div>
                  </div>
                  <div style={{ padding: 12, borderRadius: 16, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)" }}>
                    <div style={{ opacity: 0.78, fontWeight: 900, fontSize: 12 }}>Ricompense</div>
                    <div style={{ fontWeight: 950, fontSize: 16 }}>+{quizResult.xpGain} XP</div>
                    <div style={{ opacity: 0.9, fontWeight: 900 }}>
                      {quizResult.mode === "sim" ? "+0 💊" : `+${quizResult.pillsGain} 💊`}
                    </div>
                    {quizResult.bestText && (
                      <div style={{ marginTop: 6, fontWeight: 850, opacity: 0.8 }}>
                        {quizResult.bestText} {quizResult.improvedBest ? "• Nuovo record!" : ""}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <button
                    type="button"
                    style={primaryBtn()}
                    onClick={() => startQuiz(quizResult.mode === "review" ? "sim" : quizResult.mode)}
                  >
                    Riprova
                  </button>
                  <button type="button" style={ghostBtn(!quizResult.wrong.length)} disabled={!quizResult.wrong.length} onClick={startRetryMistakes}>
                    Riprova solo errori
                  </button>
                </div>

                {quizResult.wrong.length > 0 && (
                  <div style={{ marginTop: 12 }}>
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
                            <div style={{ marginTop: 6, fontWeight: 800, opacity: 0.85 }}>
                              La tua: {w.q.options[w.chosen] ?? "(non risposta)"}
                            </div>
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
        </div>
      </Section>

      <NurseBottomNav active="didattica" onChange={(t) => { void goTab(t); }} />

      <PremiumUpsellModal open={premiumModalOpen} onClose={() => setPremiumModalOpen(false)} context="quiz" />
    </Page>
  );
}