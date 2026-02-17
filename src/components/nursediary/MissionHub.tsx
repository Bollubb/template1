import React, { useEffect, useMemo, useState } from "react";
import { addXp } from "@/features/progress/xp";
import { getDailyState, getHistory, type QuizHistoryItem } from "@/features/cards/quiz/quizLogic";

type MissionHubProps = {
  dailyLeft?: number;
  weeklyLeft?: number;
};

const LS = {
  achievements: "nd_achievements_claimed",
  pills: "nd_pills",
  read: "nd_read",
  favorites: "nd_favorites",
  cards: "nd_card_collection",
  premium: "nd_premium",
} as const;

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function safeJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function cardStyle(): React.CSSProperties {
  return {
    padding: 14,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    boxShadow: "0 12px 28px rgba(0,0,0,0.32)",
  };
}

function smallBadgeStyle(): React.CSSProperties {
  return {
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.05)",
    fontSize: 12,
    fontWeight: 800,
    opacity: 0.9,
    width: "fit-content",
  };
}

function progressPct(value: number, target: number) {
  if (target <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value / target) * 100)));
}

type Achievement = {
  id: string;
  title: string;
  desc: string;
  value: number;
  target: number;
  pill: number;
  xp: number;
};

export default function MissionHub({ dailyLeft = 0, weeklyLeft = 0 }: MissionHubProps) {
  const [claimed, setClaimed] = useState<Record<string, boolean>>({});
  const [pills, setPills] = useState(0);

  const [readCount, setReadCount] = useState(0);
  const [favCount, setFavCount] = useState(0);
  const [uniqueCards, setUniqueCards] = useState(0);
  const [quizHistory, setQuizHistory] = useState<QuizHistoryItem[]>([]);
  const [streak, setStreak] = useState(0);
  const [premium, setPremium] = useState(false);

  useEffect(() => {
    if (!isBrowser()) return;

    setClaimed(safeJson(localStorage.getItem(LS.achievements), {}));
    setPills(Number(localStorage.getItem(LS.pills) || "0") || 0);
    setPremium(localStorage.getItem(LS.premium) === "1");

    const readIds = safeJson<string[]>(localStorage.getItem(LS.read), []);
    const favIds = safeJson<string[]>(localStorage.getItem(LS.favorites), []);
    const cardsOwned = safeJson<Record<string, number>>(localStorage.getItem(LS.cards), {});
    const uniq = Object.keys(cardsOwned).filter((k) => (cardsOwned[k] || 0) > 0).length;

    setReadCount(readIds.length);
    setFavCount(favIds.length);
    setUniqueCards(uniq);
    setQuizHistory(getHistory());
    setStreak(getDailyState().streak || 0);
  }, []);

  useEffect(() => {
    if (!isBrowser()) return;
    try {
      localStorage.setItem(LS.achievements, JSON.stringify(claimed));
    } catch {}
  }, [claimed]);

  const accuracy = useMemo(() => {
    const totals = quizHistory.reduce(
      (acc, h) => {
        acc.correct += h.correct;
        acc.total += h.total;
        return acc;
      },
      { correct: 0, total: 0 }
    );
    if (totals.total <= 0) return 0;
    return Math.round((totals.correct / totals.total) * 100);
  }, [quizHistory]);

  const quizDone = quizHistory.length;
  const quizCorrectTotal = useMemo(() => quizHistory.reduce((a, h) => a + h.correct, 0), [quizHistory]);

  const achievements: Achievement[] = useMemo(() => {
    // "Incrementati" rispetto a quelli nel profilo: target più alti e qualche obiettivo in più.
    return [
      { id: "a_read_25", title: "Lettore", desc: "Leggi 25 contenuti", value: readCount, target: 25, pill: 70, xp: 70 },
      { id: "a_fav_10", title: "Curatore", desc: "Aggiungi 10 preferiti", value: favCount, target: 10, pill: 60, xp: 60 },
      { id: "a_cards_15", title: "Collezionista", desc: "Ottieni 15 carte uniche", value: uniqueCards, target: 15, pill: 90, xp: 70 },
      { id: "a_quiz_10", title: "Studioso", desc: "Completa 10 quiz", value: quizDone, target: 10, pill: 110, xp: 110 },
      { id: "a_acc_90", title: "Preciso", desc: "Raggiungi 90% accuracy (min 10 quiz)", value: quizDone < 10 ? 0 : accuracy, target: 90, pill: 140, xp: 140 },
      { id: "a_streak_7", title: "Costante", desc: "Streak Daily di 7 giorni", value: streak, target: 7, pill: 150, xp: 120 },
      { id: "a_correct_120", title: "Veterano", desc: "Rispondi correttamente a 120 domande", value: quizCorrectTotal, target: 120, pill: 170, xp: 150 },
      { id: "a_premium_1", title: "Premium", desc: "Attiva Premium", value: premium ? 1 : 0, target: 1, pill: 250, xp: 250 },
    ];
  }, [readCount, favCount, uniqueCards, quizDone, accuracy, streak, quizCorrectTotal, premium]);

  function claim(a: Achievement) {
    if (!isBrowser()) return;
    if (claimed[a.id]) return;

    const done = a.value >= a.target;
    if (!done) return;

    setClaimed((p) => ({ ...p, [a.id]: true }));

    const cur = Number(localStorage.getItem(LS.pills) || "0") || 0;
    const next = cur + a.pill;
    localStorage.setItem(LS.pills, String(next));
    setPills(next);

    addXp(a.xp);
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div>
          <div style={{ fontWeight: 950, fontSize: 18 }}>Missioni</div>
          <div style={{ opacity: 0.72, fontWeight: 750, fontSize: 13 }}>Obiettivi e ricompense</div>
        </div>

        <div style={smallBadgeStyle()}>{pills} 💊</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={cardStyle()}>
          <div style={{ fontWeight: 850 }}>Reset giornaliero</div>
          <div style={{ opacity: 0.75, fontSize: 13 }}>Tempo rimanente: {Math.floor(dailyLeft / 1000 / 60)} min</div>
          <div style={{ marginTop: 8, opacity: 0.8, fontSize: 12 }}>Streak: <b>{streak}</b></div>
        </div>
        <div style={cardStyle()}>
          <div style={{ fontWeight: 850 }}>Reset settimanale</div>
          <div style={{ opacity: 0.75, fontSize: 13 }}>Tempo rimanente: {Math.floor(weeklyLeft / 1000 / 60)} min</div>
          <div style={{ marginTop: 8, opacity: 0.8, fontSize: 12 }}>Accuracy: <b>{accuracy}%</b></div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {achievements.map((a) => {
          const done = a.value >= a.target;
          const isClaimed = !!claimed[a.id];
          const pct = progressPct(a.value, a.target);

          return (
            <div key={a.id} style={cardStyle()}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 950 }}>{a.title}</div>
                  <div style={{ opacity: 0.75, fontSize: 13, marginTop: 2 }}>{a.desc}</div>
                </div>

                <div style={{ display: "grid", justifyItems: "end", gap: 6 }}>
                  <div style={{ fontWeight: 900, fontSize: 12, opacity: 0.9 }}>
                    {Math.min(a.value, a.target)}/{a.target}
                  </div>

                  {!isClaimed ? (
                    <button
                      type="button"
                      onClick={() => claim(a)}
                      disabled={!done}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 12,
                        border: "1px solid rgba(255,255,255,0.14)",
                        background: done ? "rgba(34,197,94,0.14)" : "rgba(255,255,255,0.04)",
                        color: "rgba(255,255,255,0.92)",
                        fontWeight: 900,
                        cursor: done ? "pointer" : "not-allowed",
                        opacity: done ? 1 : 0.6,
                      }}
                    >
                      Riscatta +{a.pill}💊
                    </button>
                  ) : (
                    <div style={{ ...smallBadgeStyle(), border: "1px solid rgba(34,197,94,0.25)", background: "rgba(34,197,94,0.12)" }}>
                      Riscattato ✅
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: done ? "rgba(34,197,94,0.55)" : "rgba(56,189,248,0.45)" }} />
                </div>
                <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between", opacity: 0.72, fontSize: 12 }}>
                  <div>Ricompensa: <b>+{a.pill}💊</b> • <b>+{a.xp} XP</b></div>
                  <div>{pct}%</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
