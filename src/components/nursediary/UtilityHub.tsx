import React, { useMemo, useState } from "react";
import { incDailyCounter } from "@/features/progress/dailyCounters";
import { useToast } from "./Toast";

const LS = {
  favs: "nd_utility_favs",
} as const;

type ToolId =
  | "mlh"
  | "gtt"
  | "mgkgmin"
  | "map"
  | "bmi"
  | "diuresi";

type ToolDef = { id: ToolId; title: string; subtitle: string; xp: number };

const TOOLS: ToolDef[] = [
  { id: "mlh", title: "Velocità infusione", subtitle: "ml/h da volume e tempo", xp: 3 },
  { id: "gtt", title: "Gocce/min", subtitle: "con deflussore 20 o 60 gtt", xp: 3 },
  { id: "mgkgmin", title: "Dose → ml/h", subtitle: "mg/kg/min → ml/h (con concentrazione)", xp: 4 },
  { id: "map", title: "MAP", subtitle: "pressione arteriosa media", xp: 2 },
  { id: "bmi", title: "BMI", subtitle: "indice massa corporea", xp: 2 },
  { id: "diuresi", title: "Diuresi", subtitle: "ml/kg/h", xp: 2 },
];

function safeJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function UtilityHub({ onBack }: { onBack: () => void }) {
  const toast = useToast();
  const [active, setActive] = useState<ToolId | null>(null);
  const [favs, setFavs] = useState<ToolId[]>(() => {
    if (typeof window === "undefined") return [];
    return safeJson<ToolId[]>(localStorage.getItem(LS.favs), []);
  });

  const activeDef = useMemo(() => TOOLS.find((t) => t.id === active) || null, [active]);

  function toggleFav(id: ToolId) {
    setFavs((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev].slice(0, 6);
      try {
        localStorage.setItem(LS.favs, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  function rewardUse() {
    incDailyCounter("nd_daily_utility_used", 1);
    toast.push("Utility usata", "success");
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div
        style={{
          border: "1px solid rgba(255,255,255,0.10)",
          background: "#0b1220",
          borderRadius: 20,
          padding: 14,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div>
            <div style={{ fontWeight: 950, fontSize: 18 }}>🛠 Utility infermieristiche</div>
            <div style={{ opacity: 0.72, fontWeight: 700, fontSize: 13 }}>
              Calcolatori rapidi (offline). Usarli dà solo XP.
            </div>
          </div>
          <button
            type="button"
            onClick={onBack}
            style={{
              padding: "10px 12px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.92)",
              fontWeight: 900,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            ← Home
          </button>
        </div>

        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {TOOLS.map((t) => {
            const isFav = favs.includes(t.id);
            const isActive = active === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActive(t.id)}
                style={{
                  textAlign: "left",
                  borderRadius: 18,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: isActive ? "rgba(14,165,233,0.16)" : "#0f172a",
                  padding: 12,
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 950 }}>{t.title}</div>
                    <div style={{ opacity: 0.72, fontWeight: 700, fontSize: 12 }}>{t.subtitle}</div>
                  </div>
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFav(t.id);
                    }}
                    style={{
                      fontSize: 18,
                      opacity: isFav ? 1 : 0.55,
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    title="Preferito"
                  >
                    ⭐
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {activeDef && (
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.10)",
            background: "#0b1220",
            borderRadius: 20,
            padding: 14,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
            <div style={{ fontWeight: 950 }}>{activeDef.title}</div>
            <div style={{ opacity: 0.7, fontWeight: 800, fontSize: 12 }}>+{activeDef.xp} XP</div>
          </div>

          <div style={{ marginTop: 10 }}>
            <ToolRenderer id={activeDef.id} onUsed={() => rewardUse()} />
          </div>
        </div>
      )}
    </div>
  );
}

function ToolRenderer({ id, onUsed }: { id: ToolId; onUsed: () => void }) {
  switch (id) {
    case "mlh":
      return <ToolMlH onUsed={onUsed} />;
    case "gtt":
      return <ToolGtt onUsed={onUsed} />;
    case "mgkgmin":
      return <ToolMgKgMin onUsed={onUsed} />;
    case "map":
      return <ToolMAP onUsed={onUsed} />;
    case "bmi":
      return <ToolBMI onUsed={onUsed} />;
    case "diuresi":
      return <ToolDiuresi onUsed={onUsed} />;
    default:
      return null;
  }
}

function Input({ label, value, onChange, suffix }: { label: string; value: string; onChange: (v: string) => void; suffix?: string }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <div style={{ opacity: 0.78, fontWeight: 800, fontSize: 12 }}>{label}</div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode="decimal"
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.92)",
            fontWeight: 900,
            outline: "none",
          }}
        />
        {suffix && <div style={{ opacity: 0.7, fontWeight: 800, fontSize: 12 }}>{suffix}</div>}
      </div>
    </label>
  );
}

function Result({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        marginTop: 12,
        padding: "12px 12px",
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "#0f172a",
        fontWeight: 950,
      }}
    >
      {children}
    </div>
  );
}

function ToolMlH({ onUsed }: { onUsed: () => void }) {
  const [ml, setMl] = useState("");
  const [hours, setHours] = useState("");
  const out = useMemo(() => {
    const v = Number(ml);
    const h = Number(hours);
    if (!Number.isFinite(v) || !Number.isFinite(h) || v <= 0 || h <= 0) return null;
    return v / h;
  }, [ml, hours]);

  return (
    <div>
      <div style={{ display: "grid", gap: 10 }}>
        <Input label="Volume" value={ml} onChange={setMl} suffix="ml" />
        <Input label="Tempo" value={hours} onChange={setHours} suffix="ore" />
      </div>
      {out !== null && (
        <Result>
          Velocità: {out.toFixed(1)} ml/h{" "}
          <button type="button" onClick={onUsed} style={miniBtn()}>
            Usa
          </button>
        </Result>
      )}
    </div>
  );
}

function ToolGtt({ onUsed }: { onUsed: () => void }) {
  const [ml, setMl] = useState("");
  const [minutes, setMinutes] = useState("");
  const [setType, setSetType] = useState<20 | 60>(20);

  const out = useMemo(() => {
    const v = Number(ml);
    const m = Number(minutes);
    if (!Number.isFinite(v) || !Number.isFinite(m) || v <= 0 || m <= 0) return null;
    const gttPerMin = (v * setType) / m;
    return gttPerMin;
  }, [ml, minutes, setType]);

  return (
    <div>
      <div style={{ display: "grid", gap: 10 }}>
        <Input label="Volume" value={ml} onChange={setMl} suffix="ml" />
        <Input label="Tempo" value={minutes} onChange={setMinutes} suffix="min" />
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 4 }}>
          <div style={{ opacity: 0.78, fontWeight: 800, fontSize: 12 }}>Deflussore</div>
          <button type="button" onClick={() => setSetType(20)} style={chip(setType === 20)}>
            20 gtt
          </button>
          <button type="button" onClick={() => setSetType(60)} style={chip(setType === 60)}>
            60 gtt
          </button>
        </div>
      </div>
      {out !== null && (
        <Result>
          Gocce/min: {out.toFixed(0)} gtt/min{" "}
          <button type="button" onClick={onUsed} style={miniBtn()}>
            Usa
          </button>
        </Result>
      )}
    </div>
  );
}

function ToolMgKgMin({ onUsed }: { onUsed: () => void }) {
  const [dose, setDose] = useState(""); // mg/kg/min
  const [kg, setKg] = useState("");
  const [conc, setConc] = useState(""); // mg/ml
  const out = useMemo(() => {
    const d = Number(dose);
    const w = Number(kg);
    const c = Number(conc);
    if (![d, w, c].every(Number.isFinite) || d <= 0 || w <= 0 || c <= 0) return null;
    const mgMin = d * w;
    const mlMin = mgMin / c;
    const mlH = mlMin * 60;
    return mlH;
  }, [dose, kg, conc]);

  return (
    <div>
      <div style={{ display: "grid", gap: 10 }}>
        <Input label="Dose" value={dose} onChange={setDose} suffix="mg/kg/min" />
        <Input label="Peso" value={kg} onChange={setKg} suffix="kg" />
        <Input label="Concentrazione" value={conc} onChange={setConc} suffix="mg/ml" />
      </div>
      {out !== null && (
        <Result>
          Velocità: {out.toFixed(2)} ml/h{" "}
          <button type="button" onClick={onUsed} style={miniBtn()}>
            Usa
          </button>
        </Result>
      )}
    </div>
  );
}

function ToolMAP({ onUsed }: { onUsed: () => void }) {
  const [sys, setSys] = useState("");
  const [dia, setDia] = useState("");
  const out = useMemo(() => {
    const s = Number(sys);
    const d = Number(dia);
    if (![s, d].every(Number.isFinite) || s <= 0 || d <= 0) return null;
    return d + (s - d) / 3;
  }, [sys, dia]);

  return (
    <div>
      <div style={{ display: "grid", gap: 10 }}>
        <Input label="Sistolica" value={sys} onChange={setSys} suffix="mmHg" />
        <Input label="Diastolica" value={dia} onChange={setDia} suffix="mmHg" />
      </div>
      {out !== null && (
        <Result>
          MAP: {out.toFixed(0)} mmHg{" "}
          <button type="button" onClick={onUsed} style={miniBtn()}>
            Usa
          </button>
        </Result>
      )}
    </div>
  );
}

function ToolBMI({ onUsed }: { onUsed: () => void }) {
  const [kg, setKg] = useState("");
  const [cm, setCm] = useState("");
  const out = useMemo(() => {
    const w = Number(kg);
    const hcm = Number(cm);
    if (![w, hcm].every(Number.isFinite) || w <= 0 || hcm <= 0) return null;
    const h = hcm / 100;
    return w / (h * h);
  }, [kg, cm]);

  return (
    <div>
      <div style={{ display: "grid", gap: 10 }}>
        <Input label="Peso" value={kg} onChange={setKg} suffix="kg" />
        <Input label="Altezza" value={cm} onChange={setCm} suffix="cm" />
      </div>
      {out !== null && (
        <Result>
          BMI: {out.toFixed(1)}{" "}
          <button type="button" onClick={onUsed} style={miniBtn()}>
            Usa
          </button>
        </Result>
      )}
    </div>
  );
}

function ToolDiuresi({ onUsed }: { onUsed: () => void }) {
  const [ml, setMl] = useState("");
  const [hours, setHours] = useState("");
  const [kg, setKg] = useState("");
  const out = useMemo(() => {
    const v = Number(ml);
    const h = Number(hours);
    const w = Number(kg);
    if (![v, h, w].every(Number.isFinite) || v <= 0 || h <= 0 || w <= 0) return null;
    return v / (w * h);
  }, [ml, hours, kg]);

  return (
    <div>
      <div style={{ display: "grid", gap: 10 }}>
        <Input label="Volume urine" value={ml} onChange={setMl} suffix="ml" />
        <Input label="Tempo" value={hours} onChange={setHours} suffix="ore" />
        <Input label="Peso" value={kg} onChange={setKg} suffix="kg" />
      </div>
      {out !== null && (
        <Result>
          Diuresi: {out.toFixed(2)} ml/kg/h{" "}
          <button type="button" onClick={onUsed} style={miniBtn()}>
            Usa
          </button>
        </Result>
      )}
    </div>
  );
}

function chip(active: boolean): React.CSSProperties {
  return {
    padding: "8px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.12)",
    background: active ? "rgba(14,165,233,0.16)" : "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.92)",
    fontWeight: 900,
    cursor: "pointer",
  };
}

function miniBtn(): React.CSSProperties {
  return {
    marginLeft: 10,
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.92)",
    fontWeight: 900,
    cursor: "pointer",
  };
}
