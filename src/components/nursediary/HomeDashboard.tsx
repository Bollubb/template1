import React, { useEffect, useMemo, useState } from "react";
import UtilityHub from "./UtilityHub";
import { computeLevel, getXp, addXp } from "@/features/progress/xp";
import { getDailyCounter, getDailyFlag } from "@/features/progress/dailyCounters";
import { QUIZ_BANK, type QuizQuestion } from "@/features/cards/quiz/quizBank";
import { calcDailyReward, calcWeeklyReward, getDailyState, getWeeklyState, setDailyState, setWeeklyState, getNextDailyResetMs, getNextWeeklyResetMs, pushHistory, type QuizHistoryItem } from "@/features/cards/quiz/quizLogic";
import { recordQuizAnswer, pickSimulationQuestions } from "@/features/cards/quiz/quizAdaptive";
import { isPremium, xpMultiplier } from "@/features/profile/premium";
import PremiumUpsellModal from "./PremiumUpsellModal";

const LS = {
  pills: "nd_pills",
  freePacks: "nd_free_packs",
  favs: "nd_utility_favs",
  profile: "nd_profile",
  avatar: "nd_avatar",
  history: "nd_utility_history_v1",
} as const;

type ToolId = "mlh" | "gtt" | "mgkgmin" | "map" | "bmi" | "diuresi";

const TOOL_TITLES: Record<ToolId, string> = {
  mlh: "Infusione ml/h",
  gtt: "Gocce/min",
  mgkgmin: "Dose → ml/h",
  map: "MAP",
  bmi: "BMI",
  diuresi: "Diuresi",
};

type UtilityHistoryItem = {
  tool: string;
  ts: number;
  inputs: Record<string, string | number | boolean>;
  output: string;
};

type QuizRun = {
  mode: "daily" | "weekly" | "sim";
  idx: number;
  correct: number;
  questions: QuizQuestion[];
  answers: number[]; // per-index selected
};


function safeJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function msToHMS(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export default function HomeDashboard({
  onGoToCards,
  onGoToDidattica,
  onGoToProfile,
}: {
  onGoToCards: () => void;
  onGoToDidattica: () => void;
  onGoToProfile: () => void;
}) {
  const [mode, setMode] = useState<"home" | "utility">("home");
  const [pills, setPills] = useState(0);
  const [freePacks, setFreePacks] = useState(0);
  const [xp, setXp] = useState(0);
  const [profileName, setProfileName] = useState<string>("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [recentHistory, setRecentHistory] = useState<UtilityHistoryItem[]>([]);

  const [dailyLeft, setDailyLeft] = useState(0);
  const [weeklyLeft, setWeeklyLeft] = useState(0);

  const [runQuiz, setRunQuiz] = useState<QuizRun | null>(null);
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);

  const [selected, setSelected] = useState<number | null>(null);
  const [quizFeedback, setQuizFeedback] = useState<string | null>(null);
  const [quizReview, setQuizReview] = useState<{ q: QuizQuestion; chosen: number }[] | null>(null);

  const [favTools, setFavTools] = useState<ToolId[]>([]);

  
  const loadRecentHistory = () => {
    try {
      const raw = localStorage.getItem(LS.history);
      const list = raw ? (JSON.parse(raw) as UtilityHistoryItem[]) : [];
      if (Array.isArray(list)) setRecentHistory(list.slice(0, 3));
      else setRecentHistory([]);
    } catch {
      setRecentHistory([]);
    }
  };

useEffect(() => {
    if (typeof window === "undefined") return;

    const tick = () => {
      setDailyLeft(getNextDailyResetMs());
      setWeeklyLeft(getNextWeeklyResetMs());
      setPills(Number(localStorage.getItem(LS.pills) || "0") || 0);
      setFreePacks(Number(localStorage.getItem(LS.freePacks) || "0") || 0);
      setXp(getXp());
      setFavTools(safeJson<ToolId[]>(localStorage.getItem(LS.favs), []));
      const p = safeJson<{ name?: string }>(localStorage.getItem(LS.profile), {} as any);
      setProfileName(String(p?.name || ""));
      setAvatar(localStorage.getItem(LS.avatar));
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const lvl = useMemo(() => computeLevel(xp), [xp]);

  const daily = useMemo(() => getDailyState(), [dailyLeft]);
  const weekly = useMemo(() => getWeeklyState(), [weeklyLeft]);

  const readsToday = getDailyCounter("nd_daily_reads");
  const utilityToday = getDailyCounter("nd_daily_utility_used");
  const packsToday = getDailyCounter("nd_daily_packs_opened");
  const recycledToday = getDailyCounter("nd_daily_recycled");
  const loginClaimed = getDailyFlag("nd_daily_login_claimed");

  // recommended action
  const recommended = useMemo(() => {
    if (!loginClaimed) return { title: "Riscatta login giornaliero", cta: "Vai al Profilo", action: "profile" as const };
    if (freePacks > 0) return { title: "Hai una bustina GRATIS pronta", cta: "Apri ora", action: "cards" as const };
    if (daily.status !== "done") return { title: "Quiz Daily disponibile", cta: "Apri Profilo", action: "profile" as const };
    if (readsToday < 3) return { title: `Missione letture: ${readsToday}/3`, cta: "Vai alla Didattica", action: "didattica" as const };
    return { title: "Ottimo! Continua con Utility o Collezione", cta: "Apri Utility", action: "utility" as const };
  }, [loginClaimed, freePacks, daily.status, readsToday]);


function pickRandom<T>(arr: T[], n: number) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

function startQuiz(mode: "daily" | "weekly") {
  const state = mode === "daily" ? getDailyState() : getWeeklyState();
  if (state.status === "done") return;
  const n = mode === "daily" ? 5 : 12;

  // anti-ripetizione “soft”
  const recentKey = "nd_quiz_recent_v1";
  const recent = safeJson<string[]>(localStorage.getItem(recentKey), []);
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

function startSimulation() {
  const recentKey = "nd_quiz_recent_v1";
  const recent = safeJson<string[]>(localStorage.getItem(recentKey), []);

  if (!isPremium()) {
    setPremiumModalOpen(true);
    return;
  }

  const count = 25;
  const questions = pickSimulationQuestions(QUIZ_BANK, count, recent);

  try {
    const nextRecent = [...questions.map((q) => q.id), ...recent].slice(0, 50);
    localStorage.setItem(recentKey, JSON.stringify(nextRecent));
  } catch {}

  setRunQuiz({ mode: "sim", idx: 0, correct: 0, questions, answers: Array(questions.length).fill(-1) });
  setSelected(null);
  setQuizFeedback(null);
  setQuizReview(null);
}


function answerQuiz(i: number) {
  if (!runQuiz) return;
  const q = runQuiz.questions[runQuiz.idx];
  const ok = i === q.answer;
  recordQuizAnswer(q, ok);
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

    const total = runQuiz.questions.length;
    const perfect = nextCorrect === total;

    // per-category stats (reale)
    const byCat: Record<string, { correct: number; total: number }> = {};
    for (let k = 0; k < runQuiz.questions.length; k++) {
      const qq = runQuiz.questions[k];
      const cat = (qq.category || "altro") as string;
      if (!byCat[cat]) byCat[cat] = { correct: 0, total: 0 };
      byCat[cat].total += 1;
      if (answers[k] === qq.answer) byCat[cat].correct += 1;
    }

    // review errori
    const wrong = runQuiz.questions
      .map((qq, idx) => ({ q: qq, chosen: answers[idx] }))
      .filter((x) => x.chosen !== x.q.answer);
    setQuizReview(wrong);

    // rewards
    let pillsGain = 0;
    if (runQuiz.mode === "daily") {
      const daily = getDailyState();
      pillsGain = calcDailyReward(nextCorrect, total, perfect, daily.streak);
      const streakOk = nextCorrect / total >= 0.6;
      setDailyState({ ...daily, status: "done", streak: streakOk ? daily.streak + 1 : 0 });
    } else if (runQuiz.mode === "weekly") {
      pillsGain = calcWeeklyReward(nextCorrect, total, perfect);
      const weekly = getWeeklyState();
      setWeeklyState({ ...weekly, status: "done" });
    } else {
      // simulazione: niente reset/streak, solo XP (no pill farming)
      pillsGain = 0;
    }
    const perCorrect = runQuiz.mode === "daily" ? 6 : runQuiz.mode === "weekly" ? 8 : 5;
    const baseXpGain = 20 + nextCorrect * perCorrect + (perfect ? (runQuiz.mode === "sim" ? 25 : 20) : 0);
    const xpGain = baseXpGain * xpMultiplier();

    // persist
    try {
      const curPills = Number(localStorage.getItem(LS.pills) || "0") || 0;
      localStorage.setItem(LS.pills, String(curPills + pillsGain));
    } catch {}
    addXp(xpGain); // wrapper already in project

    const item: QuizHistoryItem = {
      ts: Date.now(),
      mode: runQuiz.mode,
      correct: nextCorrect,
      total,
      byCategory: byCat,
    };
    pushHistory(item);

    setQuizFeedback(`Quiz ${runQuiz.mode}: ${nextCorrect}/${total} • +${pillsGain} 💊 • +${xpGain} XP`);
    setRunQuiz(null);
    setSelected(null);
  }, 450);
}


    if (mode === "utility") {
    return <UtilityHub onBack={() => { setMode("home"); try { loadRecentHistory(); } catch {} }} />;
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* Daily Brief */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 14, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", display: "grid", placeItems: "center", overflow: "hidden" }}>
                {avatar ? (
                  <img src={avatar} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontSize: 18 }}>👤</span>
                )}
              </div>
              <div>
                <div style={{ fontWeight: 950, fontSize: 18 }}>Home</div>
                <div style={{ opacity: 0.78, fontWeight: 800, fontSize: 12 }}>{profileName ? `Ciao, ${profileName}` : "Benvenuto"}</div>
              </div>
            </div>
            <div style={{ opacity: 0.72, fontWeight: 700, fontSize: 13 }}>Daily brief • guidata e veloce</div>
          </div>
          <div style={{ opacity: 0.75, fontWeight: 900, fontSize: 12 }}>Reset daily: {msToHMS(dailyLeft)}</div>
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <MiniStat label="💊 Pillole" value={String(pills)} />
            <MiniStat label="🎁 Free pack" value={String(freePacks)} />
            <MiniStat label="🧬 Livello" value={`${lvl.level} (${Math.floor(lvl.pct * 100)}%)`} />
            <MiniStat label="🔥 Streak quiz" value={String(daily.streak ?? 0)} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <BriefRow ok={loginClaimed} label="Login giornaliero" right={loginClaimed ? "✅" : "⏳"} />
            <BriefRow ok={daily.status === "done"} label="Quiz Daily" right={daily.status === "done" ? "✅" : "⏳"} />
            <BriefRow ok={weekly.status === "done"} label="Quiz Weekly" right={weekly.status === "done" ? "✅" : `Reset ${msToHMS(weeklyLeft)}`} />
            <BriefRow ok={readsToday >= 3} label="Letture oggi" right={`${readsToday}/3`} />
          </div>
        </div>
      </Card>

      {/* Recommended */}
      <Card>
        <div style={{ fontWeight: 950 }}>Azione consigliata</div>
        <div style={{ marginTop: 6, opacity: 0.8, fontWeight: 800 }}>{recommended.title}</div>
        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => {
              if (recommended.action === "cards") onGoToCards();
              else if (recommended.action === "didattica") onGoToDidattica();
              else if (recommended.action === "utility") setMode("utility");
              else onGoToProfile();
            }}
            style={primaryBtn()}
          >
            {recommended.cta}
          </button>
          <button type="button" onClick={() => setMode("utility")} style={ghostBtn()}>
            🛠 Utility
          </button>
        </div>
      </Card>


      {/* Quiz (Daily/Weekly) */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
          <div>
            <div style={{ fontWeight: 950 }}>Quiz</div>
            <div style={{ opacity: 0.78, fontWeight: 800, fontSize: 12 }}>
              Daily e Weekly con timer (solo qui in Home)
            </div>
          </div>
          <div style={{ opacity: 0.75, fontWeight: 900, fontSize: 12 }}>
            Daily: {msToHMS(dailyLeft)} • Weekly: {msToHMS(weeklyLeft)}
          </div>
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={() => startQuiz("daily")} disabled={daily.status === "done" || !!runQuiz} style={primaryBtn()}>
            {daily.status === "done" ? "Daily completato ✅" : "Avvia Daily"}
          </button>
          <button type="button" onClick={() => startQuiz("weekly")} disabled={weekly.status === "done" || !!runQuiz} style={ghostBtn()}>
            {weekly.status === "done" ? "Weekly completato ✅" : "Avvia Weekly"}
          </button>
                  <button type="button" onClick={() => startSimulation()} disabled={!!runQuiz} style={ghostBtn()}>
            {isPremium() ? "Simulazione (25)" : "Simulazione (Premium)"}
          </button>
</div>

        {runQuiz && (
          <div style={{ marginTop: 12, borderTop: "1px solid rgba(255,255,255,0.10)", paddingTop: 12 }}>
            <div style={{ fontWeight: 950 }}>
              {(runQuiz.mode === "sim" ? "SIMULAZIONE" : runQuiz.mode.toUpperCase())} • Domanda {runQuiz.idx + 1}/{runQuiz.questions.length}
            </div>
            <div style={{ marginTop: 8, height: 10, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.round(((runQuiz.idx + 1) / runQuiz.questions.length) * 100)}%`, background: "linear-gradient(90deg, rgba(56,189,248,0.95), rgba(34,197,94,0.90))", transition: "width 220ms ease" }} />
            </div>
            <div style={{ marginTop: 6, opacity: 0.88, fontWeight: 800 }}>{runQuiz.questions[runQuiz.idx].q}</div>

            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              {runQuiz.questions[runQuiz.idx].options.map((op, i) => (
                <button key={i} type="button" onClick={() => answerQuiz(i)} disabled={selected !== null} style={primaryBtn()}>
                  {op}
                </button>
              ))}
            </div>
          </div>
        )}

        {quizFeedback && (
          <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.06)", fontWeight: 800 }}>
            {quizFeedback}
          </div>
        )}

        {quizReview && quizReview.length > 0 && (
          <div style={{ marginTop: 12, borderTop: "1px solid rgba(255,255,255,0.10)", paddingTop: 12 }}>
            <div style={{ fontWeight: 950 }}>Risposte da rivedere</div>
            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              {quizReview.slice(0, 8).map((w, idx) => (
                <div key={idx} style={{ padding: 12, borderRadius: 16, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)" }}>
                  <div style={{ fontWeight: 900 }}>{w.q.q}</div>
                  <div style={{ marginTop: 6, fontWeight: 800, opacity: 0.85 }}>
                    La tua: {w.q.options[w.chosen] ?? "—"}
                  </div>
                  <div style={{ marginTop: 4, fontWeight: 900 }}>
                    Corretta: {w.q.options[w.q.answer]}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Utility quick access */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
          <div style={{ fontWeight: 950 }}>Utility</div>
          <button type="button" onClick={() => setMode("utility")} style={linkBtn()}>
            Apri →
          </button>
        </div>
        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {(favTools.length ? favTools.slice(0, 3) : (["mlh", "gtt", "map"] as ToolId[])).map((id) => (
            <div key={id} style={quickTile()}>
              <div style={{ fontWeight: 950, fontSize: 12 }}>{TOOL_TITLES[id]}</div>
              <div style={{ opacity: 0.7, fontWeight: 800, fontSize: 11 }}>
                Oggi: {utilityToday}
              </div>
            </div>
          ))}
        </div>

        {recentHistory.length ? (
          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            <div style={{ fontWeight: 950, fontSize: 12, opacity: 0.85 }}>Ultimi calcoli</div>
            {recentHistory.slice(0, 3).map((h, i) => (
              <div
                key={i}
                style={{
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 14,
                  padding: "10px 12px",
                  background: "rgba(255,255,255,0.04)",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <div style={{ fontWeight: 900, fontSize: 12, opacity: 0.9 }}>{TOOL_TITLES[h.tool as ToolId] || String(h.tool)}</div>
                <div style={{ fontWeight: 950, fontSize: 12 }}>{h.output}</div>
              </div>
            ))}
          </div>
        ) : null}

        <div style={{ marginTop: 10, opacity: 0.75, fontWeight: 800, fontSize: 12 }}>
          Oggi: {utilityToday} utility • {packsToday} bustine • {recycledToday} riciclate
        </div>
      </Card>

      <PremiumUpsellModal
        open={premiumModalOpen}
        title="Sblocca Simulazione estesa"
        subtitle="Con Boost ottieni 2× XP e simulazioni più lunghe per allenarti davvero."
        bullets={["2× XP su quiz", "Simulazione (25 domande)", "Analytics avanzate in Profilo"]}
        cta="Attiva Boost (demo)"
        onClose={() => setPremiumModalOpen(false)}
      />
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.08)",
        background: "#0b1220",
        borderRadius: 20,
        padding: 14,
      }}
    >
      {children}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 16,
        padding: 12,
        background: "#0f172a",
      }}
    >
      <div style={{ opacity: 0.7, fontWeight: 800, fontSize: 12 }}>{label}</div>
      <div style={{ fontWeight: 950, fontSize: 18, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function BriefRow({ ok, label, right }: { ok: boolean; label: string; right: string }) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 16,
        padding: 12,
        background: ok ? "rgba(34,197,94,0.10)" : "rgba(255,255,255,0.05)",
        display: "flex",
        justifyContent: "space-between",
        gap: 10,
      }}
    >
      <div style={{ fontWeight: 900, fontSize: 12 }}>{label}</div>
      <div style={{ opacity: 0.85, fontWeight: 900, fontSize: 12 }}>{right}</div>
    </div>
  );
}

function primaryBtn(): React.CSSProperties {
  return {
    padding: "12px 14px",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "#0ea5e9",
    color: "#020617",
    fontWeight: 950,
    cursor: "pointer",
  };
}
function ghostBtn(): React.CSSProperties {
  return {
    padding: "12px 14px",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.92)",
    fontWeight: 950,
    cursor: "pointer",
  };
}
function linkBtn(): React.CSSProperties {
  return {
    padding: "8px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.92)",
    fontWeight: 900,
    cursor: "pointer",
  };
}
function quickTile(): React.CSSProperties {
  return {
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 16,
    padding: 12,
    background: "#0f172a",
  };
}
