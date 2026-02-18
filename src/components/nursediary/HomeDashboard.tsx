import React, { useEffect, useMemo, useState } from "react";
import { computeLevel, getWeeklyXpMap, getXp } from "@/features/progress/xp";
import ShiftPlanner from "./ShiftPlanner";
import { useToast } from "./Toast";

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
  freePacks: "nd_free_packs",
  milestoneClaimed: "nd_level_milestones_claimed_v1", // Record<number, true>
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
  const toast = useToast();
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

  // Auto milestone reward on reaching Lv 5/10/15...
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const lvlNow = computeLevel(getXp()).level;
      if (lvlNow < 5) return;

      const claimed = safeJson<Record<string, true>>(localStorage.getItem(LS.milestoneClaimed), {});
      const top = Math.floor(lvlNow / 5) * 5;
      const newly: number[] = [];
      for (let m = 5; m <= top; m += 5) {
        if (!claimed[String(m)]) newly.push(m);
      }
      if (!newly.length) return;

      let addPills = 0;
      let addFree = 0;
      for (const m of newly) {
        claimed[String(m)] = true;
        addPills += 10 + m * 2; // 20@5, 30@10, 40@15...
        addFree += m % 10 === 0 ? 2 : 1;
      }

      const curPills = Number(localStorage.getItem(LS.pills) || "0") || 0;
      const curFree = Number(localStorage.getItem(LS.freePacks) || "0") || 0;
      localStorage.setItem(LS.pills, String(curPills + addPills));
      localStorage.setItem(LS.freePacks, String(curFree + addFree));
      localStorage.setItem(LS.milestoneClaimed, JSON.stringify(claimed));

      setPills(curPills + addPills);
      const last = newly[newly.length - 1];
      toast.push(`Milestone Lv ${last} 🎁 +${addPills}💊 • +${addFree} bustine`, "success", { duration: 4200 });
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xp]);

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

  const pathItems = useMemo(() => {
    const start = Math.max(1, Math.floor((lvl - 1) / 5) * 5 + 1);
    const items: { level: number; kind: "node" | "chest"; active: boolean }[] = [];
    for (let i = 0; i < 10; i++) {
      const lv = start + i;
      items.push({ level: lv, kind: lv % 5 === 0 ? "chest" : "node", active: lv === lvl });
    }
    return items;
  }, [lvl]);


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

            {/* Mini path strip (Duolingo-ish) */}
            <div style={{ marginTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                <div style={{ opacity: 0.78, fontWeight: 800, fontSize: 12 }}>Percorso</div>
                <div style={{ opacity: 0.7, fontWeight: 800, fontSize: 12 }}>
                  Lv {pathItems[0]?.level} → {pathItems[pathItems.length - 1]?.level}
                </div>
              </div>
              <div
                style={{
                  marginTop: 8,
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  overflowX: "auto",
                  paddingBottom: 4,
                  WebkitOverflowScrolling: "touch",
                }}
              >
                {pathItems.map((it, idx) => {
                  const done = it.level < lvl;
                  const tone = it.active
                    ? { bg: "rgba(56,189,248,0.70)", br: "rgba(56,189,248,0.90)", fg: "#001018" }
                    : done
                    ? { bg: "rgba(34,197,94,0.30)", br: "rgba(34,197,94,0.55)", fg: "rgba(255,255,255,0.92)" }
                    : { bg: "rgba(255,255,255,0.06)", br: "rgba(255,255,255,0.14)", fg: "rgba(255,255,255,0.78)" };

                  const isLast = idx === pathItems.length - 1;
                  return (
                    <div key={it.level} style={{ display: "flex", alignItems: "center", gap: 10, flex: "0 0 auto" }}>
                      <div
                        style={{
                          width: it.kind === "chest" ? 38 : 30,
                          height: 30,
                          borderRadius: 999,
                          border: `1px solid ${tone.br}`,
                          background: tone.bg,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 950,
                          color: tone.fg,
                          boxShadow: it.active ? "0 10px 22px rgba(56,189,248,0.22)" : "none",
                        }}
                        title={it.kind === "chest" ? `Forziere Lv ${it.level}` : `Lv ${it.level}`}
                      >
                        {it.kind === "chest" ? "🎁" : it.active ? "⭐" : it.level}
                      </div>
                      {!isLast && (
                        <div
                          style={{
                            width: 22,
                            height: 3,
                            borderRadius: 999,
                            background: done ? "rgba(34,197,94,0.45)" : "rgba(255,255,255,0.12)",
                          }}
                        />
                      )}
                    </div>
                  );
                })}
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