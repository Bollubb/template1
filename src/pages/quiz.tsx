import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

import Page from "../layouts/Page";
import Section from "../layouts/Section";
import NurseBottomNav from "../components/nursediary/NurseBottomNav";

import { QUIZ_BANK, type QuizCategory, type QuizDifficulty, type QuizQuestion } from "@/features/cards/quiz/quizBank";
import {
  calcDailyReward,
  calcWeeklyReward,
  getDailyState,
  getWeeklyState,
  setDailyState,
  setWeeklyState,
  getNextDailyResetMs,
  getNextWeeklyResetMs,
  getHistory,
  pushHistory,
  type QuizHistoryItem,
} from "@/features/cards/quiz/quizLogic";
import { addXp } from "@/features/progress/xp";

type QuizModeUI = "daily" | "weekly" | "sim" | "review";

type QuizRun = {
  mode: QuizModeUI;
  idx: number;
  correct: number;
  questions: QuizQuestion[];
  answers: number[];
  startedAt: number;
  timed?: { enabled: boolean; limitMs: number };
  source?: "bank" | "wrong" | "favs";
};

type ResultBadge = { label: string; emoji: string; hint: string };

const LS = {
  pills: "nd_pills",
  premium: "nd_premium",
  recent: "nd_quiz_recent_v2",
  favs: "nd_quiz_favs_v1",
  bestSim: "nd_quiz_best_sim_v1",
} as const;

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function fmtDate(ts: number) {
  try {
    return new Date(ts).toLocaleString("it-IT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return String(ts);
  }
}

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom<T>(arr: T[], n: number) {
  return shuffle(arr).slice(0, n);
}

function msToMMSS(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
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

function row(): React.CSSProperties {
  return { display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" };
}

function chip(active: boolean): React.CSSProperties {
  return {
    padding: "8px 10px",
    borderRadius: 999,
    border: active ? "1px solid rgba(56,189,248,0.60)" : "1px solid rgba(255,255,255,0.12)",
    background: active ? "rgba(56,189,248,0.16)" : "rgba(255,255,255,0.04)",
    color: "rgba(255,255,255,0.92)",
    fontWeight: 850,
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
  };
}

function btnPrimary(disabled?: boolean): React.CSSProperties {
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

function btnGhost(disabled?: boolean): React.CSSProperties {
  return {
    width: "100%",
    padding: "12px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    color: "rgba(255,255,255,0.90)",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 850,
  };
}

function badgeFor(pct: number): ResultBadge {
  if (pct >= 95) return { label: "Eccellente", emoji: "🏆", hint: "Top! Continua così." };
  if (pct >= 85) return { label: "Ottimo", emoji: "🔥", hint: "Quasi perfetto." };
  if (pct >= 70) return { label: "Buono", emoji: "✅", hint: "Sei sulla strada giusta." };
  if (pct >= 55) return { label: "Da migliorare", emoji: "🧠", hint: "Rivedi gli errori e riprova." };
  return { label: "Riprova", emoji: "🔁", hint: "Fai una revisione mirata." };
}

function catLabel(c: QuizCategory) {
  if (c === "antibiotici") return "Antibiotici";
  if (c === "farmaci") return "Farmaci";
  if (c === "procedure") return "Procedure";
  return "Emergenza";
}

function diffLabel(d: QuizDifficulty) {
  if (d === "easy") return "Facile";
  if (d === "medium") return "Medio";
  return "Difficile";
}

export default function QuizPage(): JSX.Element {
  const router = useRouter();
  const goTab = (tab: "home" | "didattica" | "carte" | "profilo") => router.push(`/?tab=${tab}`);

  const [dailyLeft, setDailyLeft] = useState(0);
  const [weeklyLeft, setWeeklyLeft] = useState(0);
  const [premium, setPremium] = useState(false);

  const [view, setView] = useState<"hub" | "quiz" | "results" | "history">("hub");
  const [run, setRun] = useState<QuizRun | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<{
    mode: QuizModeUI;
    correct: number;
    total: number;
    timeMs: number;
    pillsGain: number;
    xpGain: number;
    wrong: { q: QuizQuestion; chosen: number }[];
    badge: ResultBadge;
    newBest?: boolean;
  } | null>(null);

  // filters
  const [cats, setCats] = useState<QuizCategory[]>(["procedure", "farmaci", "antibiotici", "emergenza"]);
  const [diffs, setDiffs] = useState<QuizDifficulty[]>(["easy", "medium", "hard"]);
  const [timerSim, setTimerSim] = useState(false);

  // favorites
  const [favs, setFavs] = useState<string[]>([]);

  // tick
  useEffect(() => {
    if (!isBrowser()) return;
    const tick = () => {
      setDailyLeft(getNextDailyResetMs());
      setWeeklyLeft(getNextWeeklyResetMs());
    };
    tick();
    try {
      setPremium(localStorage.getItem(LS.premium) === "1");
    } catch {}
    try {
      const raw = localStorage.getItem(LS.favs);
      setFavs(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      setFavs([]);
    }
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const daily = useMemo(() => getDailyState(), [dailyLeft]);
  const weekly = useMemo(() => getWeeklyState(), [weeklyLeft]);

  const filteredBank = useMemo(() => {
    const sCats = new Set(cats);
    const sDiff = new Set(diffs);
    return QUIZ_BANK.filter((q) => sCats.has(q.category) && sDiff.has(q.difficulty));
  }, [cats, diffs]);

  function toggleFav(id: string) {
    setFavs((cur) => {
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [id, ...cur];
      try {
        localStorage.setItem(LS.favs, JSON.stringify(next.slice(0, 300)));
      } catch {}
      return next;
    });
  }

  function getRecentIds(): string[] {
    if (!isBrowser()) return [];
    try {
      const raw = localStorage.getItem(LS.recent);
      const arr = raw ? (JSON.parse(raw) as string[]) : [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  function setRecentIds(ids: string[]) {
    if (!isBrowser()) return;
    try {
      localStorage.setItem(LS.recent, JSON.stringify(ids.slice(0, 60)));
    } catch {}
  }

  function buildQuestions(mode: QuizModeUI, source: "bank" | "wrong" | "favs", payload?: { wrong?: { q: QuizQuestion; chosen: number }[] }) {
    const n = mode === "daily" ? 5 : mode === "weekly" ? 12 : mode === "sim" ? 20 : 10;

    if (source === "wrong") {
      const wrong = payload?.wrong || [];
      const qs = wrong.map((w) => w.q);
      return pickRandom(qs, Math.min(n, qs.length));
    }

    if (source === "favs") {
      const pool = filteredBank.filter((q) => favs.includes(q.id));
      return pickRandom(pool, Math.min(n, pool.length));
    }

    // bank
    const recent = getRecentIds();
    const candidates = filteredBank.filter((q) => !recent.includes(q.id));
    const pool = candidates.length >= n ? candidates : filteredBank;
    const picked = pickRandom(pool, Math.min(n, pool.length));
    setRecentIds([...picked.map((q) => q.id), ...recent]);
    return picked;
  }

  function start(mode: QuizModeUI, source: "bank" | "wrong" | "favs" = "bank", payload?: { wrong?: { q: QuizQuestion; chosen: number }[] }) {
    // lockouts
    if (mode === "daily" && getDailyState().status === "done") return;
    if (mode === "weekly" && getWeeklyState().status === "done") return;

    if (mode === "sim" && !premium) return;

    const questions = buildQuestions(mode, source, payload);
    if (!questions.length) {
      // nothing available (e.g., favorites empty with current filters)
      setResult({
        mode,
        correct: 0,
        total: 0,
        timeMs: 0,
        pillsGain: 0,
        xpGain: 0,
        wrong: [],
        badge: { label: "Nessuna domanda", emoji: "⚠️", hint: "Non ci sono domande disponibili con questi filtri." },
      });
      setView("results");
      return;
    }

    const timed =
      mode === "sim"
        ? { enabled: timerSim, limitMs: 25 * 60 * 1000 }
        : { enabled: false, limitMs: 0 };

    setRun({
      mode,
      idx: 0,
      correct: 0,
      questions,
      answers: Array(questions.length).fill(-1),
      startedAt: Date.now(),
      timed,
      source,
    });
    setSelected(null);
    setResult(null);
    setView("quiz");
  }

  // Timer countdown only for sim
  const timeLeftMs = useMemo(() => {
    if (!run?.timed?.enabled) return 0;
    const elapsed = Date.now() - run.startedAt;
    return Math.max(0, run.timed.limitMs - elapsed);
  }, [run, view]);

  useEffect(() => {
    if (!run?.timed?.enabled) return;
    if (view !== "quiz") return;
    const id = window.setInterval(() => {
      // trigger rerender
      setRun((r) => (r ? { ...r } : r));
    }, 250);
    return () => window.clearInterval(id);
  }, [run?.timed?.enabled, view]);

  useEffect(() => {
    if (!run?.timed?.enabled) return;
    if (view !== "quiz") return;
    if (timeLeftMs > 0) return;
    // time over => finish as-is
    finishRun();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeftMs, run?.timed?.enabled, view]);

  function answer(i: number) {
    if (!run) return;
    const q = run.questions[run.idx];
    const ok = i === q.answer;
    const nextCorrect = run.correct + (ok ? 1 : 0);

    const answers = [...run.answers];
    answers[run.idx] = i;

    setSelected(i);

    window.setTimeout(() => {
      const isLast = run.idx >= run.questions.length - 1;
      if (!isLast) {
        setRun({ ...run, idx: run.idx + 1, correct: nextCorrect, answers });
        setSelected(null);
        return;
      }
      // end
      setRun({ ...run, correct: nextCorrect, answers });
      finishRun({ ...run, correct: nextCorrect, answers });
    }, 280);
  }

  function getBestSim(): { pct: number; timeMs: number; ts: number } | null {
    if (!isBrowser()) return null;
    try {
      const raw = localStorage.getItem(LS.bestSim);
      if (!raw) return null;
      const v = JSON.parse(raw) as any;
      if (typeof v?.pct !== "number" || typeof v?.timeMs !== "number" || typeof v?.ts !== "number") return null;
      return v;
    } catch {
      return null;
    }
  }

  function setBestSim(v: { pct: number; timeMs: number; ts: number }) {
    if (!isBrowser()) return;
    try {
      localStorage.setItem(LS.bestSim, JSON.stringify(v));
    } catch {}
  }

  function finishRun(forcedRun?: QuizRun) {
    const r = forcedRun || run;
    if (!r) return;

    const total = r.questions.length;
    const correct = r.correct;

    // wrong list
    const wrong: { q: QuizQuestion; chosen: number }[] = [];
    for (let k = 0; k < total; k++) {
      const qq = r.questions[k];
      const chosen = r.answers[k];
      if (chosen !== qq.answer) wrong.push({ q: qq, chosen });
    }

    const perfect = total > 0 && correct === total;
    const timeMs = Date.now() - r.startedAt;

    // rewards
    let pillsGain = 0;
    if (r.mode === "daily") {
      const d = getDailyState();
      const nextStreak = d.status === "done" ? d.streak : (d.streak || 0) + 1;
      pillsGain = calcDailyReward(correct, total, perfect, nextStreak);
      setDailyState({ ...d, status: "done", streak: nextStreak });
    } else if (r.mode === "weekly") {
      pillsGain = calcWeeklyReward(correct, total, perfect);
      const w = getWeeklyState();
      setWeeklyState({ ...w, status: "done" });
    } else {
      pillsGain = 0;
    }

    const xpGain =
      r.mode === "sim"
        ? 30 + correct * 2 + (perfect ? 15 : 0)
        : r.mode === "review"
          ? 10 + correct * 1
          : 20 + correct * (r.mode === "daily" ? 6 : 8) + (perfect ? 20 : 0);

    // apply
    try {
      const cur = Number(localStorage.getItem(LS.pills) || "0") || 0;
      localStorage.setItem(LS.pills, String(cur + pillsGain));
    } catch {}
    addXp(xpGain);

    // history
    const byCategory: QuizHistoryItem["byCategory"] = {};
    for (let i = 0; i < total; i++) {
      const q = r.questions[i];
      const c = q.category;
      if (!byCategory[c]) byCategory[c] = { correct: 0, total: 0 };
      byCategory[c].total += 1;
      if (r.answers[i] === q.answer) byCategory[c].correct += 1;
    }

    const item: QuizHistoryItem = {
      ts: Date.now(),
      mode: r.mode,
      correct,
      total,
      byCategory,
    };
    pushHistory(item);

    // badge
    const pct = total ? Math.round((correct / total) * 100) : 0;
    const b = badgeFor(pct);

    // best for sim
    let newBest = false;
    if (r.mode === "sim" && total > 0) {
      const best = getBestSim();
      const better = !best || pct > best.pct || (pct === best.pct && timeMs < best.timeMs);
      if (better) {
        setBestSim({ pct, timeMs, ts: Date.now() });
        newBest = true;
      }
    }

    setRun(null);
    setSelected(null);

    setResult({ mode: r.mode, correct, total, timeMs, pillsGain, xpGain, wrong, badge: b, newBest });
    setView("results");
  }

  const history = useMemo(() => getHistory(), [view, dailyLeft, weeklyLeft]);

  const bestSim = useMemo(() => getBestSim(), [view]);

  function toggleInList<T extends string>(arr: T[], v: T): T[] {
    return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
  }

  const canStartSim = premium;
  const canRetryWrong = (result?.wrong?.length || 0) > 0;
  const canRetryFavs = favs.length > 0;

  return (
    <Page
      title="Quiz"
      headerOverride={{
        title: view === "history" ? "Storico quiz" : "Quiz",
        subtitle: view === "history" ? "I tuoi ultimi tentativi" : "Daily • Weekly • Simulazione",
        showBack: true,
        onBack: () => {
          if (view === "quiz") {
            // prevent accidental exit during quiz
            setView("hub");
            setRun(null);
            setSelected(null);
            return;
          }
          if (view === "results") {
            setView("hub");
            setResult(null);
            return;
          }
          if (view === "history") {
            setView("hub");
            return;
          }
          router.back();
        },
      }}
    >
      <Section>
        {view === "hub" && (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={card()}>
              <div style={row()}>
                <div>
                  <div style={{ fontWeight: 950, fontSize: 16 }}>Filtri (senza casino)</div>
                  <div style={{ opacity: 0.8, fontSize: 12, marginTop: 4 }}>Scegli cosa vuoi allenare. I quiz useranno solo queste domande.</div>
                </div>
                <button style={{ ...chip(false), cursor: "pointer" }} onClick={() => setView("history")}>
                  📚 Storico
                </button>
              </div>

              <div style={{ marginTop: 10 }}>
                <div style={{ fontWeight: 900, fontSize: 12, opacity: 0.85, marginBottom: 6 }}>Categorie</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {(["procedure", "farmaci", "antibiotici", "emergenza"] as QuizCategory[]).map((c) => (
                    <div key={c} style={chip(cats.includes(c))} onClick={() => setCats((x) => toggleInList(x, c))}>
                      {catLabel(c)}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                <div style={{ fontWeight: 900, fontSize: 12, opacity: 0.85, marginBottom: 6 }}>Difficoltà</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {(["easy", "medium", "hard"] as QuizDifficulty[]).map((d) => (
                    <div key={d} style={chip(diffs.includes(d))} onClick={() => setDiffs((x) => toggleInList(x, d))}>
                      {diffLabel(d)}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ opacity: 0.85, fontSize: 12 }}>Domande disponibili con i filtri: <b>{filteredBank.length}</b></div>
                <button
                  style={chip(timerSim)}
                  onClick={() => setTimerSim((v) => !v)}
                  title="Solo per simulazione"
                >
                  ⏱️ Timer simulazione
                </button>
              </div>
            </div>

            <div style={card()}>
              <div style={{ fontWeight: 950, fontSize: 16 }}>Scegli modalità</div>
              <div style={{ opacity: 0.8, fontSize: 12, marginTop: 4 }}>Daily e Weekly danno ricompense. Simulazione è allenamento premium.</div>

              <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                <button style={btnPrimary(daily.status === "done" || filteredBank.length < 1)} disabled={daily.status === "done" || filteredBank.length < 1} onClick={() => start("daily", "bank")}>
                  Daily (5 domande){daily.status === "done" ? " ✅" : ""}
                </button>

                <button style={btnPrimary(weekly.status === "done" || filteredBank.length < 1)} disabled={weekly.status === "done" || filteredBank.length < 1} onClick={() => start("weekly", "bank")}>
                  Weekly (12 domande){weekly.status === "done" ? " ✅" : ""}
                </button>

                <button style={btnPrimary(!canStartSim || filteredBank.length < 1)} disabled={!canStartSim || filteredBank.length < 1} onClick={() => start("sim", "bank")}>
                  Simulazione esame (20) {premium ? "" : "🔒"}
                </button>

                <button style={btnGhost(!canRetryFavs)} disabled={!canRetryFavs} onClick={() => start("review", "favs")}>
                  ⭐ Riprova solo preferiti
                </button>
              </div>

              <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", opacity: 0.85, fontSize: 12 }}>
                <div>Reset daily tra: <b>{msToMMSS(dailyLeft)}</b></div>
                <div>Reset weekly tra: <b>{msToMMSS(weeklyLeft)}</b></div>
              </div>

              {bestSim && (
                <div style={{ marginTop: 10, fontSize: 12, opacity: 0.9 }}>
                  🏁 Best simulazione: <b>{bestSim.pct}%</b> • {msToMMSS(bestSim.timeMs)} • {fmtDate(bestSim.ts)}
                </div>
              )}
            </div>
          </div>
        )}

        {view === "quiz" && run && (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={card()}>
              <div style={row()}>
                <div style={{ fontWeight: 950 }}>
                  {run.mode === "daily" ? "Daily" : run.mode === "weekly" ? "Weekly" : run.mode === "sim" ? "Simulazione" : "Revisione"}
                  <span style={{ opacity: 0.7, fontWeight: 700 }}> • {run.idx + 1}/{run.questions.length}</span>
                </div>
                {run.timed?.enabled && run.mode === "sim" && (
                  <div style={{ ...chip(false), cursor: "default" }}>⏱️ {msToMMSS(timeLeftMs)}</div>
                )}
              </div>

              <div style={{ marginTop: 10, fontSize: 15, fontWeight: 900, lineHeight: 1.25 }}>{run.questions[run.idx].q}</div>
              <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap", opacity: 0.85, fontSize: 12 }}>
                <span style={{ ...chip(false), cursor: "default" }}>{catLabel(run.questions[run.idx].category)}</span>
                <span style={{ ...chip(false), cursor: "default" }}>{diffLabel(run.questions[run.idx].difficulty)}</span>
                <span
                  style={chip(favs.includes(run.questions[run.idx].id))}
                  onClick={() => toggleFav(run.questions[run.idx].id)}
                  title="Aggiungi/Rimuovi preferito"
                >
                  ⭐ Preferito
                </span>
              </div>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {run.questions[run.idx].options.map((opt, i) => {
                const picked = selected === i;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => answer(i)}
                    disabled={selected !== null}
                    style={{
                      ...btnGhost(selected !== null),
                      textAlign: "left",
                      border: picked ? "1px solid rgba(56,189,248,0.60)" : "1px solid rgba(255,255,255,0.12)",
                      background: picked ? "rgba(56,189,248,0.16)" : "rgba(255,255,255,0.04)",
                    }}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            <div style={{ opacity: 0.75, fontSize: 12, textAlign: "center" }}>
              Suggerimento: salva con ⭐ le domande che vuoi ripassare.
            </div>
          </div>
        )}

        {view === "results" && result && (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={card()}>
              <div style={row()}>
                <div style={{ fontWeight: 950, fontSize: 16 }}>
                  {result.badge.emoji} {result.badge.label}{result.newBest ? " • Nuovo record!" : ""}
                </div>
                <button style={chip(false)} onClick={() => setView("history")}>
                  📚 Storico
                </button>
              </div>

              {result.total > 0 ? (
                <>
                  <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ ...chip(false), cursor: "default" }}>
                      ✅ {result.correct}/{result.total} ({Math.round((result.correct / result.total) * 100)}%)
                    </div>
                    <div style={{ ...chip(false), cursor: "default" }}>⏱️ {msToMMSS(result.timeMs)}</div>
                    <div style={{ ...chip(false), cursor: "default" }}>+{result.xpGain} XP</div>
                    {result.pillsGain > 0 && <div style={{ ...chip(false), cursor: "default" }}>+{result.pillsGain} 💊</div>}
                  </div>
                  <div style={{ marginTop: 8, opacity: 0.85, fontSize: 12 }}>{result.badge.hint}</div>
                </>
              ) : (
                <div style={{ marginTop: 8, opacity: 0.85, fontSize: 12 }}>{result.badge.hint}</div>
              )}
            </div>

            <div style={card()}>
              <div style={{ fontWeight: 950, marginBottom: 8 }}>Azioni rapide</div>
              <div style={{ display: "grid", gap: 10 }}>
                <button style={btnPrimary(false)} onClick={() => setView("hub")}>
                  Torna al quiz
                </button>

                <button style={btnGhost(!canRetryWrong)} disabled={!canRetryWrong} onClick={() => start("review", "wrong", { wrong: result.wrong })}>
                  🔁 Riprova solo errori
                </button>

                <button style={btnGhost(!canRetryFavs)} disabled={!canRetryFavs} onClick={() => start("review", "favs")}>
                  ⭐ Riprova solo preferiti
                </button>
              </div>
            </div>

            {result.wrong.length > 0 && (
              <div style={card()}>
                <div style={{ fontWeight: 950 }}>Errori ({result.wrong.length})</div>
                <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                  {result.wrong.slice(0, 12).map(({ q, chosen }) => (
                    <div key={q.id} style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
                      <div style={{ fontWeight: 900, lineHeight: 1.2 }}>{q.q}</div>
                      <div style={{ marginTop: 6, fontSize: 12, opacity: 0.9 }}>
                        Tua risposta: <b>{q.options[chosen] || "(nessuna)"}</b>
                      </div>
                      <div style={{ marginTop: 2, fontSize: 12, opacity: 0.9 }}>
                        Corretta: <b>{q.options[q.answer]}</b>
                      </div>
                      <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>{q.explain}</div>
                      <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ ...chip(false), cursor: "default" }}>{catLabel(q.category)}</span>
                        <span style={{ ...chip(false), cursor: "default" }}>{diffLabel(q.difficulty)}</span>
                        <span style={chip(favs.includes(q.id))} onClick={() => toggleFav(q.id)}>
                          ⭐ Preferito
                        </span>
                      </div>
                    </div>
                  ))}
                  {result.wrong.length > 12 && (
                    <div style={{ opacity: 0.7, fontSize: 12, textAlign: "center" }}>Mostro i primi 12 errori (per non appesantire).</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {view === "history" && (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={card()}>
              <div style={row()}>
                <div>
                  <div style={{ fontWeight: 950, fontSize: 16 }}>Storico</div>
                  <div style={{ opacity: 0.8, fontSize: 12, marginTop: 4 }}>Ultimi tentativi salvati sul dispositivo.</div>
                </div>
                <button
                  style={chip(false)}
                  onClick={() => {
                    try {
                      localStorage.removeItem("nd_quiz_history");
                    } catch {}
                    setView("history");
                  }}
                  title="Svuota lo storico"
                >
                  🗑️ Svuota
                </button>
              </div>
            </div>

            <div style={card()}>
              <div style={row()}>
                <div style={{ fontWeight: 900 }}>Preferiti</div>
                <div style={{ opacity: 0.85, fontSize: 12 }}>{favs.length} salvati</div>
              </div>
              <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                <button style={btnPrimary(!canRetryFavs)} disabled={!canRetryFavs} onClick={() => start("review", "favs")}>
                  ⭐ Riprova solo preferiti
                </button>
                <div style={{ opacity: 0.75, fontSize: 12 }}>Consiglio: salva le domande sbagliate con ⭐ e ripassale qui.</div>
              </div>
            </div>

            <div style={card()}>
              <div style={{ fontWeight: 950 }}>Ultimi quiz</div>
              {history.length === 0 ? (
                <div style={{ marginTop: 10, opacity: 0.75, fontSize: 12 }}>Ancora vuoto. Completa un quiz per vedere lo storico.</div>
              ) : (
                <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                  {history.slice(0, 20).map((h) => {
                    const pct = h.total ? Math.round((h.correct / h.total) * 100) : 0;
                    const b = badgeFor(pct);
                    const modeLabel = h.mode === "daily" ? "Daily" : h.mode === "weekly" ? "Weekly" : h.mode === "sim" ? "Sim" : "Review";
                    return (
                      <div
                        key={h.ts}
                        style={{
                          padding: 12,
                          borderRadius: 14,
                          border: "1px solid rgba(255,255,255,0.10)",
                          background: "rgba(0,0,0,0.20)",
                          display: "grid",
                          gap: 6,
                        }}
                      >
                        <div style={row()}>
                          <div style={{ fontWeight: 950 }}>
                            {b.emoji} {modeLabel}
                            <span style={{ opacity: 0.75, fontWeight: 700 }}> • {fmtDate(h.ts)}</span>
                          </div>
                          <div style={{ ...chip(false), cursor: "default" }}>{pct}%</div>
                        </div>
                        <div style={{ opacity: 0.9, fontSize: 12 }}>
                          Risultato: <b>{h.correct}/{h.total}</b>
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {Object.entries(h.byCategory)
                            .slice(0, 4)
                            .map(([k, v]) => (
                              <span key={k} style={{ ...chip(false), cursor: "default" }}>
                                {catLabel(k as QuizCategory)}: {v.correct}/{v.total}
                              </span>
                            ))}
                        </div>
                      </div>
                    );
                  })}
                  {history.length > 20 && <div style={{ opacity: 0.7, fontSize: 12, textAlign: "center" }}>Mostro gli ultimi 20 (per performance).</div>}
                </div>
              )}

              <div style={{ marginTop: 12 }}>
                <button style={btnPrimary(false)} onClick={() => setView("hub")}>
                  Torna al quiz
                </button>
              </div>
            </div>
          </div>
        )}
      </Section>

      <NurseBottomNav active="didattica" onNavigate={(t) => goTab(t)} />
    </Page>
  );
}
