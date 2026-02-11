import React, { useMemo } from "react";
import { getDailyCounter } from "@/features/progress/dailyCounters";
import { getWeeklyXpMap } from "@/features/progress/xp";

type TierDef = { need: number; pills: number; xp?: number; pack?: number };

type MissionDef = {
  id: string;
  scope: string;
  label: string;
  progress: number;
  tiers: [TierDef, TierDef, TierDef];
};

export default function MissionHub({
  dayKey,
  weekKey,
  dailyLeft,
  weeklyLeft,
  getClaimed,
  setClaimed,
  onGrant,
}: {
  dayKey: string;
  weekKey: string;
  dailyLeft: number;
  weeklyLeft: number;
  getClaimed: (scope: string, id: string) => number;
  setClaimed: (scope: string, id: string, tier: number) => void;
  onGrant: (reward: { pills: number; xp?: number; pack?: number }, meta: { label: string; tier: number }) => void;
}) {
  const missions = useMemo(() => {
    const dailyReads = getDailyCounter("nd_daily_reads");
    const dailyUtility = getDailyCounter("nd_daily_utility_used");
    const dailyPacks = getDailyCounter("nd_daily_packs_opened");
    const dailyRecycled = getDailyCounter("nd_daily_recycled");
    const dailyQuiz = getDailyCounter("nd_daily_quiz_done");
    const dailyPerfect = getDailyCounter("nd_daily_quiz_perfect");
    const dailyCombo = dailyReads + dailyUtility + dailyQuiz;
    const dailyLogin = getDailyCounter("nd_daily_login_claimed_count");
    const weeklyXp = getWeeklyXpMap()[weekKey] || 0;

    const defs: MissionDef[] = [
      {
        id: "reads",
        scope: dayKey,
        label: "📚 Letture oggi",
        progress: dailyReads,
        tiers: [
          { need: 3, pills: 25, xp: 10 },
          { need: 10, pills: 80, xp: 35 },
          { need: 25, pills: 170, xp: 85, pack: 1 },
        ],
      },
      {
        id: "utility",
        scope: dayKey,
        label: "🛠 Utility oggi",
        progress: dailyUtility,
        tiers: [
          { need: 2, pills: 20, xp: 10 },
          { need: 6, pills: 65, xp: 30 },
          { need: 12, pills: 140, xp: 70 },
        ],
      },
      {
        id: "quiz",
        scope: dayKey,
        label: "🧠 Quiz oggi",
        progress: dailyQuiz,
        tiers: [
          { need: 1, pills: 25, xp: 20 },
          { need: 2, pills: 60, xp: 45 },
          { need: 4, pills: 140, xp: 100, pack: 1 },
        ],
      {
        id: "combo",
        scope: dayKey,
        label: "🧾 Combo oggi (letture+utility+quiz)",
        progress: dailyCombo,
        tiers: [
          { need: 6, pills: 35, xp: 20 },
          { need: 14, pills: 95, xp: 60 },
          { need: 28, pills: 210, xp: 150, pack: 1 },
          { need: 45, pills: 360, xp: 260, pack: 2 },
        ],
      },
      },
      {
        id: "perfect",
        scope: dayKey,
        label: "🎯 Quiz perfetti oggi",
        progress: dailyPerfect,
        tiers: [
          { need: 1, pills: 40, xp: 30 },
          { need: 2, pills: 95, xp: 70 },
          { need: 3, pills: 170, xp: 140, pack: 1 },
        ],
      },
      {
        id: "packs",
        scope: dayKey,
        label: "🎴 Bustine oggi",
        progress: dailyPacks,
        tiers: [
          { need: 1, pills: 10, xp: 10 },
          { need: 4, pills: 45, xp: 30 },
          { need: 8, pills: 100, xp: 70 },
        ],
      },
      {
        id: "recycle",
        scope: dayKey,
        label: "♻️ Riciclo oggi",
        progress: dailyRecycled,
        tiers: [
          { need: 2, pills: 15, xp: 10 },
          { need: 10, pills: 55, xp: 35 },
          { need: 25, pills: 140, xp: 90 },
        ],
      },
      {
        id: "login",
        scope: dayKey,
        label: "✅ Login reward oggi",
        progress: dailyLogin,
        tiers: [
          { need: 1, pills: 25, xp: 15 },
          { need: 1, pills: 0 },
          { need: 1, pills: 0 },
        ],
      },
      {
        id: "weekly_xp",
        scope: weekKey,
        label: "🏁 XP settimanali",
        progress: weeklyXp,
        tiers: [
          { need: 200, pills: 80 },
          { need: 520, pills: 160, pack: 1 },
          { need: 900, pills: 280, pack: 2 },
          { need: 1400, pills: 420, pack: 3 },
        ],
      },
    ];
    return defs;
  }, [dayKey, weekKey]);

  const dailyCount = missions.filter((m) => m.scope === dayKey).length;
  const weeklyCount = missions.filter((m) => m.scope === weekKey).length;

  return (
    <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
          padding: "10px 12px",
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.04)",
        }}
      >
        <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.90)" }}>
          Daily ({dailyCount}) • reset {msToHMS(dailyLeft)}
        </div>
        <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.90)" }}>
          Weekly ({weeklyCount}) • reset {msToHMS(weeklyLeft)}
        </div>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {missions.map((m) => {
          const claimed = getClaimed(m.scope, m.id);
          const nextTier = Math.min(3, claimed + 1);
          const tierDef = m.tiers[nextTier - 1];
          const done = m.progress >= tierDef.need;
          const maxed = claimed >= 3;

          const pct = Math.max(0, Math.min(100, Math.round((m.progress / tierDef.need) * 100)));
          const missing = Math.max(0, tierDef.need - m.progress);

          return (
            <div
              key={`${m.scope}:${m.id}`}
              style={{
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 16,
                padding: 12,
                background: maxed ? "rgba(34,197,94,0.10)" : "#0f172a",
                display: "grid",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                <div style={{ fontWeight: 950 }}>{m.label}</div>
                <div style={{ opacity: 0.8, fontWeight: 900, fontSize: 12 }}>Step {maxed ? 3 : nextTier}/3</div>
              </div>

              {/* tier stepper */}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {[1, 2, 3].map((t) => {
                  const filled = claimed >= t;
                  const active = !maxed && nextTier === t;
                  return (
                    <div
                      key={t}
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 10,
                        display: "grid",
                        placeItems: "center",
                        fontWeight: 950,
                        fontSize: 12,
                        border: "1px solid rgba(255,255,255,0.14)",
                        background: filled ? "rgba(34,197,94,0.25)" : active ? "rgba(59,130,246,0.22)" : "rgba(255,255,255,0.06)",
                        color: "rgba(255,255,255,0.92)",
                      }}
                    >
                      {t}
                    </div>
                  );
                })}
                <div style={{ marginLeft: 6, opacity: 0.8, fontWeight: 850, fontSize: 12 }}>
                  {maxed ? "Completata" : done ? "Pronta da riscattare" : missing ? `Mancano ${missing}` : "In corso"}
                </div>
              </div>

              {/* progress bar */}
              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12, fontWeight: 850, opacity: 0.85 }}>
                  <div>
                    Progresso: {m.progress}/{tierDef.need}
                  </div>
                  <div>{pct}%</div>
                </div>
                <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: "rgba(59,130,246,0.70)" }} />
                </div>
              </div>

              {/* rewards */}
              <div style={{ opacity: 0.9, fontWeight: 850, fontSize: 12 }}>
                Reward step {nextTier}: +{tierDef.pills} 💊
                {tierDef.xp ? <span>{" "}+{tierDef.xp} XP</span> : null}
                {tierDef.pack ? <span>{" "}+{tierDef.pack} 🎁</span> : null}
              </div>

              <button
                type="button"
                disabled={maxed || !done}
                onClick={() => {
                  if (maxed || !done) return;
                  onGrant({ pills: tierDef.pills, xp: tierDef.xp, pack: tierDef.pack }, { label: m.label, tier: nextTier });
                  setClaimed(m.scope, m.id, nextTier);
                }}
                style={primaryBtn(maxed || !done)}
              >
                {maxed ? "Completata" : done ? "Riscatta reward" : "In corso"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function msToHMS(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
}

function primaryBtn(disabled: boolean): React.CSSProperties {
  return {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: disabled ? "rgba(255,255,255,0.06)" : "rgba(59,130,246,0.92)",
    color: disabled ? "rgba(255,255,255,0.55)" : "#0b1220",
    fontWeight: 950,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}