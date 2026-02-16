import React, { useEffect, useMemo, useState } from "react";
import UtilityHub from "./UtilityHub";
import { computeLevel, getXp, addXp } from "@/features/progress/xp";
import { getDailyCounter, getDailyFlag } from "@/features/progress/dailyCounters";
import { QUIZ_BANK, type QuizQuestion } from "@/features/cards/quiz/quizBank";
import { calcDailyReward, calcWeeklyReward, getDailyState, getWeeklyState, setDailyState, setWeeklyState, getNextDailyResetMs, getNextWeeklyResetMs, pushHistory, type QuizHistoryItem } from "@/features/cards/quiz/quizLogic";
import { recordQuizAnswer, pickSimulationQuestions } from "@/features/cards/quiz/quizAdaptive";
import { getTopMistakes, pickMistakeReviewQuestions } from "@/features/cards/quiz/quizMistakes";
import { recordLearn } from "@/features/cards/quiz/quizLearn";
import { isPremium, xpMultiplier } from "@/features/profile/premium";
import PremiumUpsellModal from "./PremiumUpsellModal";

function SlideIn({ children }: { children: React.ReactNode }) {
  const [enter, setEnter] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setEnter(true), 0);
    return () => clearTimeout(t);
  }, []);
  function renderQuizModule() {
    return (
      <div style={{ fontWeight: 950, fontSize: 16 }}>Quiz</div>
                <div style={{ marginTop: 6, opacity: 0.72, fontWeight: 700, fontSize: 13 }}>
                  Apri il Quiz dal <b>Menu rapido</b> in alto a sinistra.
                </div>
    );
  }



// STANDALONE_MODULE_RETURNS: render modules as standalone screens when opened from header dropdown
if (openSection === "utility") {
  return (
    <SlideIn>
      <UtilityHub onBack={() => { onCloseSection?.(); }} />
    </SlideIn>
  );
}

if (openSection === "quiz") {
  return (
    <SlideIn>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
          <div style={{ fontWeight: 950, fontSize: 18 }}>Quiz</div>
          <button
            type="button"
            onClick={() => { onCloseSection?.(); }}
            style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.92)", padding: "8px 10px", fontWeight: 850, cursor: "pointer" }}
          >
            Chiudi
          </button>
        </div>
        <div style={{ marginTop: 10 }}>{renderQuizModule()}</div>
      </Card>
    </SlideIn>
  );
}


  return (
    <div
      style={{
        transform: enter ? "translateY(0px)" : "translateY(10px)",
        opacity: enter ? 1 : 0,
        transition: "all 220ms ease",
      }}
    >
      {children}
    </div>
  );
}


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
  mode: "daily" | "weekly" | "sim" | "review";
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
  openSection,
  onCloseSection,
  onGoToCards,
  onGoToDidattica,
  onGoToProfile,
}: {
  openSection?: "quiz" | "utility";
  onCloseSection?: () => void;
  onGoToCards: () => void;
  onGoToDidattica: () => void;
  onGoToProfile: () => void;
}) {
  // STANDALONE_SECTION: when opened from the header dropdown, render modules as standalone pages (no Home content).
  const standalone = openSection ?? null;

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
  const [openLearnId, setOpenLearnId] = useState<string | null>(null);

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

  const topMistakesPreview = useMemo(() => {
    if (typeof window === "undefined") return [];
    return getTopMistakes(QUIZ_BANK, 3);
  }, [xp, dailyLeft]);


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

function startMistakeReview() {
  const recentKey = "nd_quiz_recent_v1";
  const recent = safeJson<string[]>(localStorage.getItem(recentKey), []);
  const count = 8;
  const questions = pickMistakeReviewQuestions(QUIZ_BANK, count, recent);

  try {
    const nextRecent = [...questions.map((q) => q.id), ...recent].slice(0, 50);
    localStorage.setItem(recentKey, JSON.stringify(nextRecent));
  } catch {}

  setRunQuiz({ mode: "review", idx: 0, correct: 0, questions, answers: Array(questions.length).fill(-1) });
  setSelected(null);
  setQuizFeedback(null);
  setQuizReview(null);
  setOpenLearnId(null);
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
      // simulazione / ripasso: niente reset/streak, solo XP (no pill farming)
      pillsGain = 0;
    }
    const perCorrect = runQuiz.mode === "daily" ? 6 : runQuiz.mode === "weekly" ? 8 : runQuiz.mode === "review" ? 5 : 5;
    const baseXpGain = 20 + nextCorrect * perCorrect + (perfect ? (runQuiz.mode === "sim" ? 25 : runQuiz.mode === "review" ? 10 : 20) : 0);
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

    const label = runQuiz.mode === "review" ? "Ripasso" : `Quiz ${runQuiz.mode}`;
    setQuizFeedback(`${label}: ${nextCorrect}/${total} • +${pillsGain} 💊 • +${xpGain} XP`);
    setRunQuiz(null);
    setSelected(null);
    setOpenLearnId(null);
  }, 450);
}

function miniLearnBullets(q: QuizQuestion): string[] {
  // Prefer explicit bullets if present (extensible without touching UI).
  const anyQ = q as any;
  if (Array.isArray(anyQ?.learn) && anyQ.learn.length) return anyQ.learn.slice(0, 3);

  const cat = (q.category || "altro") as string;
  const diff = String((q as any).difficulty || "").toLowerCase();
  const hardHint = diff === "difficile" || diff === "hard" ? "Domanda difficile: ricontrolla sempre i passaggi e le controindicazioni." : null;
  if (cat === "procedure") {
    return ["Focus: asepsi e sicurezza del paziente.", "Errore comune: saltare un controllo o un passaggio chiave.", ...(hardHint ? [hardHint] : [])];
  }
  if (cat === "emergenza") {
    return ["In emergenza: ragiona per priorità (ABCDE).", "Prima stabilizza, poi approfondisci.", ...(hardHint ? [hardHint] : [])];
  }
  if (cat === "antibiotici") {
    return ["Pensa a sito, spettro e rischio resistenze.", "Valuta allergie e interazioni prima di somministrare.", ...(hardHint ? [hardHint] : [])];
  }
  if (cat === "farmaci") {
    return ["Ricorda le 5G e la via corretta.", "Controlla compatibilità e monitoraggio effetti.", ...(hardHint ? [hardHint] : [])];
  }
  return ["Ragiona per sicurezza e priorità cliniche.", "Se hai dubbi: verifica prima di agire.", ...(hardHint ? [hardHint] : [])];
}



      // Standalone Utility
      if (standalone === "utility") {
        return <UtilityHub onBack={() => { onCloseSection?.(); }} />;
      }

      // Standalone Quiz
      if (standalone === "quiz") {
        return (
          <div style={{ display: "grid", gap: 12 }}>
            <Card>
  <div style={{ fontWeight: 950, fontSize: 16 }}>Quiz</div>
  <div style={{ marginTop: 6, opacity: 0.72, fontWeight: 700, fontSize: 13 }}>
    Apri il Quiz dal <b>Menu rapido</b> in alto a sinistra.
  </div>
</Card>
          </div>
        );
      }