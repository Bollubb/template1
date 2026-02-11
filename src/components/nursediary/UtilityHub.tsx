import React, { useMemo, useState } from "react";
import { incDailyCounter } from "@/features/progress/dailyCounters";
import { useToast } from "./Toast";

const LS = {
  favs: "nd_utility_favs",
  history: "nd_utility_history_v1",
} as const;

type ToolId =
  | "mlh"
  | "gtt"
  | "mgkgmin"
  | "map"
  | "bmi"
  | "diuresi";

type ToolDef = { id: ToolId; title: string; subtitle: string };

type UtilityHistoryItem = {
  tool: ToolId;
  ts: number;
  inputs: Record<string, string | number | boolean>;
  output: string;
};

const TOOLS: ToolDef[] = [
  { id: "mlh", title: "Velocità infusione", subtitle: "ml/h da volume e tempo"},
  { id: "gtt", title: "Gocce/min", subtitle: "con deflussore 20 o 60 gtt"},
  { id: "mgkgmin", title: "Dose → ml/h", subtitle: "mg/kg/min → ml/h (con concentrazione)"},
  { id: "map", title: "MAP", subtitle: "pressione arteriosa media"},
  { id: "bmi", title: "BMI", subtitle: "indice massa corporea"},
  { id: "diuresi", title: "Diuresi", subtitle: "ml/kg/h"},
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

  const [history, setHistory] = useState<UtilityHistoryItem[]>(() => {
    if (typeof window === "undefined") return [];
    return safeJson<UtilityHistoryItem[]>(localStorage.getItem(LS.history), []);
  });

  const lastByTool = useMemo(() => {
    const map = {} as Record<ToolId, UtilityHistoryItem | null>;
    for (const t of TOOLS) map[t.id] = null;
    for (const h of history) {
      if (!map[h.tool]) map[h.tool] = h;
    }
    return map;
  }, [history]);

  function pushHistory(item: UtilityHistoryItem) {
    setHistory((prev) => {
      const next = [item, ...prev].slice(0, 30);
      try {
        localStorage.setItem(LS.history, JSON.stringify(next));
      } catch {}
      return next;
    });
  }


  const activeDef = useMemo(() => TOOLS.find((t) => t.id === active) || null, [active]);
  const activeHistory = useMemo(() => {
    if (!active) return [] as UtilityHistoryItem[];
    return history.filter((h) => h.tool === active).slice(0, 5);
  }, [history, active]);

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
              Calcolatori rapidi (offline). Usarli dà solo feedback (no XP).
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
            <div style={{ opacity: 0.7, fontWeight: 800, fontSize: 12 }}>Nessuna ricompensa</div>
          </div>

          <div style={{ marginTop: 10 }}>
            <ToolRenderer id={activeDef.id} last={lastByTool[activeDef.id]} onSave={pushHistory} onUsed={() => rewardUse()} />
          </div>

{activeHistory.length > 0 && (
            <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
              <div style={{ opacity: 0.78, fontWeight: 800, fontSize: 12 }}>Ultimi calcoli</div>
              {activeHistory.map((h) => (
                <div key={h.ts} style={{ padding: "10px 12px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.92)" }}>{h.output}</div>
                  <div style={{ opacity: 0.7, fontWeight: 800, fontSize: 12 }}>{new Date(h.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ToolRenderer({ id, last, onSave, onUsed }: { id: ToolId; last: UtilityHistoryItem | null; onSave: (item: UtilityHistoryItem) => void; onUsed: () => void }) {
  switch (id) {
    case "mlh":
      return <ToolMlH last={last} onSave={onSave} onUsed={onUsed} />;
    case "gtt":
      return <ToolGtt last={last} onSave={onSave} onUsed={onUsed} />;
    case "mgkgmin":
      return <ToolMgKgMin last={last} onSave={onSave} onUsed={onUsed} />;
    case "map":
      return <ToolMAP last={last} onSave={onSave} onUsed={onUsed} />;
    case "bmi":
      return <ToolBMI last={last} onSave={onSave} onUsed={onUsed} />;
    case "diuresi":
      return <ToolDiuresi last={last} onSave={onSave} onUsed={onUsed} />;
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

function ToolMlH({ last, onSave, onUsed }: { last: UtilityHistoryItem | null; onSave: (item: UtilityHistoryItem) => void; onUsed: () => void }) {
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
      {last?.tool === "mlh" && (
        <button type="button" onClick={() => {
          const i = (last.inputs || {}) as any;
          setMl(String(i.ml ?? ""));
          setHours(String(i.hours ?? ""));
        }} style={miniBtn()}>
          ↩ Usa ultimo
        </button>
      )}
      <div style={{ display: "grid", gap: 10 }}>
        <Input label="Volume" value={ml} onChange={setMl} suffix="ml" />
        <Input label="Tempo" value={hours} onChange={setHours} suffix="ore" />
      </div>
      {out !== null && (
        <Result>
          Velocità: {out.toFixed(1)} ml/h{" "}
          <button type="button" onClick={() => {
            onSave({ tool: "gtt", ts: Date.now(), inputs: { ml, minutes, setType }, output: `${out.toFixed(0)} gtt/min` });
            onUsed();
          }} style={miniBtn()}>
            Usa
          </button>
        </Result>
      )}
    </div>
  );
}

function ToolGtt({ last, onSave, onUsed }: { last: UtilityHistoryItem | null; onSave: (item: UtilityHistoryItem) => void; onUsed: () => void }) {
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
      {last?.tool === "gtt" && (
        <button type="button" onClick={() => {
          const i = (last.inputs || {}) as any;
          setMl(String(i.ml ?? ""));
          setMinutes(String(i.minutes ?? ""));
          if (i.setType === 20 || i.setType === 60) setSetType(i.setType);
        }} style={miniBtn()}>
          ↩ Usa ultimo
        </button>
      )}
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
          <button type="button" onClick={() => {
            onSave({ tool: "mgkgmin", ts: Date.now(), inputs: { dose, kg, conc }, output: `${out.toFixed(2)} ml/h` });
            onUsed();
          }} style={miniBtn()}>
            Usa
          </button>
        </Result>
      )}
    </div>
  );
}

function ToolMgKgMin({ last, onSave, onUsed }: { last: UtilityHistoryItem | null; onSave: (item: UtilityHistoryItem) => void; onUsed: () => void }) {
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
      {last?.tool === "mgkgmin" && (
        <button type="button" onClick={() => {
          const i = (last.inputs || {}) as any;
          setDose(String(i.dose ?? ""));
          setKg(String(i.kg ?? ""));
          setConc(String(i.conc ?? ""));
        }} style={miniBtn()}>
          ↩ Usa ultimo
        </button>
      )}
      <div style={{ display: "grid", gap: 10 }}>
        <Input label="Dose" value={dose} onChange={setDose} suffix="mg/kg/min" />
        <Input label="Peso" value={kg} onChange={setKg} suffix="kg" />
        <Input label="Concentrazione" value={conc} onChange={setConc} suffix="mg/ml" />
      </div>
      {out !== null && (
        <Result>
          Velocità: {out.toFixed(2)} ml/h{" "}
          <button type="button" onClick={() => {
            onSave({ tool: "map", ts: Date.now(), inputs: { sys, dia }, output: `${out.toFixed(0)} mmHg` });
            onUsed();
          }} style={miniBtn()}>
            Usa
          </button>
        </Result>
      )}
    </div>
  );
}

function ToolMAP({ last, onSave, onUsed }: { last: UtilityHistoryItem | null; onSave: (item: UtilityHistoryItem) => void; onUsed: () => void }) {
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
      {last?.tool === "map" && (
        <button type="button" onClick={() => {
          const i = (last.inputs || {}) as any;
          setSys(String(i.sys ?? ""));
          setDia(String(i.dia ?? ""));
        }} style={miniBtn()}>
          ↩ Usa ultimo
        </button>
      )}
      <div style={{ display: "grid", gap: 10 }}>
        <Input label="Sistolica" value={sys} onChange={setSys} suffix="mmHg" />
        <Input label="Diastolica" value={dia} onChange={setDia} suffix="mmHg" />
      </div>
      {out !== null && (
        <Result>
          MAP: {out.toFixed(0)} mmHg{" "}
          <button type="button" onClick={() => {
            onSave({ tool: "bmi", ts: Date.now(), inputs: { kg, cm }, output: `${out.toFixed(1)}` });
            onUsed();
          }} style={miniBtn()}>
            Usa
          </button>
        </Result>
      )}
    </div>
  );
}

function ToolBMI({ last, onSave, onUsed }: { last: UtilityHistoryItem | null; onSave: (item: UtilityHistoryItem) => void; onUsed: () => void }) {
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
      {last?.tool === "bmi" && (
        <button type="button" onClick={() => {
          const i = (last.inputs || {}) as any;
          setKg(String(i.kg ?? ""));
          setCm(String(i.cm ?? ""));
        }} style={miniBtn()}>
          ↩ Usa ultimo
        </button>
      )}
      <div style={{ display: "grid", gap: 10 }}>
        <Input label="Peso" value={kg} onChange={setKg} suffix="kg" />
        <Input label="Altezza" value={cm} onChange={setCm} suffix="cm" />
      </div>
      {out !== null && (
        <Result>
          BMI: {out.toFixed(1)}{" "}
          <button type="button" onClick={() => {
            onSave({ tool: "diuresi", ts: Date.now(), inputs: { ml, hours, kg }, output: `${out.toFixed(2)} ml/kg/h` });
            onUsed();
          }} style={miniBtn()}>
            Usa
          </button>
        </Result>
      )}
    </div>
  );
}

function ToolDiuresi({ last, onSave, onUsed }: { last: UtilityHistoryItem | null; onSave: (item: UtilityHistoryItem) => void; onUsed: () => void }) {
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
      {last?.tool === "diuresi" && (
        <button type="button" onClick={() => {
          const i = (last.inputs || {}) as any;
          setMl(String(i.ml ?? ""));
          setHours(String(i.hours ?? ""));
          setKg(String(i.kg ?? ""));
        }} style={miniBtn()}>
          ↩ Usa ultimo
        </button>
      )}
      <div style={{ display: "grid", gap: 10 }}>
        <Input label="Volume urine" value={ml} onChange={setMl} suffix="ml" />
        <Input label="Tempo" value={hours} onChange={setHours} suffix="ore" />
        <Input label="Peso" value={kg} onChange={setKg} suffix="kg" />
      </div>
      {out !== null && (
        <Result>
          Diuresi: {out.toFixed(2)} ml/kg/h{" "}
          <button type="button" onClick={() => {
            onSave({ tool: "mlh", ts: Date.now(), inputs: { ml, hours }, output: `${out.toFixed(1)} ml/h` });
            onUsed();
          }} style={miniBtn()}>
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
