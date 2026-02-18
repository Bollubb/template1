import React, { useEffect, useMemo, useState } from "react";
import { computeLevel, getWeeklyXpMap, getXp } from "@/features/progress/xp";
import ShiftPlanner from "./ShiftPlanner";

type HomeDashboardProps = {
  onGoToCards: () => void;
  onGoToDidattica: () => void;
  onGoToProfile: () => void;
};

const LS = {
  pills: "nd_pills",
  profile: "nd_profile",
  premium: "nd_premium",
  login: "nd_login_daily",
  xpSeen: "nd_xp_seen_home_v1",
  dailyXp: "nd_daily_xp_v1", // Record<YYYY-MM-DD, xpGained>
} as const;

function safeJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
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

function isoDayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function getISOWeekKey(d: Date) {
  // ISO-ish week key like 2026-W05 (same logic as progress/xp.ts)
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function bigPill(bg: string): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.14)",
    background: bg,
    fontWeight: 950,
    fontSize: 12,
    color: "rgba(255,255,255,0.92)",
    whiteSpace: "nowrap",
  };
}

export default function HomeDashboard(_props: HomeDashboardProps) {
  const [name, setName] = useState("Nurse");
  const [role, setRole] = useState("Study Hub");
  const [pills, setPills] = useState(0);
  const [premium, setPremium] = useState(false);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [dailyXp, setDailyXp] = useState(0);
  const [weeklyXp, setWeeklyXp] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const p = safeJson<{ name?: string; role?: string }>(localStorage.getItem(LS.profile), {});
      if (p.name) setName(p.name);
      if (p.role) setRole(p.role);

      setPills(Number(localStorage.getItem(LS.pills) || "0") || 0);
      setPremium(localStorage.getItem(LS.premium) === "1");
      const curXp = getXp();
      setXp(curXp);

      // streak from daily login (if present)
      const login = safeJson<{ streak?: number }>(localStorage.getItem(LS.login), {});
      setStreak(Number(login.streak || 0) || 0);

      // derive daily XP gained (lightweight, safe) by diffing last seen XP
      const today = isoDayKey();
      const lastSeen = Number(localStorage.getItem(LS.xpSeen) || "0") || 0;
      const diff = curXp > lastSeen ? curXp - lastSeen : 0;
      const map = safeJson<Record<string, number>>(localStorage.getItem(LS.dailyXp), {});
      if (diff > 0) map[today] = (map[today] || 0) + diff;
      try {
        localStorage.setItem(LS.dailyXp, JSON.stringify(map));
        localStorage.setItem(LS.xpSeen, String(curXp));
      } catch {}
      setDailyXp(map[today] || 0);

      // weekly XP gained from progress tracker
      const wk = getISOWeekKey(new Date());
      const weekly = getWeeklyXpMap();
      setWeeklyXp(weekly[wk] || 0);
    } catch {}
  }, []);

  const lvlInfo = useMemo(() => computeLevel(xp), [xp]);
  const lvl = lvlInfo.level;
  const need = lvlInfo.need;
  const pct = lvlInfo.pct;
  const pct100 = Math.min(100, Math.max(0, Math.round(pct * 100)));

  // Duolingo-ish targets
  const dailyGoal = 60;
  const weeklyGoal = 350;
  const dailyPct = Math.min(100, Math.round((dailyXp / dailyGoal) * 100));
  const weeklyPct = Math.min(100, Math.round((weeklyXp / weeklyGoal) * 100));
  const nextMilestone = lvl % 5 === 0 ? lvl + 5 : lvl + (5 - (lvl % 5));


  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={card()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div>
            <div style={{ fontWeight: 950, fontSize: 18 }}>Ciao, {name} 👋</div>
            <div style={{ opacity: 0.72, fontWeight: 750, fontSize: 13 }}>{role}</div>
          </div>
          <div
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.12)",
              background: premium ? "rgba(34,197,94,0.14)" : "rgba(255,255,255,0.05)",
              fontWeight: 900,
              fontSize: 12,
            }}
          >
            {premium ? "Premium" : "Free"}
          </div>
        </div>

        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ ...card(), padding: 12 }}>
            <div style={{ opacity: 0.75, fontSize: 12, fontWeight: 800 }}>Pillole</div>
            <div style={{ fontWeight: 950, fontSize: 18, marginTop: 2 }}>{pills} 💊</div>
            <div style={{ marginTop: 8, opacity: 0.7, fontSize: 12 }}>Usale per aprire bustine e avanzare.</div>
          </div>

          <div style={{ ...card(), padding: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div>
                <div style={{ opacity: 0.75, fontSize: 12, fontWeight: 800 }}>Percorso</div>
                <div style={{ fontWeight: 950, fontSize: 18, marginTop: 2 }}>Lv {lvl}</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                <span style={bigPill("rgba(255,255,255,0.06)")}>🔥 {streak}</span>
                <span style={bigPill("rgba(56,189,248,0.14)")}>🎯 {dailyXp}/{dailyGoal} XP</span>
              </div>
            </div>

            {/* XP to next level */}
            <div style={{ marginTop: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, opacity: 0.78, fontWeight: 800 }}>
                <span>Prossimo livello</span>
                <span>
                  {pct100}% • {lvlInfo.remaining}/{need}
                </span>
              </div>
              <div style={{ marginTop: 8, height: 10, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct100}%`, background: "rgba(56,189,248,0.65)" }} />
              </div>
            </div>

            {/* Daily / Weekly goals */}
            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, opacity: 0.78, fontWeight: 800 }}>
                  <span>Obiettivo giornaliero</span>
                  <span>{dailyPct}%</span>
                </div>
                <div style={{ marginTop: 6, height: 8, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${dailyPct}%`, background: "rgba(34,197,94,0.55)" }} />
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, opacity: 0.78, fontWeight: 800 }}>
                  <span>Obiettivo settimanale</span>
                  <span>{weeklyPct}%</span>
                </div>
                <div style={{ marginTop: 6, height: 8, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${weeklyPct}%`, background: "rgba(167,139,250,0.55)" }} />
                </div>
              </div>
            </div>

            <div style={{ marginTop: 10, opacity: 0.7, fontSize: 12 }}>
              Prossima milestone: <b>Lv {nextMilestone}</b> 🎁
            </div>
          </div>
        </div>
      </div>

      <ShiftPlanner />
    </div>
  );
}