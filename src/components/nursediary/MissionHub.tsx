import React from "react";

type MissionHubProps = {
  dayKey?: string;
  weekKey?: string;
  dailyLeft?: number;
  weeklyLeft?: number;
  getClaimed?: (scope: string, id: string) => number;
  setClaimed?: (scope: string, id: string, tier: number) => void;
  onGrant?: (
    reward: { coins?: number; xp?: number; pills?: number },
    meta: { scope: string; id: string; tier: number }
  ) => void;
};

const noop = () => {};

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function getWeekKey() {
  const d = new Date();
  const first = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(
    ((d.getTime() - first.getTime()) / 86400000 + first.getDay() + 1) / 7
  );
  return `${d.getFullYear()}-W${week}`;
}

export default function MissionHub({
  dayKey,
  weekKey,
  dailyLeft = 0,
  weeklyLeft = 0,
  getClaimed = () => 0,
  setClaimed = noop,
  onGrant = noop,
}: MissionHubProps) {
  const dk = dayKey ?? getTodayKey();
  const wk = weekKey ?? getWeekKey();

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ fontWeight: 900, fontSize: 18 }}>Missioni</div>

      <div
        style={{
          padding: 14,
          borderRadius: 12,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div style={{ fontWeight: 700 }}>Reset giornaliero</div>
        <div style={{ opacity: 0.7, fontSize: 13 }}>
          Tempo rimanente: {Math.floor(dailyLeft / 1000 / 60)} min
        </div>
      </div>

      <div
        style={{
          padding: 14,
          borderRadius: 12,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div style={{ fontWeight: 700 }}>Reset settimanale</div>
        <div style={{ opacity: 0.7, fontSize: 13 }}>
          Tempo rimanente: {Math.floor(weeklyLeft / 1000 / 60)} min
        </div>
      </div>

      <div
        style={{
          padding: 14,
          borderRadius: 12,
          background: "rgba(255,255,255,0.03)",
          border: "1px dashed rgba(255,255,255,0.1)",
        }}
      >
        Sistema missioni attivo (versione stabile).
      </div>
    </div>
  );
}
