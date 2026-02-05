import React, { useEffect, useMemo, useState } from "react";

import { QUIZ_BANK, type QuizQuestion } from "@/features/quiz/quizBank";
import {
  calcDailyReward,
  calcWeeklyReward,
  pickQuestions,
  startOfNextDay,
  startOfNextWeek,
  startOfToday,
  startOfWeek,
  type QuizKind,
} from "@/features/quiz/quizLogic";

const LS_PROFILE = "nd_profile";
const LS_COLLECTION = "nd_card_collection";
const LS_QUIZ_DAILY = "nd_quiz_daily_done"; // stores dayStart timestamp
const LS_QUIZ_WEEKLY = "nd_quiz_weekly_done"; // stores weekStart timestamp
const LS_QUIZ_STREAK = "nd_quiz_daily_streak"; // number
const LS_READ = "nd_read";
const LS_FAVORITES = "nd_favorites";

type ProfileData = {
  name: string;
  role: string;
  avatarDataUrl?: string;
};

type QuizState = {
  kind: QuizKind;
  questions: QuizQuestion[];
  idx: number;
  correct: number;
  selected: number | null;
  done: boolean;
};

function fmtCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
}

function rarityPillHint(): JSX.Element {
  return (
    <div style={{ color: "rgba(255,255,255,0.70)", fontSize: 12, lineHeight: 1.4 }}>
      💡 Tip: quiz giornalieri e settimanali sono la via più rapida per ottenere pillole senza “farmare” bustine.
    </div>
  );
}

export function ProfileTab({
  pills,
  setPills,
  favoritesCount,
  readCount,
  totalContent,
}: {
  pills: number;
  setPills: (next: number) => void;
  favoritesCount: number;
  readCount: number;
  totalContent: number;
}): JSX.Element {
  const [profile, setProfile] = useState<ProfileData>({ name: "Nurse", role: "Infermiere/a" });
  const [collectionStats, setCollectionStats] = useState({ unique: 0, total: 0 });

  const [dailyDoneStart, setDailyDoneStart] = useState<number | null>(null);
  const [weeklyDoneStart, setWeeklyDoneStart] = useState<number | null>(null);
  const [dailyStreak, setDailyStreak] = useState<number>(0);

  const [now, setNow] = useState<number>(Date.now());
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // ticker for countdown
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  // load profile + stats + quiz state
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;

      const rawProf = localStorage.getItem(LS_PROFILE);
      if (rawProf) setProfile(JSON.parse(rawProf) as ProfileData);

      // cards stats
      const rawCol = localStorage.getItem(LS_COLLECTION);
      if (rawCol) {
        const col = JSON.parse(rawCol) as Record<string, number>;
        const unique = Object.keys(col).filter((k) => (col[k] ?? 0) > 0).length;
        const total = Object.values(col).reduce((a, b) => a + (b ?? 0), 0);
        setCollectionStats({ unique, total });
      }

      const dd = localStorage.getItem(LS_QUIZ_DAILY);
      setDailyDoneStart(dd ? Number(dd) : null);

      const wd = localStorage.getItem(LS_QUIZ_WEEKLY);
      setWeeklyDoneStart(wd ? Number(wd) : null);

      const st = localStorage.getItem(LS_QUIZ_STREAK);
      setDailyStreak(st ? Number(st) : 0);
    } catch (e) {
      console.error("Profile load error", e);
    }
  }, []);

  // persist profile
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      localStorage.setItem(LS_PROFILE, JSON.stringify(profile));
    } catch {}
  }, [profile]);

  // refresh cards stats when pills changes (cheap) + when returning to tab
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const rawCol = localStorage.getItem(LS_COLLECTION);
      if (!rawCol) return;
      const col = JSON.parse(rawCol) as Record<string, number>;
      const unique = Object.keys(col).filter((k) => (col[k] ?? 0) > 0).length;
      const total = Object.values(col).reduce((a, b) => a + (b ?? 0), 0);
      setCollectionStats({ unique, total });
    } catch {}
  }, [pills]);

  const dailyAvailable = useMemo(() => {
    const today = startOfToday(now);
    return dailyDoneStart !== today;
  }, [dailyDoneStart, now]);

  const weeklyAvailable = useMemo(() => {
    const wk = startOfWeek(now);
    return weeklyDoneStart !== wk;
  }, [weeklyDoneStart, now]);

  const dailyCountdown = useMemo(() => fmtCountdown(startOfNextDay(now) - now), [now]);
  const weeklyCountdown = useMemo(() => fmtCountdown(startOfNextWeek(now) - now), [now]);

  const startQuiz = (kind: QuizKind) => {
    const count = kind === "daily" ? 5 : 12;
    const qs = pickQuestions(QUIZ_BANK, count);
    setQuiz({ kind, questions: qs, idx: 0, correct: 0, selected: null, done: false });
  };

  const pickAnswer = (idx: number) => {
    if (!quiz || quiz.done) return;
    setQuiz({ ...quiz, selected: idx });
  };

  const next = () => {
    if (!quiz || quiz.done) return;
    const q = quiz.questions[quiz.idx]!;
    const isCorrect = quiz.selected === q.answerIndex;
    const nextCorrect = quiz.correct + (isCorrect ? 1 : 0);

    const isLast = quiz.idx >= quiz.questions.length - 1;
    if (isLast) {
      // complete
      const total = quiz.questions.length;
      const kind = quiz.kind;

      // update done markers & reward
      const nowTs = Date.now();
      if (kind === "daily") {
        const todayStart = startOfToday(nowTs);
        localStorage.setItem(LS_QUIZ_DAILY, String(todayStart));
        setDailyDoneStart(todayStart);

        // streak logic: if yesterday done -> +1 else reset to 1
        const prev = dailyDoneStart;
        const yesterdayStart = todayStart - 24 * 3600 * 1000;
        const nextStreak =
          prev === yesterdayStart ? Math.max(1, dailyStreak + 1) : 1;
        localStorage.setItem(LS_QUIZ_STREAK, String(nextStreak));
        setDailyStreak(nextStreak);

        const reward = calcDailyReward(nextCorrect, total, nextStreak);
        setPills(pills + reward);
        setToast(`✅ Quiz giornaliero completato: ${nextCorrect}/${total} • +${reward} pillole`);
      } else {
        const weekStart = startOfWeek(nowTs);
        localStorage.setItem(LS_QUIZ_WEEKLY, String(weekStart));
        setWeeklyDoneStart(weekStart);

        const reward = calcWeeklyReward(nextCorrect, total);
        setPills(pills + reward);
        setToast(`🏁 Quiz settimanale completato: ${nextCorrect}/${total} • +${reward} pillole`);
      }

      setQuiz({ ...quiz, correct: nextCorrect, done: true });
      return;
    }

    setQuiz({ ...quiz, correct: nextCorrect, idx: quiz.idx + 1, selected: null });
  };

  const quitQuiz = () => setQuiz(null);

  // “Surprise” idea: micro-missione giornaliera (contenuti letti)
  const [missionClaimed, setMissionClaimed] = useState<boolean>(false);
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const key = "nd_mission_read_claimed_" + String(startOfToday(now));
      setMissionClaimed(localStorage.getItem(key) === "1");
    } catch {}
  }, [now]);

  const canClaimReadMission = useMemo(() => {
    // missione: leggi almeno 3 contenuti oggi
    // Nota: leggiamo solo count totale read (semplice). Premia anche chi recupera arretrati.
    return !missionClaimed && readCount >= 3;
  }, [missionClaimed, readCount]);

  const claimReadMission = () => {
    try {
      const key = "nd_mission_read_claimed_" + String(startOfToday(Date.now()));
      localStorage.setItem(key, "1");
      setMissionClaimed(true);
      setPills(pills + 25);
      setToast("🎯 Missione completata: +25 pillole");
    } catch {}
  };

  const onAvatarPick = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result || "");
      setProfile((p) => ({ ...p, avatarDataUrl: url }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {toast && (
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(14,165,233,0.10)",
            borderRadius: 16,
            padding: 10,
            color: "rgba(255,255,255,0.92)",
            fontWeight: 800,
          }}
        >
          {toast}
        </div>
      )}

      {/* Profile card */}
      <div
        style={{
          border: "1px solid rgba(255,255,255,0.10)",
          background: "#0b1220",
          borderRadius: 18,
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
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {profile.avatarDataUrl ? (
              <img src={profile.avatarDataUrl} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: 24 }}>👤</span>
            )}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ color: "rgba(255,255,255,0.70)", fontSize: 12, fontWeight: 800 }}>Profilo</div>
            <input
              value={profile.name}
              onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
              style={{
                width: "100%",
                marginTop: 6,
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
                width: "100%",
                marginTop: 8,
                padding: "10px 12px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.80)",
                fontWeight: 800,
                outline: "none",
              }}
            />
          </div>
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <label
            style={{
              display: "inline-flex",
              gap: 8,
              alignItems: "center",
              padding: "9px 12px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "#0f172a",
              cursor: "pointer",
              fontWeight: 800,
              color: "rgba(255,255,255,0.90)",
            }}
          >
            📷 Cambia avatar
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => onAvatarPick(e.target.files?.[0] ?? null)}
            />
          </label>

          <div
            style={{
              padding: "9px 12px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.06)",
              fontWeight: 900,
              color: "rgba(255,255,255,0.92)",
            }}
          >
            💊 {pills}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div
        style={{
          border: "1px solid rgba(255,255,255,0.10)",
          background: "#0b1220",
          borderRadius: 18,
          padding: 14,
        }}
      >
        <div style={{ color: "rgba(255,255,255,0.92)", fontWeight: 900, marginBottom: 10 }}>Statistiche</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <StatBox label="Preferiti" value={favoritesCount} />
          <StatBox label="Letti" value={`${readCount}/${totalContent}`} />
          <StatBox label="Carte uniche" value={`${collectionStats.unique}`} />
          <StatBox label="Carte totali" value={`${collectionStats.total}`} />
          <StatBox label="Streak quiz" value={`${dailyStreak}🔥`} />
        </div>
        <div style={{ marginTop: 10 }}>{rarityPillHint()}</div>
      </div>

      {/* Missions */}
      <div
        style={{
          border: "1px solid rgba(255,255,255,0.10)",
          background: "#0b1220",
          borderRadius: 18,
          padding: 14,
        }}
      >
        <div style={{ color: "rgba(255,255,255,0.92)", fontWeight: 900, marginBottom: 10 }}>Missioni</div>
        <div style={{ display: "grid", gap: 10 }}>
          <div
            style={{
              border: "1px solid rgba(255,255,255,0.10)",
              background: "#0f172a",
              borderRadius: 16,
              padding: 12,
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.92)" }}>Leggi 3 contenuti</div>
              <div style={{ color: "rgba(255,255,255,0.70)", fontSize: 12 }}>Ricompensa: +25 pillole (reset giornaliero)</div>
            </div>
            <button
              type="button"
              onClick={claimReadMission}
              disabled={!canClaimReadMission}
              style={{
                padding: "10px 12px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background: canClaimReadMission ? "#22c55e" : "rgba(255,255,255,0.06)",
                color: canClaimReadMission ? "#052e16" : "rgba(255,255,255,0.70)",
                fontWeight: 900,
                cursor: canClaimReadMission ? "pointer" : "not-allowed",
                whiteSpace: "nowrap",
              }}
            >
              {missionClaimed ? "Completata" : canClaimReadMission ? "Riscatta" : "Non pronta"}
            </button>
          </div>
        </div>
      </div>

      {/* Quiz */}
      <div
        style={{
          border: "1px solid rgba(255,255,255,0.10)",
          background: "#0b1220",
          borderRadius: 18,
          padding: 14,
        }}
      >
        <div style={{ color: "rgba(255,255,255,0.92)", fontWeight: 900, marginBottom: 10 }}>Quiz</div>

        {!quiz ? (
          <div style={{ display: "grid", gap: 10 }}>
            <QuizCard
              title="Quiz giornaliero"
              subtitle={`Reset tra: ${dailyCountdown}`}
              available={dailyAvailable}
              cta={dailyAvailable ? "Inizia" : "Completato"}
              onClick={() => startQuiz("daily")}
              hint={`Ricompensa: base + per risposta corretta + streak (streak: ${dailyStreak})`}
            />
            <QuizCard
              title="Quiz settimanale"
              subtitle={`Reset tra: ${weeklyCountdown}`}
              available={weeklyAvailable}
              cta={weeklyAvailable ? "Inizia" : "Completato"}
              onClick={() => startQuiz("weekly")}
              hint="Ricompensa maggiore, più domande."
            />
          </div>
        ) : (
          <div
            style={{
              border: "1px solid rgba(255,255,255,0.10)",
              background: "#0f172a",
              borderRadius: 16,
              padding: 12,
              display: "grid",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.92)" }}>
                {quiz.kind === "daily" ? "Quiz giornaliero" : "Quiz settimanale"} • {quiz.idx + 1}/{quiz.questions.length}
              </div>
              <button
                type="button"
                onClick={quitQuiz}
                style={{
                  padding: "8px 10px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.85)",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Esci
              </button>
            </div>

            <div style={{ color: "rgba(255,255,255,0.90)", fontWeight: 800 }}>
              {quiz.questions[quiz.idx]!.prompt}
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              {quiz.questions[quiz.idx]!.options.map((opt, i) => {
                const selected = quiz.selected === i;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => pickAnswer(i)}
                    style={{
                      textAlign: "left",
                      padding: "10px 12px",
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: selected ? "rgba(14,165,233,0.18)" : "rgba(255,255,255,0.06)",
                      color: "rgba(255,255,255,0.92)",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={next}
              disabled={quiz.selected == null}
              style={{
                marginTop: 4,
                padding: "10px 12px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background: quiz.selected == null ? "rgba(255,255,255,0.06)" : "#0ea5e9",
                color: quiz.selected == null ? "rgba(255,255,255,0.65)" : "#020617",
                fontWeight: 900,
                cursor: quiz.selected == null ? "not-allowed" : "pointer",
              }}
            >
              {quiz.idx >= quiz.questions.length - 1 ? "Concludi" : "Avanti"}
            </button>

            <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }}>
              Punteggio attuale: {quiz.correct} corretti
            </div>
          </div>
        )}
      </div>

      {/* dev / testing helpers (safe) */}
      <details style={{ opacity: 0.9 }}>
        <summary style={{ cursor: "pointer", color: "rgba(255,255,255,0.70)" }}>⚙️ Strumenti (test)</summary>
        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          <button
            type="button"
            onClick={() => {
              try {
                localStorage.removeItem(LS_QUIZ_DAILY);
                localStorage.removeItem(LS_QUIZ_WEEKLY);
                localStorage.removeItem(LS_QUIZ_STREAK);
                setDailyDoneStart(null);
                setWeeklyDoneStart(null);
                setDailyStreak(0);
                setToast("Reset quiz completato.");
              } catch {}
            }}
            style={{
              padding: "10px 12px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.90)",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Reset quiz (solo test)
          </button>

          <button
            type="button"
            onClick={() => {
              try {
                localStorage.removeItem(LS_PROFILE);
                setProfile({ name: "Nurse", role: "Infermiere/a" });
                setToast("Profilo resettato.");
              } catch {}
            }}
            style={{
              padding: "10px 12px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.90)",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Reset profilo (solo test)
          </button>
        </div>
      </details>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.10)",
        background: "#0f172a",
        borderRadius: 16,
        padding: 12,
      }}
    >
      <div style={{ color: "rgba(255,255,255,0.70)", fontSize: 12, fontWeight: 800 }}>{label}</div>
      <div style={{ color: "rgba(255,255,255,0.96)", fontSize: 20, fontWeight: 900, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function QuizCard({
  title,
  subtitle,
  hint,
  available,
  cta,
  onClick,
}: {
  title: string;
  subtitle: string;
  hint: string;
  available: boolean;
  cta: string;
  onClick: () => void;
}) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.10)",
        background: "#0f172a",
        borderRadius: 16,
        padding: 12,
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        alignItems: "center",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.92)" }}>{title}</div>
        <div style={{ color: "rgba(255,255,255,0.70)", fontSize: 12 }}>{subtitle}</div>
        <div style={{ color: "rgba(255,255,255,0.60)", fontSize: 12, marginTop: 6 }}>{hint}</div>
      </div>
      <button
        type="button"
        onClick={onClick}
        disabled={!available}
        style={{
          padding: "10px 12px",
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.12)",
          background: available ? "#0ea5e9" : "rgba(255,255,255,0.06)",
          color: available ? "#020617" : "rgba(255,255,255,0.65)",
          fontWeight: 900,
          cursor: available ? "pointer" : "not-allowed",
          whiteSpace: "nowrap",
        }}
      >
        {cta}
      </button>
    </div>
  );
}