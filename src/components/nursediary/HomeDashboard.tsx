import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { computeLevel, getXp } from "@/features/progress/xp";

type HomeDashboardProps = {
  onGoToCards: () => void;
  onGoToDidattica: () => void;
  onGoToProfile: () => void;
};

const LS = {
  pills: "nd_pills",
  profile: "nd_profile",
  premium: "nd_premium",
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

function btnPrimary(disabled?: boolean): React.CSSProperties {
  return {
    width: "100%",
    padding: "12px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: disabled ? "rgba(255,255,255,0.06)" : "rgba(56,189,248,0.14)",
    color: "rgba(255,255,255,0.94)",
    fontWeight: 900,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.7 : 1,
  };
}

function btnGhost(disabled?: boolean): React.CSSProperties {
  return {
    width: "100%",
    padding: "12px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.04)",
    color: "rgba(255,255,255,0.92)",
    fontWeight: 900,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.65 : 1,
  };
}

export default function HomeDashboard({ onGoToCards, onGoToDidattica, onGoToProfile }: HomeDashboardProps) {
  const router = useRouter();

  const [name, setName] = useState("Nurse");
  const [role, setRole] = useState("Study Hub");
  const [pills, setPills] = useState(0);
  const [premium, setPremium] = useState(false);
  const [xp, setXp] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const p = safeJson<{ name?: string; role?: string }>(localStorage.getItem(LS.profile), {});
      if (p.name) setName(p.name);
      if (p.role) setRole(p.role);

      setPills(Number(localStorage.getItem(LS.pills) || "0") || 0);
      setPremium(localStorage.getItem(LS.premium) === "1");
      setXp(getXp());
    } catch {}
  }, []);

  const lvl = useMemo(() => computeLevel(xp).level, [xp]);
  const next = useMemo(() => computeLevel(xp).nextAt, [xp]);
  const prev = useMemo(() => computeLevel(xp).prevAt, [xp]);
  const pct = useMemo(() => {
    const span = Math.max(1, next - prev);
    return Math.max(0, Math.min(100, Math.round(((xp - prev) / span) * 100)));
  }, [xp, next, prev]);

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
            <div style={{ opacity: 0.75, fontSize: 12, fontWeight: 800 }}>Livello</div>
            <div style={{ fontWeight: 950, fontSize: 18, marginTop: 2 }}>Lv {lvl}</div>
            <div style={{ marginTop: 8, height: 8, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: "rgba(56,189,248,0.55)" }} />
            </div>
            <div style={{ marginTop: 6, opacity: 0.7, fontSize: 12 }}>
              XP: {xp} • Prossimo livello: {next}
            </div>
          </div>
        </div>
      </div>

      <div style={card()}>
        <div style={{ fontWeight: 950, fontSize: 16 }}>Azioni rapide</div>
        <div style={{ opacity: 0.72, fontSize: 13, marginTop: 4 }}>
          Vai subito ai moduli principali (senza duplicare pagine dentro la Home).
        </div>

        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button type="button" onClick={() => router.push("/quiz")} style={btnPrimary()}>
            🧠 Quiz
          </button>
          <button type="button" onClick={() => router.push("/missioni")} style={btnGhost()}>
            🎯 Missioni
          </button>
          <button type="button" onClick={() => router.push("/utility")} style={btnGhost()}>
            🛠️ Utility
          </button>
          <button type="button" onClick={() => router.push("/classifica")} style={btnGhost()}>
            🏆 Classifica
          </button>
        </div>
      </div>

      <div style={card()}>
        <div style={{ fontWeight: 950, fontSize: 16 }}>Esplora</div>
        <div style={{ opacity: 0.72, fontSize: 13, marginTop: 4 }}>
          Didattica, Carte e Profilo restano nei rispettivi menu: qui solo accesso rapido.
        </div>

        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <button type="button" onClick={onGoToDidattica} style={btnGhost()}>
            📚 Didattica
          </button>
          <button type="button" onClick={onGoToCards} style={btnGhost()}>
            🃏 Carte
          </button>
          <button type="button" onClick={onGoToProfile} style={btnGhost()}>
            👤 Profilo
          </button>
        </div>
      </div>
    </div>
  );
}
