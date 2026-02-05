import React, { useEffect, useMemo, useState } from "react";

import { QUIZ_BANK } from "../../features/quiz/quizBank";
import {
  calcDailyReward,
  calcWeeklyReward,
  calcXpForQuiz,
  getDailyState,
  getWeeklyState,
  getQuizHistory,
  pushQuizHistory,
  setDailyState,
  setWeeklyState,
  type QuizMode,
  type QuizRunState,
  getNextDailyResetMs,
  getNextWeeklyResetMs,
} from "../../features/quiz/quizLogic";

const LS = {
  profile: "nd_profile",
  avatar: "nd_avatar",
  favorites: "nd_favorites",
  read: "nd_read",
  pills: "nd_pills",
  cards: "nd_card_collection",
  mission: "nd_mission_daily_read3",
  login: "nd_login_reward",
  freePack: "nd_free_pack",
  xp: "nd_xp",
  achievements: "nd_achievements",
} as const;

type ProfileData = {
  name: string;
  role: string;
};

type LoginState = {
  dayKey: string;
  streak: number;
  claimed: boolean;
};

type AchievementId =
  | "first_quiz"
  | "daily_streak_3"
  | "daily_streak_7"
  | "reader_10"
  | "reader_30"
  | "collector_5"
  | "collector_12"
  | "weekly_done";

type Achievement = {
  id: AchievementId;
  title: string;
  desc: string;
  rewardPills: number;
  rewardXp: number;
  condition: (ctx: AchvCtx) => boolean;
};

type AchvCtx = {
  readCount: number;
  uniqueCards: number;
  dailyStreak: number;
  weeklyDone: boolean;
  quizRuns: number;
};

function safeJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function msToHMS(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function dayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function addFreePack(n: number) {
  try {
    const curr = Number(localStorage.getItem(LS.freePack) || "0") || 0;
    localStorage.setItem(LS.freePack, String(Math.max(0, curr + n)));
  } catch {}
}

function addXp(n: number) {
  try {
    const curr = Number(localStorage.getItem(LS.xp) || "0") || 0;
    localStorage.setItem(LS.xp, String(Math.max(0, curr + n)));
  } catch {}
}

function getXp() {
  try {
    return Number(localStorage.getItem(LS.xp) || "0") || 0;
  } catch {
    return 0;
  }
}

// Level curve: thresholds grow smoothly
function levelFromXp(xp: number) {
  let level = 1;
  let next = 100;
  let prev = 0;
  while (xp >= next) {
    level += 1;
    prev = next;
    next = Math.round(next + 100 + level * 35); // ramp
    if (level > 60) break;
  }
  const progress = clamp((xp - prev) / Math.max(1, next - prev), 0, 1);
  return { level, prev, next, progress };
}

function pickRandom<T>(arr: T[], n: number) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_quiz",
    title: "Primo Quiz",
    desc: "Completa un quiz (daily o weekly).",
    rewardPills: 30,
    rewardXp: 40,
    condition: (c) => c.quizRuns >= 1,
  },
  {
    id: "weekly_done",
    title: "Settimana Chiusa",
    desc: "Completa un quiz settimanale.",
    rewardPills: 60,
    rewardXp: 90,
    condition: (c) => c.weeklyDone,
  },
  {
    id: "daily_streak_3",
    title: "Streak x3",
    desc: "Streak daily di 3 giorni.",
    rewardPills: 40,
    rewardXp: 60,
    condition: (c) => c.dailyStreak >= 3,
  },
  {
    id: "daily_streak_7",
    title: "Streak x7",
    desc: "Streak daily di 7 giorni.",
    rewardPills: 80,
    rewardXp: 120,
    condition: (c) => c.dailyStreak >= 7,
  },
  {
    id: "reader_10",
    title: "Lettore",
    desc: "Segna come letti 10 contenuti.",
    rewardPills: 25,
    rewardXp: 35,
    condition: (c) => c.readCount >= 10,
  },
  {
    id: "reader_30",
    title: "Studioso",
    desc: "Segna come letti 30 contenuti.",
    rewardPills: 70,
    rewardXp: 110,
    condition: (c) => c.readCount >= 30,
  },
  {
    id: "collector_5",
    title: "Collezionista",
    desc: "Ottieni 5 carte uniche.",
    rewardPills: 35,
    rewardXp: 55,
    condition: (c) => c.uniqueCards >= 5,
  },
  {
    id: "collector_12",
    title: "Master Set",
    desc: "Ottieni 12 carte uniche.",
    rewardPills: 120,
    rewardXp: 160,
    condition: (c) => c.uniqueCards >= 12,
  },
];

export default function ProfileTab({
  pills,
  setPills,
  totalContent,
}: {
  pills: number;
  setPills: React.Dispatch<React.SetStateAction<number>>;
  totalContent: number;
}) {
  const [profile, setProfile] = useState<ProfileData>({ name: "Utente", role: "Infermiere" });
  const [avatar, setAvatar] = useState<string | null>(null);

  const [favIds, setFavIds] = useState<Set<string>>(new Set());
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [cardsOwned, setCardsOwned] = useState<Record<string, number>>({});

  // Missione giornaliera (leggi 3)
  const [missionClaimed, setMissionClaimed] = useState(false);

  // Login reward
  const [login, setLogin] = useState<LoginState>({ dayKey: "", streak: 0, claimed: false });

  // XP & achievements
  const [xp, setXpState] = useState(0);
  const [unlocked, setUnlocked] = useState<Set<AchievementId>>(new Set());

  // Quiz
  const [run, setRun] = useState<QuizRunState | null>(null);

  // countdown
  const [dailyLeft, setDailyLeft] = useState<number>(0);
  const [weeklyLeft, setWeeklyLeft] = useState<number>(0);

  // bootstrap
  useEffect(() => {
    if (typeof window === "undefined") return;

    setProfile(safeJson<ProfileData>(localStorage.getItem(LS.profile), { name: "Utente", role: "Infermiere" }));
    setAvatar(localStorage.getItem(LS.avatar));

    setFavIds(new Set(safeJson<string[]>(localStorage.getItem(LS.favorites), [])));
    setReadIds(new Set(safeJson<string[]>(localStorage.getItem(LS.read), [])));
    setCardsOwned(safeJson<Record<string, number>>(localStorage.getItem(LS.cards), {}));

    setXpState(getXp());

    const unlockedArr = safeJson<AchievementId[]>(localStorage.getItem(LS.achievements), []);
    setUnlocked(new Set(unlockedArr));

    // mission daily claimed
    const m = safeJson<{ dayKey: string; claimed: boolean }>(localStorage.getItem(LS.mission), { dayKey: "", claimed: false });
    const dk = dayKey();
    setMissionClaimed(m.dayKey === dk ? !!m.claimed : false);

    // login reward
    const l = safeJson<LoginState>(localStorage.getItem(LS.login), { dayKey: "", streak: 0, claimed: false });
    const dk2 = dayKey();
    if (l.dayKey !== dk2) {
      // new day -> not claimed
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const continues = l.dayKey === dayKey(yesterday);
      const next: LoginState = { dayKey: dk2, streak: continues ? (l.streak || 0) + 1 : 1, claimed: false };
      localStorage.setItem(LS.login, JSON.stringify(next));
      setLogin(next);
    } else {
      setLogin(l);
    }
  }, []);

  // persist profile
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(LS.profile, JSON.stringify(profile));
  }, [profile]);

  // countdown ticker
  useEffect(() => {
    const tick = () => {
      setDailyLeft(getNextDailyResetMs());
      setWeeklyLeft(getNextWeeklyResetMs());
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  // derived stats
  const uniqueCards = useMemo(
    () => Object.keys(cardsOwned).filter((k) => (cardsOwned[k] || 0) > 0).length,
    [cardsOwned]
  );
  const totalCards = useMemo(() => Object.values(cardsOwned).reduce((a, b) => a + (b || 0), 0), [cardsOwned]);

  const dailyState = useMemo(() => (typeof window === "undefined" ? { status: "idle", streak: 0 } : getDailyState()), [dailyLeft]);
  const weeklyState = useMemo(() => (typeof window === "undefined" ? { status: "idle" } : getWeeklyState()), [weeklyLeft]);

  const levelInfo = useMemo(() => levelFromXp(xp), [xp]);

  // mission done: uses readIds (simple: first 3 of the day)
  const missionProgress = useMemo(() => clamp(readIds.size, 0, 3), [readIds]);
  const missionDone = missionProgress >= 3;

  // quiz history stats
  const quizHistory = useMemo(() => (typeof window === "undefined" ? [] : getQuizHistory()), [dailyLeft, weeklyLeft, run]);
  const quizStats = useMemo(() => {
    const totalRuns = quizHistory.length;
    let totalQ = 0;
    let totalC = 0;
    const byCat: Record<string, { correct: number; total: number }> = {};
    for (const h of quizHistory) {
      totalQ += h.total;
      totalC += h.correct;
      for (const [cat, v] of Object.entries(h.byCategory)) {
        if (!byCat[cat]) byCat[cat] = { correct: 0, total: 0 };
        byCat[cat].correct += v.correct;
        byCat[cat].total += v.total;
      }
    }
    const acc = totalQ ? Math.round((totalC / totalQ) * 100) : 0;
    const cats = Object.entries(byCat)
      .map(([k, v]) => ({ cat: k, acc: v.total ? Math.round((v.correct / v.total) * 100) : 0, total: v.total }))
      .sort((a, b) => b.total - a.total);
    return { totalRuns, totalQ, totalC, acc, cats };
  }, [quizHistory]);

  // achievements auto-unlock
  useEffect(() => {
    if (typeof window === "undefined") return;

    const ctx: AchvCtx = {
      readCount: readIds.size,
      uniqueCards,
      dailyStreak: dailyState.streak || 0,
      weeklyDone: weeklyState.status === "done",
      quizRuns: quizHistory.length,
    };

    const newly: Achievement[] = [];
    for (const a of ACHIEVEMENTS) {
      if (unlocked.has(a.id)) continue;
      if (a.condition(ctx)) newly.push(a);
    }
    if (newly.length === 0) return;

    // apply rewards once
    setPills((p) => p + newly.reduce((s, a) => s + a.rewardPills, 0));
    addXp(newly.reduce((s, a) => s + a.rewardXp, 0));
    setXpState(getXp());

    const next = new Set(unlocked);
    newly.forEach((a) => next.add(a.id));
    setUnlocked(next);
    localStorage.setItem(LS.achievements, JSON.stringify(Array.from(next)));
  }, [readIds, uniqueCards, dailyState.streak, weeklyState.status, quizHistory.length]);

  function claimMission() {
    if (!missionDone || missionClaimed) return;
    setPills((p) => p + 25);
    try {
      localStorage.setItem(LS.mission, JSON.stringify({ dayKey: dayKey(), claimed: true }));
    } catch {}
    setMissionClaimed(true);
    addXp(15);
    setXpState(getXp());
  }

  function claimLoginReward() {
    if (login.claimed) return;

    const basePills = 20;
    const streakBonus = Math.min(30, (login.streak || 1) * 3);
    const pillsGain = basePills + streakBonus;

    setPills((p) => p + pillsGain);

    // pack bonus: 1 free pack every day, +1 extra at streak 7/14/21...
    const extra = login.streak > 0 && login.streak % 7 === 0 ? 1 : 0;
    addFreePack(1 + extra);

    addXp(12 + Math.min(25, login.streak * 2));
    setXpState(getXp());

    const next: LoginState = { ...login, claimed: true };
    setLogin(next);
    try {
      localStorage.setItem(LS.login, JSON.stringify(next));
    } catch {}
  }

  function startQuiz(mode: QuizMode) {
    const questions = pickRandom(QUIZ_BANK, mode === "daily" ? 5 : 12);

    const newRun: QuizRunState = {
      mode,
      status: "running",
      idx: 0,
      correct: 0,
      selected: null,
      questions,
      history: [],
    };
    setRun(newRun);
  }

  function answer(selected: number) {
    if (!run || run.status !== "running") return;

    const q = run.questions[run.idx];
    const isCorrect = selected === q.answer;

    const nextHistory = [
      ...run.history,
      {
        id: q.id,
        category: q.category,
        q: q.q,
        options: q.options,
        answer: q.answer,
        selected,
        correct: isCorrect,
      },
    ];

    const nextCorrect = run.correct + (isCorrect ? 1 : 0);
    const isLast = run.idx >= run.questions.length - 1;

    if (!isLast) {
      setRun({ ...run, idx: run.idx + 1, correct: nextCorrect, selected: null, history: nextHistory });
      return;
    }

    // finish
    const total = run.questions.length;
    const perfect = nextCorrect === total;

    const reward = run.mode === "daily"
      ? calcDailyReward(nextCorrect, total, perfect, dailyState.streak || 0)
      : calcWeeklyReward(nextCorrect, total, perfect);

    setPills((p) => p + reward);

    // XP
    const xpGain = calcXpForQuiz(run.mode, nextCorrect, total);
    addXp(xpGain);
    setXpState(getXp());

    // mark done
    if (run.mode === "daily") {
      const streakNext = (dailyState.streak || 0) + 1;
      setDailyState({ ...getDailyState(), status: "done", streak: streakNext });
    } else {
      setWeeklyState({ ...getWeeklyState(), status: "done" });
    }

    // history entry with category stats
    const byCategory: any = {};
    for (const h of nextHistory) {
      if (!byCategory[h.category]) byCategory[h.category] = { correct: 0, total: 0 };
      byCategory[h.category].total += 1;
      if (h.correct) byCategory[h.category].correct += 1;
    }
    pushQuizHistory({
      id: `run_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      mode: run.mode,
      at: new Date().toISOString(),
      correct: nextCorrect,
      total,
      byCategory,
    });

    setRun({ ...run, status: "done", correct: nextCorrect, selected, history: nextHistory });
  }

  async function onPickAvatar(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const data = String(reader.result || "");
      setAvatar(data);
      try {
        localStorage.setItem(LS.avatar, data);
      } catch {}
    };
    reader.readAsDataURL(file);
  }

  const canStartDaily = dailyState.status !== "done";
  const canStartWeekly = weeklyState.status !== "done";

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* Header */}
      <CardBox>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {avatar ? (
              <img src={avatar} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: 24 }}>👤</span>
            )}
          </div>

          <div style={{ flex: 1 }}>
            <input
              value={profile.name}
              onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
              style={inputMain(true)}
              aria-label="Nome"
            />
            <input
              value={profile.role}
              onChange={(e) => setProfile((p) => ({ ...p, role: e.target.value }))}
              style={{ ...inputMain(false), marginTop: 8 }}
              aria-label="Ruolo"
            />
          </div>
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <label style={pillTag("#0f172a", "rgba(255,255,255,0.92)")}>
            Carica avatar
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onPickAvatar(f);
              }}
            />
          </label>

          <div style={pillTag("#0f172a", "rgba(255,255,255,0.88)")}>Pillole: {pills}</div>
          <div style={pillTag("#0f172a", "rgba(255,255,255,0.88)")}>
            Livello: {levelInfo.level} <span style={{ opacity: 0.7 }}>(XP {xp})</span>
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", color: "rgba(255,255,255,0.72)", fontWeight: 800, fontSize: 12 }}>
            <span>Progresso livello</span>
            <span>
              {levelInfo.prev} → {levelInfo.next}
            </span>
          </div>
          <ProgressBar value={levelInfo.progress} />
        </div>
      </CardBox>

      {/* Daily login reward */}
      <CardBox>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
          <div>
            <div style={{ color: "rgba(255,255,255,0.92)", fontWeight: 950 }}>Daily login</div>
            <div style={{ color: "rgba(255,255,255,0.72)", fontWeight: 700, fontSize: 13 }}>
              Ricompensa giornaliera + pack bonus (streak)
            </div>
          </div>
          <div style={{ color: "rgba(255,255,255,0.70)", fontWeight: 900, fontSize: 12 }}>Streak: {login.streak}</div>
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" onClick={claimLoginReward} disabled={login.claimed} style={btnPrimary(login.claimed)}>
            {login.claimed ? "Già riscattata" : "Riscatta"}
          </button>

          <div style={{ color: "rgba(255,255,255,0.72)", fontWeight: 800, fontSize: 12 }}>
            Reset: {msToHMS(dailyLeft)}
          </div>

          <div style={{ color: "rgba(255,255,255,0.72)", fontWeight: 800, fontSize: 12 }}>
            Bonus pack: <b>{login.streak > 0 && login.streak % 7 === 0 ? "+1 extra oggi" : "1 free pack"}</b>
          </div>
        </div>
      </CardBox>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Stat title="Preferiti" value={String(favIds.size)} />
        <Stat title="Letti" value={`${readIds.size}/${totalContent}`} />
        <Stat title="Carte uniche" value={String(uniqueCards)} />
        <Stat title="Carte totali" value={String(totalCards)} />
      </div>

      {/* Mission */}
      <CardBox>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
          <div>
            <div style={{ color: "rgba(255,255,255,0.92)", fontWeight: 950 }}>Missione giornaliera</div>
            <div style={{ color: "rgba(255,255,255,0.72)", fontWeight: 700, fontSize: 13 }}>
              Leggi 3 contenuti → +25 pillole (+15 XP)
            </div>
          </div>
          <div style={{ color: "rgba(255,255,255,0.70)", fontWeight: 900, fontSize: 12 }}>Reset: {msToHMS(dailyLeft)}</div>
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <ProgressBar value={missionProgress / 3} />
          </div>

          <button
            type="button"
            onClick={claimMission}
            disabled={!missionDone || missionClaimed}
            style={btnSecondary(!missionDone || missionClaimed)}
          >
            {missionClaimed ? "Riscattata" : missionDone ? "Riscatta" : "In corso"}
          </button>
        </div>
      </CardBox>

      {/* Quiz */}
      <CardBox>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
          <div>
            <div style={{ color: "rgba(255,255,255,0.92)", fontWeight: 950 }}>Quiz</div>
            <div style={{ color: "rgba(255,255,255,0.72)", fontWeight: 700, fontSize: 13 }}>
              Completa daily/weekly per pillole + XP (streak daily)
            </div>
          </div>
          <div style={{ color: "rgba(255,255,255,0.70)", fontWeight: 900, fontSize: 12 }}>
            Streak daily: {dailyState.streak || 0}
          </div>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={() => startQuiz("daily")} disabled={!canStartDaily} style={btnPrimary(!canStartDaily)}>
            Daily (reset {msToHMS(dailyLeft)})
          </button>

          <button type="button" onClick={() => startQuiz("weekly")} disabled={!canStartWeekly} style={btnPrimary(!canStartWeekly)}>
            Weekly (reset {msToHMS(weeklyLeft)})
          </button>

          <div style={pillTag("#0f172a", "rgba(255,255,255,0.80)")}>
            Accuracy: <b>{quizStats.acc}%</b> ({quizStats.totalC}/{quizStats.totalQ})
          </div>
        </div>

        {run && (
          <div style={{ marginTop: 12, borderTop: "1px solid rgba(255,255,255,0.10)", paddingTop: 12 }}>
            {run.status === "running" ? (
              <div>
                <div style={{ color: "rgba(255,255,255,0.90)", fontWeight: 950 }}>
                  {run.mode.toUpperCase()} — Domanda {run.idx + 1}/{run.questions.length}
                </div>
                <div style={{ marginTop: 6, color: "rgba(255,255,255,0.85)", fontWeight: 800 }}>
                  {run.questions[run.idx].q}
                </div>

                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  {run.questions[run.idx].options.map((op, i) => (
                    <button key={i} type="button" onClick={() => answer(i)} style={optBtn()}>
                      {op}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div style={{ color: "rgba(255,255,255,0.92)", fontWeight: 950 }}>
                  Quiz completato: {run.correct}/{run.questions.length}
                </div>
                <div style={{ color: "rgba(255,255,255,0.72)", fontWeight: 800, fontSize: 13, marginTop: 6 }}>
                  Reward già applicata (pillole + XP)
                </div>
                <button type="button" onClick={() => setRun(null)} style={{ ...btnSecondary(false), marginTop: 10 }}>
                  Chiudi
                </button>
              </div>
            )}
          </div>
        )}

        {/* Quiz category stats */}
        {quizStats.cats.length > 0 && (
          <div style={{ marginTop: 12, borderTop: "1px solid rgba(255,255,255,0.10)", paddingTop: 12 }}>
            <div style={{ color: "rgba(255,255,255,0.90)", fontWeight: 950 }}>Accuracy per categoria</div>
            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              {quizStats.cats.slice(0, 5).map((c) => (
                <div key={c.cat} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div style={{ width: 120, color: "rgba(255,255,255,0.80)", fontWeight: 800, fontSize: 12 }}>
                    {c.cat}
                  </div>
                  <div style={{ flex: 1 }}>
                    <ProgressBar value={c.acc / 100} />
                  </div>
                  <div style={{ width: 52, textAlign: "right", color: "rgba(255,255,255,0.75)", fontWeight: 900, fontSize: 12 }}>
                    {c.acc}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardBox>

      {/* Achievements */}
      <CardBox>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
          <div>
            <div style={{ color: "rgba(255,255,255,0.92)", fontWeight: 950 }}>Obiettivi</div>
            <div style={{ color: "rgba(255,255,255,0.72)", fontWeight: 700, fontSize: 13 }}>
              Sblocca reward extra (pillole + XP)
            </div>
          </div>
          <div style={{ color: "rgba(255,255,255,0.70)", fontWeight: 900, fontSize: 12 }}>
            Sbloccati: {unlocked.size}/{ACHIEVEMENTS.length}
          </div>
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          {ACHIEVEMENTS.map((a) => {
            const ok = unlocked.has(a.id);
            return (
              <div
                key={a.id}
                style={{
                  borderRadius: 16,
                  padding: 12,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: ok ? "rgba(34,197,94,0.10)" : "rgba(255,255,255,0.04)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                  <div style={{ color: "rgba(255,255,255,0.92)", fontWeight: 950 }}>{a.title}</div>
                  <div style={{ color: ok ? "rgba(34,197,94,0.95)" : "rgba(255,255,255,0.55)", fontWeight: 950, fontSize: 12 }}>
                    {ok ? "COMPLETATO" : "IN CORSO"}
                  </div>
                </div>
                <div style={{ marginTop: 6, color: "rgba(255,255,255,0.76)", fontWeight: 700, fontSize: 13 }}>{a.desc}</div>
                <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <div style={pillTag("#0f172a", "rgba(255,255,255,0.80)")}>+{a.rewardPills} pillole</div>
                  <div style={pillTag("#0f172a", "rgba(255,255,255,0.80)")}>+{a.rewardXp} XP</div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 12, color: "rgba(255,255,255,0.60)", fontWeight: 800, fontSize: 12 }}>
          Badge premium (preview): in futuro puoi bloccare obiettivi extra + quiz avanzati per premium, senza impedire l’uso base.
        </div>
      </CardBox>
    </div>
  );
}

function CardBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.10)",
        background: "#0b1220",
        borderRadius: 20,
        padding: 14,
      }}
    >
      {children}
    </div>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.10)",
        background: "#0b1220",
        borderRadius: 18,
        padding: 12,
      }}
    >
      <div style={{ color: "rgba(255,255,255,0.70)", fontSize: 12, fontWeight: 900 }}>{title}</div>
      <div style={{ color: "rgba(255,255,255,0.95)", fontSize: 22, fontWeight: 950 }}>{value}</div>
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div style={{ height: 10, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${clamp(value * 100, 0, 100)}%`, background: "#0ea5e9" }} />
    </div>
  );
}

function inputMain(bold: boolean): React.CSSProperties {
  return {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: bold ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.86)",
    fontWeight: bold ? 950 : 800,
    outline: "none",
  };
}

function pillTag(bg: string, color: string): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: bg,
    color,
    fontWeight: 900,
  };
}

function btnPrimary(disabled: boolean): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: disabled ? "rgba(255,255,255,0.06)" : "#0ea5e9",
    color: disabled ? "rgba(255,255,255,0.55)" : "#020617",
    fontWeight: 950,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

function btnSecondary(disabled: boolean): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: disabled ? "rgba(255,255,255,0.06)" : "#22c55e",
    color: disabled ? "rgba(255,255,255,0.55)" : "#052e16",
    fontWeight: 950,
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "nowrap",
  };
}

function optBtn(): React.CSSProperties {
  return {
    padding: "12px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.92)",
    fontWeight: 850,
    cursor: "pointer",
    textAlign: "left",
  };
}
