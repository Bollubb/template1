import React, { useEffect, useMemo, useState } from "react";
import UtilityHub from "./UtilityHub";
import { computeLevel, getXp } from "@/features/progress/xp";
import { getDailyCounter, getDailyFlag } from "@/features/progress/dailyCounters";
import { getDailyState, getWeeklyState, getNextDailyResetMs, getNextWeeklyResetMs } from "@/features/cards/quiz/quizLogic";

const LS = {
  pills: "nd_pills",
  freePacks: "nd_free_packs",
  favs: "nd_utility_favs",
  profile: "nd_profile",
  avatar: "nd_avatar",
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

  const [dailyLeft, setDailyLeft] = useState(0);
  const [weeklyLeft, setWeeklyLeft] = useState(0);

  const [favTools, setFavTools] = useState<ToolId[]>([]);

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

  if (mode === "utility") {
    return <UtilityHub onBack={() => setMode("home")} />;
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

        <div style={{ marginTop: 10, opacity: 0.75, fontWeight: 800, fontSize: 12 }}>
          Oggi: {utilityToday} utility • {packsToday} bustine • {recycledToday} riciclate
        </div>
      </Card>
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
