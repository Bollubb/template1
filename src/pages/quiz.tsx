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
  answers: number[]; // chosen option index, -1 if none
  startedAt: number;
};

type QuizResult = {
  mode: QuizRun["mode"];
  correct: number;
  total: number;
  ms: number;
  wrong: { q: QuizQuestion; chosen: number }[];
};

const LS = {
  premium: "nd_premium",
  favs: "nd_quiz_favs",
};

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

  const [runQuiz, setRunQuiz] = useState<QuizRun | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
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
        if (mode === "daily") return QUIZ_BANK.slice(0, 10);
        if (mode === "weekly") return QUIZ_BANK.slice(10, 25);
        if (mode === "sim") return QUIZ_BANK.slice(0, 25);
        // review
        return pickMistakeReviewQuestions(QUIZ_BANK, 10);
      })();

    setQuizResult(null);
    setSelected(null);
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

    // mark done for daily/weekly
    if (run.mode === "daily") {
      const nextStreak = daily.status === "done" ? daily.streak : daily.streak + 1;
      setDailyState({ ...daily, status: "done", streak: nextStreak });
      try { localStorage.setItem("nd_quiz_streak", String(nextStreak)); } catch {}
      addXp(calcDailyReward(run.correct, run.questions.length, run.correct === run.questions.length, nextStreak));
    } else if (run.mode === "weekly") {
      setWeeklyState({ ...weekly, status: "done" });
      addXp(calcWeeklyReward(run.correct, run.questions.length, run.correct === run.questions.length));
    }
// mistakes log
    wrong.forEach((w) => recordMistake(w.q.id));

    // history (for recency)
    try {
      const item: QuizHistoryItem = {
        ts: Date.now(),
        mode: run.mode,
        correct: run.correct,
        total: run.questions.length,
        ms,
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
      wrong,
    });
  }

  function confirmAnswer() {
    if (!runQuiz) return;
    if (selected === null) return;

    const q = runQuiz.questions[runQuiz.idx];
    const answers = [...runQuiz.answers];
    answers[runQuiz.idx] = selected;

    const isCorrect = selected === q.answer;
    const correct = runQuiz.correct + (isCorrect ? 1 : 0);
    const nextIdx = runQuiz.idx + 1;

    const next: QuizRun = { ...runQuiz, answers, correct, idx: nextIdx };

    if (nextIdx >= runQuiz.questions.length) {
      finish(next);
    } else {
      setRunQuiz(next);
      setSelected(null);
    }
  }

  const headerOverride = useMemo(
    () => ({
      title: "Quiz",
      subtitle: "Daily • Weekly • Simulazione",
      showBack: true,
      onBack: () => router.back(),
    }),
    [router]
  );

  return (
    <Page title="Quiz" headerOverride={headerOverride}>
      <Section>
        {!runQuiz && (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={card()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 950, fontSize: 18 }}>Quiz</div>
                  <div style={{ opacity: 0.78, fontWeight: 800, fontSize: 12 }}>Daily, Weekly e simulazione</div>
                </div>
                <div style={{ opacity: 0.75, fontWeight: 900, fontSize: 12 }}>
                  Daily: {msToHMS(dailyLeft)} • Weekly: {msToHMS(weeklyLeft)}
                </div>
              </div>

              {streak > 0 && (
                <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, opacity: 0.9, fontWeight: 900, fontSize: 12 }}>
                  🔥 Streak: {streak} giorni
                </div>
              )}

              <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button type="button" onClick={() => start("daily")} disabled={daily.status === "done"} style={primaryBtn(daily.status === "done")}>
                  {daily.status === "done" ? "Daily completato ✅" : "Avvia Daily"}
                </button>
                <button type="button" onClick={() => start("weekly")} disabled={weekly.status === "done"} style={ghostBtn(weekly.status === "done")}>
                  {weekly.status === "done" ? "Weekly completato ✅" : "Avvia Weekly"}
                </button>
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 850, opacity: 0.8 }}>
                  <span>Daily progress</span>
                  <span>{Math.round(dailyProgress * 100)}%</span>
                </div>
                <div style={bar(dailyProgress)}>
                  <div style={barFill(dailyProgress)} />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 850, opacity: 0.8, marginTop: 6 }}>
                  <span>Weekly progress</span>
                  <span>{Math.round(weeklyProgress * 100)}%</span>
                </div>
                <div style={bar(weeklyProgress)}>
                  <div style={barFill(weeklyProgress)} />
                </div>
              </div>
            </div>

            <div style={card()}>
              <div style={{ fontWeight: 950, fontSize: 15 }}>Simulazione Esame</div>
              <div style={{ marginTop: 6, opacity: 0.78, fontWeight: 800, fontSize: 12 }}>25 domande • risultato finale</div>
              <div style={{ marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => {
                    if (!premium) {
                      setPremiumModalOpen(true);
                      return;
                    }
                    start("sim");
                  }}
                  style={primaryBtn(false)}
                >
                  Avvia simulazione (25)
                </button>
                {!premium && (
                  <div style={{ marginTop: 8, opacity: 0.72, fontSize: 12, fontWeight: 800 }}>
                    Premium: sblocca simulazione + ripasso errori.
                  </div>
                )}
              </div>
            </div>

            <div style={card()}>
              <div style={{ fontWeight: 950, fontSize: 15 }}>Ripasso errori</div>
              <div style={{ marginTop: 6, opacity: 0.78, fontWeight: 800, fontSize: 12 }}>10 domande dalle risposte sbagliate</div>
              <div style={{ marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => {
                    if (!premium) {
                      setPremiumModalOpen(true);
                      return;
                    }
                    start("review", { questions: pickMistakeReviewQuestions(QUIZ_BANK, 10) });
                  }}
                  style={ghostBtn(false)}
                >
                  Avvia ripasso (10) ⭐ Premium
                </button>
              </div>
            </div>
          </div>
        )}

        {runQuiz && (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={card()}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontWeight: 950 }}>
                  {runQuiz.mode === "daily" ? "Daily" : runQuiz.mode === "weekly" ? "Weekly" : runQuiz.mode === "sim" ? "Simulazione" : "Ripasso errori"}
                </div>
                <div style={{ opacity: 0.78, fontWeight: 900, fontSize: 12 }}>
                  {runQuiz.idx + 1}/{runQuiz.questions.length} • {msToHMS(nowTs - runQuiz.startedAt)}
                </div>
              </div>
              <div style={{ marginTop: 10, fontWeight: 900, fontSize: 15 }}>{runQuiz.questions[runQuiz.idx].q}</div>

              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                {runQuiz.questions[runQuiz.idx].options.map((opt, i) => {
                  const active = selected === i;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelected(i)}
                      style={{
                        textAlign: "left",
                        padding: "12px 12px",
                        borderRadius: 14,
                        border: active ? "1px solid rgba(56,189,248,0.55)" : "1px solid rgba(255,255,255,0.10)",
                        background: active ? "rgba(56,189,248,0.16)" : "rgba(255,255,255,0.03)",
                        color: "rgba(255,255,255,0.92)",
                        cursor: "pointer",
                        fontWeight: 850,
                      }}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>

              <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
                <button type="button" onClick={() => setRunQuiz(null)} style={ghostBtn(false)}>
                  Esci
                </button>
                <button type="button" onClick={confirmAnswer} disabled={selected === null} style={primaryBtn(selected === null)}>
                  Conferma
                </button>
              </div>
            </div>
          </div>
        )}

        {!runQuiz && quizResult && (
          <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
            <div style={card()}>
              <div style={{ fontWeight: 950, fontSize: 16 }}>Risultato</div>
              <div style={{ marginTop: 6, opacity: 0.8, fontWeight: 850, fontSize: 13 }}>
                {quizResult.correct}/{quizResult.total} corrette • {msToHMS(quizResult.ms)}
              </div>
              <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
                <button type="button" onClick={() => setQuizResult(null)} style={ghostBtn(false)}>
                  Chiudi
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (quizResult.mode === "daily") start("daily");
                    else if (quizResult.mode === "weekly") start("weekly");
                    else if (quizResult.mode === "sim") start("sim");
                    else start("review", { questions: pickMistakeReviewQuestions(QUIZ_BANK, 10) });
                  }}
                  style={primaryBtn(false)}
                >
                  Rifai
                </button>
              </div>
            </div>

            {quizResult.wrong.length > 0 && (
              <div style={card()}>
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
      </Section>

      <NurseBottomNav active="didattica" onChange={(t) => { void goTab(t); }} />

      <PremiumUpsellModal open={premiumModalOpen} onClose={() => setPremiumModalOpen(false)} context="quiz" />
    </Page>
  );
}
