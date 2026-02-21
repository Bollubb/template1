import React, { useMemo, useState } from "react";
import { isPremium } from "@/features/profile/premium";

type ScaleToolId = "news2" | "gcs";

type UtilityHistoryItem = {
  tool: string;
  ts: number;
  inputs: Record<string, string | number | boolean>;
  output: string;
};

const LS_NEWS2_PREV = "nd_utility_news2_prev_v1";

function safeJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

const isBrowser = () => typeof window !== "undefined" && typeof localStorage !== "undefined";

export default function ToolScales({
  active,
  setActive,
  lastByTool,
  onSave,
  onUpsell,
  onToast,
  favs,
  onToggleFav,
}: {
  active: ScaleToolId | null;
  setActive: (id: ScaleToolId | null) => void;
  lastByTool: Record<string, UtilityHistoryItem | null>;
  onSave: (item: UtilityHistoryItem) => void;
  onUpsell: (t: string, d: string, bullets?: string[]) => void;
  onToast: (m: string, type?: any) => void;
  favs: ("INTERACTIONS" | "INFUSION" | "NEWS2" | "GCS")[];
  onToggleFav: (tool: "INTERACTIONS" | "INFUSION" | "NEWS2" | "GCS") => void;
}) {
  if (!active) {
    return (
      <div style={{ display: "grid", gap: 10 }}>
        <div className="nd-grid2">
          <ScaleCard
          title="NEWS2"
          subtitle="Early warning score"
          badge="CORE"
          isFav={favs.includes("NEWS2")}
          onFav={() => onToggleFav("NEWS2")}
          onClick={() => setActive("news2")}
        />
        <ScaleCard
          title="Glasgow Coma Scale"
          subtitle="GCS 3–15 con severità"
          badge="NEURO"
          isFav={favs.includes("GCS")}
          onFav={() => onToggleFav("GCS")}
          onClick={() => setActive("gcs")}
        />

        </div>

        <div style={{ marginTop: 6, opacity: 0.75, fontSize: 12, lineHeight: 1.35 }}>
          Nota: questi strumenti sono di supporto operativo. In caso di dubbio o peggioramento clinico, attiva i percorsi
          locali e confrontati con il medico.
        </div>
      </div>
    );
  }

  if (active === "news2") {
    return (
      <ToolNEWS2
        last={lastByTool["NEWS2"] || null}
        onBack={() => setActive(null)}
        onSave={onSave}
        onUpsell={onUpsell}
        onToast={onToast}
      />
    );
  }

  return <ToolGCS last={lastByTool["GCS"] || null} onBack={() => setActive(null)} onSave={onSave} onToast={onToast} />;
}

function ScaleCard({
  title,
  subtitle,
  badge,
  isFav,
  onFav,
  onClick,
}: {
  title: string;
  subtitle: string;
  badge?: string;
  isFav: boolean;
  onFav: () => void;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className={`nd-tile-card nd-press ${badge === "CORE" ? "nd-tile-warm" : "nd-tile-neuro"}`}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="nd-tile-title">{title}</div>
          {badge && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 900,
                padding: "3px 8px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.16)",
                opacity: 0.95,
              }}
            >
              {badge}
            </span>
          )}
        </div>
        <div className="nd-tile-sub">{subtitle}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          type="button"
          className="nd-press"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onFav();
          }}
          aria-label={isFav ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}
          style={{
            borderRadius: 999,
            padding: "6px 10px",
            border: "1px solid rgba(255,255,255,0.14)",
            background: isFav ? "rgba(250,204,21,0.14)" : "rgba(255,255,255,0.04)",
            color: "rgba(255,255,255,0.92)",
            fontWeight: 950,
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          {isFav ? "★" : "☆"}
        </button>
        <div style={{ opacity: 0.55, fontWeight: 900, fontSize: 18 }}>›</div>
      </div>
    </button>
  );
}

function ScaleShell({
  title,
  subtitle,
  children,
  onBack,
  onSave,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  onBack: () => void;
  onSave: () => void;
}) {
  return (
    <div className="nd-fade-in" style={{ borderRadius: 18, padding: 16, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 950, fontSize: 15 }}>{title}</div>
          <div style={{ opacity: 0.75, fontSize: 13, marginTop: 4 }}>{subtitle}</div>
        </div>

        <button type="button" className="nd-press" onClick={onBack} style={ghostBtn()}>
          Indietro
        </button>
      </div>

      <div style={{ marginTop: 12 }}>{children}</div>

      <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
        <button type="button" className="nd-press" onClick={onSave} style={primaryBtn()}>
          Salva
        </button>
      </div>
    </div>
  );
}

type News2Inputs = {
  rr: number;
  spo2: number;
  o2: boolean;
  temp: number;
  sbp: number;
  hr: number;
  neuro: "A" | "V" | "P" | "U";
};

function ToolNEWS2({
  last,
  onBack,
  onSave,
  onUpsell,
  onToast,
}: {
  last: UtilityHistoryItem | null;
  onBack: () => void;
  onSave: (item: UtilityHistoryItem) => void;
  onUpsell: (t: string, d: string, bullets?: string[]) => void;
  onToast: (m: string, type?: any) => void;
}) {
  const [rr, setRr] = useState<number>(() => (Number(last?.inputs?.rr) ? Number(last?.inputs?.rr) : 18));
  const [spo2, setSpo2] = useState<number>(() => (Number(last?.inputs?.spo2) ? Number(last?.inputs?.spo2) : 96));
  const [o2, setO2] = useState<boolean>(() => Boolean(last?.inputs?.o2 ?? false));
  const [temp, setTemp] = useState<number>(() => (Number(last?.inputs?.temp) ? Number(last?.inputs?.temp) : 36.8));
  const [sbp, setSbp] = useState<number>(() => (Number(last?.inputs?.sbp) ? Number(last?.inputs?.sbp) : 120));
  const [hr, setHr] = useState<number>(() => (Number(last?.inputs?.hr) ? Number(last?.inputs?.hr) : 80));
  const [neuro, setNeuro] = useState<News2Inputs["neuro"]>(() => ((last?.inputs?.neuro as any) || "A"));

  const score = useMemo(() => {
    const s_rr = rr <= 8 ? 3 : rr <= 11 ? 1 : rr <= 20 ? 0 : rr <= 24 ? 2 : 3;
    const s_sp = spo2 <= 91 ? 3 : spo2 <= 93 ? 2 : spo2 <= 95 ? 1 : 0;
    const s_o2 = o2 ? 2 : 0;
    const s_t = temp <= 35.0 ? 3 : temp <= 36.0 ? 1 : temp <= 38.0 ? 0 : temp <= 39.0 ? 1 : 2;
    const s_bp = sbp <= 90 ? 3 : sbp <= 100 ? 2 : sbp <= 110 ? 1 : sbp <= 219 ? 0 : 3;
    const s_hr = hr <= 40 ? 3 : hr <= 50 ? 1 : hr <= 90 ? 0 : hr <= 110 ? 1 : hr <= 130 ? 2 : 3;
    const s_n = neuro === "A" ? 0 : 3;
    const total = s_rr + s_sp + s_o2 + s_t + s_bp + s_hr + s_n;
    return {
      total,
      parts: { rr: s_rr, spo2: s_sp, o2: s_o2, temp: s_t, sbp: s_bp, hr: s_hr, neuro: s_n },
    };
  }, [rr, spo2, o2, temp, sbp, hr, neuro]);

  const interpretation = useMemo(() => {
    const t = score.total;
    const any3 = Object.values(score.parts).some((v) => v >= 3);

    if (t >= 7) {
      return {
        band: "Alto rischio",
        sev: "avoid" as const,
        action: ["Allerta immediata", "Valuta team di risposta rapida / medico", "Monitoraggio continuo secondo setting"],
      };
    }

    if (t >= 5) {
      return {
        band: "Rischio medio",
        sev: "caution" as const,
        action: ["Valuta revisione medica", "Aumenta frequenza parametri", "Considera cause reversibili"],
      };
    }

    if (any3 || (t >= 1 && t <= 4)) {
      return {
        band: any3 ? "Basso–medio (trigger singolo)" : "Basso rischio",
        sev: "ok" as const,
        action: ["Ripeti parametri a intervalli adeguati", "Osserva trend e sintomi", "Escalation se peggiora"],
      };
    }

    return {
      band: "Molto basso",
      sev: "ok" as const,
      action: ["Monitoraggio di routine", "Documenta e rivaluta se cambia il quadro"],
    };
  }, [score]);

  const premium = isPremium();

  return (
    <ScaleShell
      title="NEWS2"
      subtitle="Inserisci parametri e ottieni punteggio + interpretazione"
      onBack={onBack}
      onSave={() => {
        const item: UtilityHistoryItem = {
          tool: "NEWS2",
          ts: Date.now(),
          inputs: { rr, spo2, o2, temp, sbp, hr, neuro },
          output: `NEWS2: ${score.total} (${interpretation.band})`,
        };
        onSave(item);
        if (isBrowser()) {
          try {
            localStorage.setItem(LS_NEWS2_PREV, JSON.stringify({ score: score.total, ts: Date.now(), band: interpretation.band }));
          } catch {}
        }
        onToast("Salvato", "success");
      }}
    >
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ padding: 12, borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 950 }}>Preset clinici</div>
              <div style={{ opacity: 0.78, fontSize: 12.5, marginTop: 2 }}>Sepsi • Shock • Post-op (poi personalizza)</div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                style={ghostBtn()}
                onClick={() => {
                  setRr(24);
                  setHr(118);
                  setSbp(92);
                  setTemp(38.6);
                  setNeuro("A");
                  setSpo2(93);
                  setO2(true);
                }}
              >
                Sepsi
              </button>
              <button
                type="button"
                style={ghostBtn()}
                onClick={() => {
                  setRr(28);
                  setHr(130);
                  setSbp(80);
                  setTemp(36.4);
                  setNeuro("V");
                  setSpo2(92);
                  setO2(true);
                }}
              >
                Shock
              </button>
              <button
                type="button"
                style={ghostBtn()}
                onClick={() => {
                  setRr(16);
                  setHr(78);
                  setSbp(120);
                  setTemp(36.8);
                  setNeuro("A");
                  setSpo2(96);
                  setO2(false);
                }}
              >
                Post-op
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
          <NumRow label="FR (atti/min)" value={rr} setValue={setRr} />
          <NumRow label="SpO₂ (%)" value={spo2} setValue={setSpo2} />
          <div style={{ gridColumn: "1 / -1" }}>
            <ToggleRow label="O₂ supplementare" value={o2} onChange={setO2} />
          </div>
          <NumRow label="T (°C)" value={temp} setValue={setTemp} step={0.1} />
          <NumRow label="PAS (mmHg)" value={sbp} setValue={setSbp} />
          <NumRow label="FC (bpm)" value={hr} setValue={setHr} />
          <div style={{ gridColumn: "1 / -1" }}>
            <SelectPills
              label="Stato neurologico (AVPU)"
              value={neuro}
              options={[
                { k: "A", t: "A" },
                { k: "V", t: "V" },
                { k: "P", t: "P" },
                { k: "U", t: "U" },
              ]}
              onChange={(v) => setNeuro(v as any)}
            />
          </div>
        </div>

        <div style={{ borderRadius: 16, padding: 14, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
            <div style={{ fontWeight: 950 }}>Punteggio totale</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ fontWeight: 950, fontSize: 20 }}>{score.total}</div>
              <TrendNews2 score={score.total} />
            </div>
          </div>

          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <SeverityPill sev={interpretation.sev} text={interpretation.band} />
            {!premium && (
              <button
                type="button"
                onClick={() =>
                  onUpsell("Interpretazione avanzata", "Sblocca suggerimenti più dettagliati e storico illimitato.", [
                    "Azioni suggerite per setting diversi",
                    "Promemoria monitoraggio",
                    "Template di consegna rapida",
                  ])
                }
                style={ghostBtn()}
              >
                Boost
              </button>
            )}
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 13, opacity: 0.85, fontWeight: 850, marginBottom: 6 }}>Suggerimento azione</div>
            <ul style={{ margin: 0, paddingLeft: 18, opacity: 0.85, fontSize: 13, lineHeight: 1.35 }}>
              {interpretation.action.map((a, idx) => (
                <li key={idx}>{a}</li>
              ))}
            </ul>

            {premium && (
              <div style={{ marginTop: 10, opacity: 0.85, fontSize: 13, lineHeight: 1.35 }}>
                <div style={{ fontWeight: 850, marginBottom: 6 }}>Hint clinici (Premium)</div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  <li>Conta il trend: un NEWS2 “basso” che sale rapidamente merita escalation.</li>
                  <li>Valuta cause frequenti: dolore/ansia, sepsi, ipovolemia, ritenzione CO₂, eventi cardiaci.</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </ScaleShell>
  );
}

function TrendNews2({ score }: { score: number }) {
  const prev = useMemo(() => {
    if (!isBrowser()) return null as null | { score: number; ts: number; band: string };
    return safeJson<{ score: number; ts: number; band: string } | null>(localStorage.getItem(LS_NEWS2_PREV), null);
  }, []);

  if (!prev) return null;
  const delta = score - prev.score;
  const label = delta === 0 ? "stabile" : delta > 0 ? `+${delta}` : `${delta}`;

  return (
    <span
      style={{
        opacity: 0.85,
        fontSize: 12.5,
        fontWeight: 850,
        padding: "4px 8px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.03)",
      }}
    >
      Δ NEWS2: {label}
    </span>
  );
}

function ToolGCS({
  last,
  onBack,
  onSave,
  onToast,
}: {
  last: UtilityHistoryItem | null;
  onBack: () => void;
  onSave: (item: UtilityHistoryItem) => void;
  onToast: (m: string, type?: any) => void;
}) {
  const [eye, setEye] = useState<number>(() => (Number(last?.inputs?.eye) ? Number(last?.inputs?.eye) : 4));
  const [verbal, setVerbal] = useState<number>(() => (Number(last?.inputs?.verbal) ? Number(last?.inputs?.verbal) : 5));
  const [motor, setMotor] = useState<number>(() => (Number(last?.inputs?.motor) ? Number(last?.inputs?.motor) : 6));

  const total = useMemo(() => {
    const e = Number(eye) || 0;
    const v = Number(verbal) || 0;
    const m = Number(motor) || 0;
    return e + v + m;
  }, [eye, verbal, motor]);

  const band = useMemo(() => {
    if (total <= 8) return { t: "Grave", sev: "avoid" as const, note: "Rischio elevato: protezione vie aeree / valutazione urgente." };
    if (total <= 12) return { t: "Moderata", sev: "caution" as const, note: "Valuta monitoraggio stretto e rivalutazioni frequenti." };
    return { t: "Lieve", sev: "ok" as const, note: "Continua osservazione e trend clinico." };
  }, [total]);

  return (
    <ScaleShell
      title="Glasgow Coma Scale"
      subtitle="Seleziona E/V/M e ottieni punteggio + severità"
      onBack={onBack}
      onSave={() => {
        onSave({ tool: "GCS", ts: Date.now(), inputs: { eye, verbal, motor }, output: `GCS: ${total} (${band.t})` });
        onToast("Salvato", "success");
      }}
    >
      <div style={{ display: "grid", gap: 10 }}>
        <SelectPills
          label="Apertura occhi (E)"
          value={String(eye)}
          options={[
            { k: "4", t: "Spontanea (4)" },
            { k: "3", t: "Al richiamo (3)" },
            { k: "2", t: "Al dolore (2)" },
            { k: "1", t: "Nessuna (1)" },
          ]}
          onChange={(v) => setEye(Number(v))}
        />
        <SelectPills
          label="Risposta verbale (V)"
          value={String(verbal)}
          options={[
            { k: "5", t: "Orientato (5)" },
            { k: "4", t: "Confuso (4)" },
            { k: "3", t: "Parole inappropriate (3)" },
            { k: "2", t: "Suoni incomprensibili (2)" },
            { k: "1", t: "Nessuna (1)" },
          ]}
          onChange={(v) => setVerbal(Number(v))}
        />
        <SelectPills
          label="Risposta motoria (M)"
          value={String(motor)}
          options={[
            { k: "6", t: "Obbedisce comandi (6)" },
            { k: "5", t: "Localizza dolore (5)" },
            { k: "4", t: "Ritira al dolore (4)" },
            { k: "3", t: "Flessione anomala (3)" },
            { k: "2", t: "Estensione anomala (2)" },
            { k: "1", t: "Nessuna (1)" },
          ]}
          onChange={(v) => setMotor(Number(v))}
        />

        <div style={{ borderRadius: 16, padding: 14, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
            <div style={{ fontWeight: 950 }}>Punteggio totale</div>
            <div style={{ fontWeight: 950, fontSize: 20 }}>{total}</div>
          </div>

          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <SeverityPill sev={band.sev} text={band.t} />
          </div>

          <div style={{ marginTop: 8, opacity: 0.85, fontSize: 13, lineHeight: 1.35 }}>{band.note}</div>
        </div>
      </div>
    </ScaleShell>
  );
}

function SeverityPill({ sev, text }: { sev: "avoid" | "caution" | "ok"; text: string }) {
  const palette =
    sev === "avoid"
      ? { border: "1px solid rgba(239,68,68,0.30)", bg: "rgba(239,68,68,0.12)", fg: "rgb(220,38,38)" }
      : sev === "caution"
      ? { border: "1px solid rgba(245,158,11,0.32)", bg: "rgba(245,158,11,0.14)", fg: "rgb(217,119,6)" }
      : { border: "1px solid rgba(34,197,94,0.30)", bg: "rgba(34,197,94,0.12)", fg: "rgb(22,163,74)" };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 999,
        border: palette.border,
        background: palette.bg,
        color: palette.fg,
        fontSize: 12,
        fontWeight: 800,
        lineHeight: 1,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: palette.fg,
          boxShadow: "0 0 0 3px rgba(255,255,255,0.06)",
        }}
      />
      {text}
    </span>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <div style={{ fontSize: 13, opacity: 0.9, fontWeight: 850 }}>{label}</div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        style={{
          borderRadius: 999,
          padding: "8px 12px",
          border: "1px solid rgba(255,255,255,0.12)",
          background: value ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.03)",
          cursor: "pointer",
          fontWeight: 900,
          fontSize: 12,
        }}
      >
        {value ? "Sì" : "No"}
      </button>
    </div>
  );
}

function NumRow({
  label,
  value,
  setValue,
  step,
}: {
  label: string;
  value: number;
  setValue: (v: number) => void;
  step?: number;
}) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <div style={{ fontSize: 12.5, opacity: 0.85, fontWeight: 850 }}>{label}</div>
      <input
        inputMode="decimal"
        value={Number.isFinite(value) ? String(value) : ""}
        onChange={(e) => setValue(Number(String(e.target.value).replace(",", ".")))}
        step={step ?? 1}
        type="number"
        style={{
          width: "100%",
          borderRadius: 14,
          padding: "10px 12px",
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.02)",
          color: "inherit",
          fontWeight: 850,
        }}
      />
    </label>
  );
}

function SelectPills({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { k: string; t: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <div style={{ fontSize: 12.5, opacity: 0.85, fontWeight: 850, marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {options.map((o) => {
          const active = o.k === value;
          return (
            <button
              key={o.k}
              type="button"
              onClick={() => onChange(o.k)}
              style={{
                borderRadius: 999,
                padding: "8px 10px",
                border: active ? "1px solid rgba(255,255,255,0.24)" : "1px solid rgba(255,255,255,0.10)",
                background: active ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.02)",
                cursor: "pointer",
                fontWeight: 900,
                fontSize: 12,
              }}
            >
              {o.t}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ghostBtn(): React.CSSProperties {
  return {
    borderRadius: 999,
    padding: "8px 10px",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.02)",
    cursor: "pointer",
    fontWeight: 850,
    fontSize: 12,
  };
}

function primaryBtn(): React.CSSProperties {
  return {
    borderRadius: 14,
    padding: "10px 12px",
    border: "1px solid rgba(255,255,255,0.14)",
    background: "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))",
    cursor: "pointer",
    fontWeight: 900,
  };
}
