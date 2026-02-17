import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

import Page from "../layouts/Page";
import Section from "../layouts/Section";
import NurseBottomNav from "../components/nursediary/NurseBottomNav";

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

type QuizRun = {
  mode: "daily" | "weekly";
  idx: number;
  correct: number;
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

const LS = {
  pills: "nd_pills",
} as const;

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
  const [runQuiz, setRunQuiz] = useState<QuizRun | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [quizFeedback, setQuizFeedback] = useState<string | null>(null);
  const [quizReview, setQuizReview] = useState<{ q: QuizQuestion; chosen: number }[] | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const tick = () => {
      setDailyLeft(getNextDailyResetMs());
      setWeeklyLeft(getNextWeeklyResetMs());
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const daily = useMemo(() => getDailyState(), [dailyLeft]);
  const weekly = useMemo(() => getWeeklyState(), [weeklyLeft]);

  function startQuiz(mode: "daily" | "weekly") {
    const state = mode === "daily" ? getDailyState() : getWeeklyState();
    if (state.status === "done") return;
    const n = mode === "daily" ? 5 : 12;

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

    const questions = pickRandom(pool, n);
    try {
      const nextRecent = [...questions.map((q) => q.id), ...recent].slice(0, 50);
      localStorage.setItem(recentKey, JSON.stringify(nextRecent));
    } catch {}

    setRunQuiz({ mode, idx: 0, correct: 0, questions, answers: [] });
    setSelected(null);
    setQuizFeedback(null);
    setQuizReview(null);
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

      // finish
      const total = runQuiz.questions.length;
      const perfect = nextCorrect === total;

      // review wrong answers
      const wrong: { q: QuizQuestion; chosen: number }[] = [];
      for (let k = 0; k < total; k++) {
        const qq = runQuiz.questions[k];
        const chosen = answers[k];
        if (chosen !== qq.answer) wrong.push({ q: qq, chosen });
      }
      setQuizReview(wrong);

      // pills reward
      let pillsGain = 0;
      if (runQuiz.mode === "daily") {
        pillsGain = calcDailyReward(nextCorrect, total, perfect);
        const d = getDailyState();
        setDailyState({ ...d, status: "done" });
      } else {
        pillsGain = calcWeeklyReward(nextCorrect, total, perfect);
        const w = getWeeklyState();
        setWeeklyState({ ...w, status: "done" });
      }

      const xpGain = 20 + nextCorrect * (runQuiz.mode === "daily" ? 6 : 8) + (perfect ? 20 : 0);

      try {
        const cur = Number(localStorage.getItem(LS.pills) || "0") || 0;
        localStorage.setItem(LS.pills, String(cur + pillsGain));
      } catch {}

      addXp(xpGain);

      const item: QuizHistoryItem = {
        ts: Date.now(),
        mode: runQuiz.mode,
        correct: nextCorrect,
        total,
        byCategory: {},
      };
      pushHistory(item);

      setQuizFeedback(`Quiz ${runQuiz.mode}: ${nextCorrect}/${total} • +${pillsGain} 💊 • +${xpGain} XP`);
      setRunQuiz(null);
      setSelected(null);
    }, 450);
  }

  return (
    <Page
      title="Quiz"
      headerOverride={{
        title: "Quiz",
        subtitle: "Daily • Weekly • Simulazione",
        showBack: true,
        onBack: () => router.back(),
      }}
    >
      <Section>
        <div style={{ display: "grid", gap: 12 }}>
          <div style={card()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 950, fontSize: 18 }}>Quiz</div>
                <div style={{ opacity: 0.78, fontWeight: 800, fontSize: 12 }}>Daily e Weekly con timer</div>
              </div>
              <div style={{ opacity: 0.75, fontWeight: 900, fontSize: 12 }}>
                Daily: {msToHMS(dailyLeft)} • Weekly: {msToHMS(weeklyLeft)}
              </div>
            </div>

            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button type="button" onClick={() => startQuiz("daily")} disabled={daily.status === "done" || !!runQuiz} style={primaryBtn(daily.status === "done" || !!runQuiz)}>
                {daily.status === "done" ? "Daily completato ✅" : "Avvia Daily"}
              </button>
              <button type="button" onClick={() => startQuiz("weekly")} disabled={weekly.status === "done" || !!runQuiz} style={ghostBtn(weekly.status === "done" || !!runQuiz)}>
                {weekly.status === "done" ? "Weekly completato ✅" : "Avvia Weekly"}
              </button>
            </div>

            {runQuiz && (
              <div style={{ marginTop: 12, borderTop: "1px solid rgba(255,255,255,0.10)", paddingTop: 12 }}>
                <div style={{ fontWeight: 950 }}>
                  {runQuiz.mode.toUpperCase()} • Domanda {runQuiz.idx + 1}/{runQuiz.questions.length}
                </div>
                <div style={{ marginTop: 6, opacity: 0.9, fontWeight: 850 }}>{runQuiz.questions[runQuiz.idx].q}</div>

                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  {runQuiz.questions[runQuiz.idx].options.map((op, i) => (
                    <button key={i} type="button" onClick={() => answerQuiz(i)} disabled={selected !== null} style={primaryBtn(selected !== null)}>
                      {op}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {quizFeedback && (
              <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.06)", fontWeight: 850 }}>
                {quizFeedback}
              </div>
            )}

            {quizReview && quizReview.length > 0 && (
              <div style={{ marginTop: 12, borderTop: "1px solid rgba(255,255,255,0.10)", paddingTop: 12 }}>
                <div style={{ fontWeight: 950 }}>Risposte da rivedere</div>
                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  {quizReview.slice(0, 10).map((w, idx) => (
                    <div key={idx} style={{ padding: 12, borderRadius: 16, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)" }}>
                      <div style={{ fontWeight: 900 }}>{w.q.q}</div>
                      <div style={{ marginTop: 6, fontWeight: 800, opacity: 0.85 }}>
                        La tua: {w.q.options[w.chosen] ?? "—"}
                      </div>
                      <div style={{ marginTop: 4, fontWeight: 900 }}>Corretta: {w.q.options[w.q.answer]}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </Section>

      <NurseBottomNav active="home" onChange={goTab} />
    </Page>
  );
}
