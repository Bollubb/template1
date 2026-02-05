import React, { useEffect, useMemo, useState } from "react";

// ✅ use relative imports (no @ alias needed)
import { QUIZ_BANK, type QuizQuestion } from "../../features/quiz/quizBank";
import {
  calcDailyReward,
  calcWeeklyReward,
  getDailyState,
  getWeeklyState,
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
} as const;

type ProfileData = {
  name: string;
  role: string;
};

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

function safeJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function pickRandom<T>(arr: T[], n: number) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

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

  // stats sources
  const [favIds, setFavIds] = useState<Set<string>>(new Set());
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [cardsOwned, setCardsOwned] = useState<Record<string, number>>({});

  // mission daily: read 3
  const [missionDone, setMissionDone] = useState(false);
  const [missionClaimed, setMissionClaimed] = useState(false);

  // quiz
  const [mode, setMode] = useState<QuizMode>("daily");
  const [run, setRun] = useState<QuizRunState | null>(null);

  // countdown
  const [dailyLeft, setDailyLeft] = useState<number>(0);
  const [weeklyLeft, setWeeklyLeft] = useState<number>(0);

  // bootstrap
  useEffect(() => {
    if (typeof window === "undefined") return;

    const p = safeJson<ProfileData>(localStorage.getItem(LS.profile), { name: "Utente", role: "Infermiere" });
    setProfile(p);

    setAvatar(localStorage.getItem(LS.avatar));

    const favArr = safeJson<string[]>(localStorage.getItem(LS.favorites), []);
    setFavIds(new Set(favArr));

    const readArr = safeJson<string[]>(localStorage.getItem(LS.read), []);
    setReadIds(new Set(readArr));

    const owned = safeJson<Record<string, number>>(localStorage.getItem(LS.cards), {});
    setCardsOwned(owned);

    const m = safeJson<{ dayKey: string; claimed: boolean }>(localStorage.getItem(LS.mission), {
      dayKey: "",
      claimed: false,
    });
    const dayKey = new Date().toISOString().slice(0, 10);
    const claimed = m.dayKey === dayKey ? m.claimed : false;
    setMissionClaimed(claimed);
  }, []);

  // persist profile
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(LS.profile, JSON.stringify(profile));
  }, [profile]);

  // mission progress
  useEffect(() => {
    const dayKey = new Date().toISOString().slice(0, 10);
    const progress = clamp(readIds.size, 0, 3);
    const done = progress >= 3;
    setMissionDone(done);

    // reset claimed daily
    if (typeof window === "undefined") return;
    const m = safeJson<{ dayKey: string; claimed: boolean }>(localStorage.getItem(LS.mission), {
      dayKey: "",
      claimed: false,
    });
    if (m.dayKey !== dayKey) {
      const next = { dayKey, claimed: false };
      localStorage.setItem(LS.mission, JSON.stringify(next));
      setMissionClaimed(false);
    }
  }, [readIds]);

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

  const uniqueCards = useMemo(() => Object.keys(cardsOwned).filter((k) => (cardsOwned[k] || 0) > 0).length, [cardsOwned]);
  const totalCards = useMemo(() => Object.values(cardsOwned).reduce((a, b) => a + (b || 0), 0), [cardsOwned]);

  const dailyState = useMemo(() => getDailyState(), [dailyLeft]); // re-eval with tick
  const weeklyState = useMemo(() => getWeeklyState(), [weeklyLeft]);

  const canStartDaily = dailyState.status !== "done";
  const canStartWeekly = weeklyState.status !== "done";

  function startQuiz(nextMode: QuizMode) {
    const bank = QUIZ_BANK;
    const questions = pickRandom(bank, nextMode === "daily" ? 5 : 12);

    const newRun: QuizRunState = {
      mode: nextMode,
      status: "running",
      idx: 0,
      correct: 0,
      selected: null,
      questions,
      history: [],
    };
    setMode(nextMode);
    setRun(newRun);
  }

  function answer(selected: number) {
    if (!run || run.status !== "running") return;
    const q = run.questions[run.idx];
    const isCorrect = selected === q.answer;

    const nextHistory = [
      ...run.history,
      { id: q.id, q: q.q, options: q.options, answer: q.answer, selected },
    ];

    const nextCorrect = run.correct + (isCorrect ? 1 : 0);
    const isLast = run.idx >= run.questions.length - 1;

    if (!isLast) {
      setRun({
        ...run,
        idx: run.idx + 1,
        correct: nextCorrect,
        selected: null,
        history: nextHistory,
      });
      return;
    }

    // finish
    const total = run.questions.length;
    const perfect = nextCorrect === total;
    let reward = 0;
    if (run.mode === "daily") reward = calcDailyReward(nextCorrect, total, perfect, dailyState.streak);
    else reward = calcWeeklyReward(nextCorrect, total, perfect);

    setPills((p) => p + reward);

    if (run.mode === "daily") {
      setDailyState({ ...dailyState, status: "done", streak: dailyState.streak + (nextCorrect > 0 ? 1 : 0) });
    } else {
      setWeeklyState({ ...weeklyState, status: "done" });
    }

    setRun({
      ...run,
      status: "done",
      correct: nextCorrect,
      selected,
      history: nextHistory,
    });
  }

  function closeRun() {
    setRun(null);
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

  function claimMission() {
    if (!missionDone || missionClaimed) return;
    setPills((p) => p + 25);
    const dayKey = new Date().toISOString().slice(0, 10);
    const next = { dayKey, claimed: true };
    localStorage.setItem(LS.mission, JSON.stringify(next));
    setMissionClaimed(true);
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* Header */}
      <div
        style={{
          border: "1px solid rgba(255,255,255,0.10)",
          background: "#0b1220",
          borderRadius: 20,
          padding: 14,
        }}
      >
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
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.92)",
                fontWeight: 900,
                outline: "none",
              }}
            />
            <input
              value={profile.role}
              onChange={(e) => setProfile((p) => ({ ...p, role: e.target.value }))}
              style={{
                marginTop: 8,
                width: "100%",
                padding: "10px 12px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.86)",
                fontWeight: 700,
                outline: "none",
              }}
            />
          </div>
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <label
            style={{
              padding: "10px 12px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "#0f172a",
              color: "rgba(255,255,255,0.92)",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
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

          <div
            style={{
              padding: "10px 12px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "#0f172a",
              color: "rgba(255,255,255,0.88)",
              fontWeight: 900,
            }}
          >
            Pillole: {pills}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Stat title="Preferiti" value={String(favIds.size)} />
        <Stat title="Letti" value={`${readIds.size}/${totalContent}`} />
        <Stat title="Carte uniche" value={String(uniqueCards)} />
        <Stat title="Carte totali" value={String(totalCards)} />
      </div>

      {/* Mission */}
      <div
        style={{
          border: "1px solid rgba(255,255,255,0.10)",
          background: "#0b1220",
          borderRadius: 20,
          padding: 14,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
          <div>
            <div style={{ color: "rgba(255,255,255,0.92)", fontWeight: 900 }}>Missione giornaliera</div>
            <div style={{ color: "rgba(255,255,255,0.72)", fontWeight: 700, fontSize: 13 }}>
              Leggi 3 contenuti → +25 pillole
            </div>
          </div>
          <div style={{ color: "rgba(255,255,255,0.70)", fontWeight: 800, fontSize: 12 }}>Reset: {msToHMS(dailyLeft)}</div>
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ flex: 1, height: 10, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${clamp((readIds.size / 3) * 100, 0, 100)}%`,
                background: "#0ea5e9",
              }}
            />
          </div>

          <button
            type="button"
            onClick={claimMission}
            disabled={!missionDone || missionClaimed}
            style={{
              padding: "10px 12px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.12)",
              background: !missionDone || missionClaimed ? "rgba(255,255,255,0.06)" : "#22c55e",
              color: !missionDone || missionClaimed ? "rgba(255,255,255,0.60)" : "#052e16",
              fontWeight: 900,
              cursor: !missionDone || missionClaimed ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {missionClaimed ? "Riscattata" : missionDone ? "Riscatta" : "In corso"}
          </button>
        </div>
      </div>

      {/* Quiz */}
      <div
        style={{
          border: "1px solid rgba(255,255,255,0.10)",
          background: "#0b1220",
          borderRadius: 20,
          padding: 14,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
          <div>
            <div style={{ color: "rgba(255,255,255,0.92)", fontWeight: 900 }}>Quiz</div>
            <div style={{ color: "rgba(255,255,255,0.72)", fontWeight: 700, fontSize: 13 }}>
              Completa daily/weekly per ottenere pillole
            </div>
          </div>
          <div style={{ color: "rgba(255,255,255,0.70)", fontWeight: 800, fontSize: 12 }}>
            Streak daily: {dailyState.streak}
          </div>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => startQuiz("daily")}
            disabled={!canStartDaily}
            style={btnPrimary(!canStartDaily)}
          >
            Daily (reset {msToHMS(dailyLeft)})
          </button>

          <button
            type="button"
            onClick={() => startQuiz("weekly")}
            disabled={!canStartWeekly}
            style={btnPrimary(!canStartWeekly)}
          >
            Weekly (reset {msToHMS(weeklyLeft)})
          </button>
        </div>

        {run && (
          <div style={{ marginTop: 12, borderTop: "1px solid rgba(255,255,255,0.10)", paddingTop: 12 }}>
            {run.status === "running" ? (
              <div>
                <div style={{ color: "rgba(255,255,255,0.90)", fontWeight: 900 }}>
                  {run.mode.toUpperCase()} — Domanda {run.idx + 1}/{run.questions.length}
                </div>
                <div style={{ marginTop: 6, color: "rgba(255,255,255,0.85)", fontWeight: 700 }}>{run.questions[run.idx].q}</div>

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
                <div style={{ color: "rgba(255,255,255,0.92)", fontWeight: 900 }}>
                  Quiz completato: {run.correct}/{run.questions.length}
                </div>
                <button type="button" onClick={closeRun} style={{ ...btnPrimary(false), marginTop: 10 }}>
                  Chiudi
                </button>
              </div>
            )}
          </div>
        )}
      </div>
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
      <div style={{ color: "rgba(255,255,255,0.70)", fontSize: 12, fontWeight: 800 }}>{title}</div>
      <div style={{ color: "rgba(255,255,255,0.95)", fontSize: 22, fontWeight: 950 }}>{value}</div>
    </div>
  );
}

function btnPrimary(disabled: boolean): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: disabled ? "rgba(255,255,255,0.06)" : "#0ea5e9",
    color: disabled ? "rgba(255,255,255,0.55)" : "#020617",
    fontWeight: 900,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

function optBtn(): React.CSSProperties {
  return {
    padding: "12px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.92)",
    fontWeight: 800,
    cursor: "pointer",
    textAlign: "left",
  };
}
