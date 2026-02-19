import React, { useMemo, useState } from "react";
import { useToast } from "./Toast";
import { isPremium } from "@/features/profile/premium";
import PremiumUpsellModal from "./PremiumUpsellModal";

const LS = {
  section: "nd_utility_section_v1",
  favs: "nd_utility_favs",
  history: "nd_utility_history_v1",
  interactionsDaily: "nd_utility_interactions_daily_v1",
  infusionsDaily: "nd_utility_infusions_daily_v1",
  news2Prev: "nd_utility_news2_prev_v1",
} as const;

type SectionId = "interactions" | "infusion" | "calculators" | "scales" | "checklists";
type CalcToolId = "mlh" | "gtt" | "mgkgmin" | "map" | "bmi" | "diuresi";
type ScaleToolId = "news2" | "gcs";

type UtilityHistoryItem = {
  tool: string;
  ts: number;
  inputs: Record<string, string | number | boolean>;
  output: string;
};

function safeJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

const isBrowser = () => typeof window !== "undefined" && typeof localStorage !== "undefined";

function dayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function normalize(s: string) {
  return s
    .toLowerCase()
    .trim()
    .normalize("NFD")
    // remove diacritics
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function useDailyLimit(key: string, limit: number) {
  const premium = isPremium();
  const get = () => {
    if (!isBrowser()) return { day: dayKey(), used: 0 };
    return safeJson<{ day: string; used: number }>(localStorage.getItem(key), { day: dayKey(), used: 0 });
  };

  const canUse = () => {
    if (premium) return true;
    const s = get();
    return s.day === dayKey() ? s.used < limit : true;
  };

  const usedLeft = () => {
    if (premium) return Infinity;
    const s = get();
    const used = s.day === dayKey() ? s.used : 0;
    return Math.max(0, limit - used);
  };

  const inc = () => {
    if (premium) return;
    if (!isBrowser()) return;
    const cur = get();
    const next = cur.day === dayKey() ? { day: cur.day, used: cur.used + 1 } : { day: dayKey(), used: 1 };
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {}
  };

  const reset = () => {
    if (!isBrowser()) return;
    try {
      localStorage.setItem(key, JSON.stringify({ day: dayKey(), used: 0 }));
    } catch {}
  };

  return { premium, canUse, usedLeft, inc, reset };
}

const SECTIONS: { id: SectionId; title: string; subtitle: string; badge?: string }[] = [
  { id: "interactions", title: "Interazioni farmacologiche", subtitle: "Controllo rapido e guidato", badge: "TOP" },
  { id: "infusion", title: "Compatibilità infusioni EV", subtitle: "Y-site / flush (ICU-ready)", badge: "ICU" },
  { id: "calculators", title: "Calcolatori clinici", subtitle: "Guidati, con alert (base)" },
  { id: "scales", title: "Scale cliniche", subtitle: "NEWS2 + Glasgow con interpretazione" },
  { id: "checklists", title: "Checklist operative", subtitle: "Procedure step-by-step (in arrivo)" },
];

export default function UtilityHub({ onBack }: { onBack: () => void }) {
  const toast = useToast();

  const [section, setSection] = useState<SectionId | null>(() => {
    if (!isBrowser()) return null;
    return safeJson<SectionId | null>(localStorage.getItem(LS.section), null);
  });

  const [activeCalc, setActiveCalc] = useState<CalcToolId | null>(null);
  const [activeScale, setActiveScale] = useState<ScaleToolId | null>(null);

  const [upsellOpen, setUpsellOpen] = useState(false);
  const [upsellContext, setUpsellContext] = useState<{ title: string; subtitle: string; bullets?: string[] } | null>(null);

  const [history, setHistory] = useState<UtilityHistoryItem[]>(() => {
    if (!isBrowser()) return [];
    return safeJson<UtilityHistoryItem[]>(localStorage.getItem(LS.history), []);
  });

  const lastByTool = useMemo(() => {
    const map = {} as Record<string, UtilityHistoryItem | null>;
    for (const h of history) {
      if (!map[h.tool]) map[h.tool] = h;
    }
    return map;
  }, [history]);

  function pushHistory(item: UtilityHistoryItem) {
    if (!isBrowser()) return;
    setHistory((prev) => {
      const next = [item, ...prev].slice(0, 30);
      try {
        localStorage.setItem(LS.history, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  function goSection(next: SectionId) {
    setSection(next);
    setActiveCalc(null);
    setActiveScale(null);
    if (!isBrowser()) return;
    try {
      localStorage.setItem(LS.section, JSON.stringify(next));
    } catch {}
  }

  function openUpsell(title: string, subtitle: string, bullets?: string[]) {
    setUpsellContext({ title, subtitle, bullets });
    setUpsellOpen(true);
  }

  // NOTE: Nessuna utility genera XP (evita spam classifica)

  return (
    <div>
      {!section && (
        <div>
          <div style={{ display: "grid", gap: 12 }}>
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => goSection(s.id)}
                style={{
                  textAlign: "left",
                  borderRadius: 18,
                  padding: 16,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.025))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  cursor: "pointer",
                 maxWidth: "100%",
                 minWidth: 0,
                 flex: "1 1 220px",
                 textAlign: "left",
                 whiteSpace: "normal",
                 wordBreak: "break-word",
                 lineHeight: 1.2,
                 transition: "transform 100ms ease, background 160ms ease, border-color 160ms ease",
                 willChange: "transform",
                  transition: "transform 120ms ease, border-color 120ms ease, background 120ms ease",
                }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontSize: 16, fontWeight: 850 }}>{s.title}</div>
                    {s.badge && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 850,
                          padding: "3px 8px",
                          borderRadius: 999,
                          border: "1px solid rgba(255,255,255,0.15)",
                          opacity: 0.95,
                        }}>
                        {s.badge}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, opacity: 0.75, marginTop: 4 }}>{s.subtitle}</div>
                </div>

                <div style={{ opacity: 0.55, fontWeight: 900, fontSize: 18 }}>›</div>
              </button>
            ))}
          </div>

          {history.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, opacity: 0.8, fontWeight: 800, marginBottom: 8 }}>Ultimi utilizzi</div>
              <div style={{ display: "grid", gap: 8 }}>
                {Object.entries(lastByTool)
                  .slice(0, 4)
                  .map(([k, h]) =>
                    h ? (
                      <div
                        key={k}
                        style={{
                          borderRadius: 14,
                          padding: 12,
                          border: "1px solid rgba(255,255,255,0.08)",
                          background: "rgba(255,255,255,0.03)",
                        }}>
                        <div style={{ fontWeight: 850, fontSize: 13 }}>{k}</div>
                        <div style={{ opacity: 0.75, fontSize: 12, marginTop: 4 }}>{h.output}</div>
                      </div>
                    ) : null
                  )}
              </div>
            </div>
          )}
        </div>
      )}

      {!!section && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
            <button
              type="button"
              onClick={() => {
                if (activeCalc) return setActiveCalc(null);
                setSection(null);
                if (!isBrowser()) return;
                try {
                  localStorage.removeItem(LS.section);
                } catch {}
              }}
              style={{
                borderRadius: 999,
                padding: "10px 12px",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.025))",
                fontWeight: 850,
                cursor: "pointer",
              }}>
              ← Indietro
            </button>

            <button
              type="button"
              onClick={onBack}
              style={{
                borderRadius: 999,
                padding: "10px 12px",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.025))",
                fontWeight: 850,
                cursor: "pointer",
                opacity: 0.85,
              }}>
              Chiudi
            </button>
          </div>

          {section === "interactions" && <ToolInteractions onSave={pushHistory} onUpsell={openUpsell} />}
          {section === "infusion" && <ToolInfusions onSave={pushHistory} onUpsell={openUpsell} onToast={(m,t)=>toast.push(m,t)} />}
          {section === "scales" && <ToolScales active={activeScale} setActive={setActiveScale} lastByTool={lastByTool} onSave={pushHistory} onUpsell={openUpsell} onToast={(m,t)=>toast.push(m,t)} />}
          {section === "checklists" && <ComingSoon title="Checklist operative" desc="Checklist step-by-step, stampabili e pronte da reparto." onUpsell={openUpsell} />}

          {section === "calculators" && (
            <>
              {!activeCalc ? (
                <div style={{ display: "grid", gap: 10 }}>
                  <CalcCard title="Velocità infusione" subtitle="ml/h da volume e tempo" onClick={() => setActiveCalc("mlh")} />
                  <CalcCard title="Gocce/min" subtitle="Deflussore 20 o 60 gtt" onClick={() => setActiveCalc("gtt")} />
                  <CalcCard title="Dose → ml/h" subtitle="mg/kg/min → ml/h (con concentrazione)" onClick={() => setActiveCalc("mgkgmin")} />
                  <CalcCard title="MAP" subtitle="Pressione arteriosa media" onClick={() => setActiveCalc("map")} />
                  <CalcCard title="BMI" subtitle="Indice di massa corporea" onClick={() => setActiveCalc("bmi")} />
                  <CalcCard title="Diuresi" subtitle="ml/kg/h" onClick={() => setActiveCalc("diuresi")} />
                </div>
              ) : (
                <ToolRenderer id={activeCalc} last={lastByTool[activeCalc] ?? null} onSave={pushHistory} onToast={toast.push} />
              )}
            </>
          )}
        </div>
      )}

      <PremiumUpsellModal
        open={upsellOpen}
        onClose={() => setUpsellOpen(false)}
        context="utility"
        title={upsellContext?.title || "Attiva Boost"}
        subtitle={upsellContext?.subtitle || "Sblocca ricerche illimitate e strumenti avanzati in Utility."}
        bullets={upsellContext?.bullets || ["Ricerche illimitate", "Alternative terapeutiche", "Dettagli clinici avanzati"]}
      />
    </div>
  );
}

function CalcCard({ title, subtitle, onClick }: { title: string; subtitle: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: "left",
        borderRadius: 16,
        padding: 14,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
        cursor: "pointer",
      }}>
      <div style={{ fontWeight: 850 }}>{title}</div>
      <div style={{ fontSize: 13, opacity: 0.75, marginTop: 4 }}>{subtitle}</div>
    </button>
  );
}

function ComingSoon({ title, desc, onUpsell }: { title: string; desc: string; onUpsell: (t: string, d: string) => void }) {
  const premium = isPremium();
  return (
    <div style={{ borderRadius: 18, padding: 16, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
      <div style={{ fontSize: 16, fontWeight: 900 }}>{title}</div>
      <div style={{ fontSize: 13, opacity: 0.8, marginTop: 6 }}>{desc}</div>

      <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, padding: "6px 10px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)", opacity: 0.9 }}>In arrivo</span>
        {!premium && (
          <button
            type="button"
            onClick={() => onUpsell("Utility Premium", "Sblocca strumenti avanzati e dettagli clinici aggiuntivi.")}
            style={{
              borderRadius: 999,
              padding: "8px 12px",
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.06)",
              fontWeight: 900,
              cursor: "pointer",
            }}>
            Sblocca Premium
          </button>
        )}
      </div>
    </div>
  );
}



type News2Inputs = {
  rr: number; // resp rate
  spo2: number;
  o2: boolean;
  temp: number;
  sbp: number;
  hr: number;
  neuro: "A" | "V" | "P" | "U";
};

function ToolScales({
  active,
  setActive,
  lastByTool,
  onSave,
  onUpsell,
  onToast,
}: {
  active: ScaleToolId | null;
  setActive: (id: ScaleToolId | null) => void;
  lastByTool: Record<string, UtilityHistoryItem | null>;
  onSave: (item: UtilityHistoryItem) => void;
  onUpsell: (t: string, d: string, bullets?: string[]) => void;
  onToast: (m: string, type?: any) => void;
}) {
  if (!active) {
    return (
      <div style={{ display: "grid", gap: 10 }}>
        <ScaleCard
          title="NEWS2"
          subtitle="Punteggio + interpretazione automatica"
          badge="CORE"
          onClick={() => setActive("news2")}
        />
        <ScaleCard
          title="Glasgow Coma Scale"
          subtitle="GCS 3–15 con severità"
          badge="NEURO"
          onClick={() => setActive("gcs")}
        />
        <div style={{ marginTop: 6, opacity: 0.75, fontSize: 12, lineHeight: 1.35 }}>
          Nota: questi strumenti sono di supporto operativo. In caso di dubbio o peggioramento clinico, attiva i percorsi locali e confrontati con il medico.
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

  return (
    <ToolGCS
      last={lastByTool["GCS"] || null}
      onBack={() => setActive(null)}
      onSave={onSave}
      onToast={onToast}
    />
  );
}

function ScaleCard({
  title,
  subtitle,
  badge,
  onClick,
}: {
  title: string;
  subtitle: string;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: "left",
        borderRadius: 18,
        padding: 16,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        cursor: "pointer",
        transition: "transform 120ms ease, border-color 120ms ease, background 120ms ease",
      }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 16, fontWeight: 900 }}>{title}</div>
          {badge && (
            <span style={{ fontSize: 11, fontWeight: 900, padding: "3px 8px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.16)", opacity: 0.95 }}>
              {badge}
            </span>
          )}
        </div>
        <div style={{ fontSize: 13, opacity: 0.75, marginTop: 4 }}>{subtitle}</div>
      </div>
      <div style={{ opacity: 0.55, fontWeight: 900, fontSize: 18 }}>›</div>
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
    <div style={{ borderRadius: 18, padding: 16, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 950, fontSize: 15 }}>{title}</div>
          <div style={{ opacity: 0.75, fontSize: 13, marginTop: 4 }}>{subtitle}</div>
        </div>

        <button type="button" onClick={onBack} style={ghostBtn()}>
          Indietro
        </button>
      </div>

      <div style={{ marginTop: 12 }}>{children}</div>

      <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
        <button type="button" onClick={onSave} style={primaryBtn(false)}>
          Salva
        </button>
      </div>
    </div>
  );
}

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
  const [rr, setRr] = useState<number>(() => (last?.inputs?.rr as number) || 18);
  const [spo2, setSpo2] = useState<number>(() => (last?.inputs?.spo2 as number) || 96);
  const [o2, setO2] = useState<boolean>(() => Boolean((last?.inputs?.o2 as boolean) || false));
  const [temp, setTemp] = useState<number>(() => (last?.inputs?.temp as number) || 36.8);
  const [sbp, setSbp] = useState<number>(() => (last?.inputs?.sbp as number) || 120);
  const [hr, setHr] = useState<number>(() => (last?.inputs?.hr as number) || 80);
  const [neuro, setNeuro] = useState<News2Inputs["neuro"]>(() => ((last?.inputs?.neuro as any) || "A"));

  const score = useMemo(() => {
    const s_rr = rr <= 8 ? 3 : rr <= 11 ? 1 : rr <= 20 ? 0 : rr <= 24 ? 2 : 3;
    const s_sp = spo2 <= 91 ? 3 : spo2 <= 93 ? 2 : spo2 <= 95 ? 1 : 0;
    const s_o2 = o2 ? 2 : 0;
    const s_t = temp <= 35.0 ? 3 : temp <= 36.0 ? 1 : temp <= 38.0 ? 0 : temp <= 39.0 ? 1 : 2;
    const s_bp = sbp <= 90 ? 3 : sbp <= 100 ? 2 : sbp <= 110 ? 1 : sbp <= 219 ? 0 : 3;
    const s_hr = hr <= 40 ? 3 : hr <= 50 ? 1 : hr <= 90 ? 0 : hr <= 110 ? 1 : hr <= 130 ? 2 : 3;
    const s_n = neuro === "A" ? 0 : 3;

    return {
      total: s_rr + s_sp + s_o2 + s_t + s_bp + s_hr + s_n,
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
      return { band: "Rischio medio", sev: "caution" as const, action: ["Valuta revisione medica", "Aumenta frequenza parametri", "Considera cause reversibili"] };
    }
    if (any3 || (t >= 1 && t <= 4)) {
      return { band: any3 ? "Basso–medio (trigger singolo)" : "Basso rischio", sev: "ok" as const, action: ["Ripeti parametri a intervalli adeguati", "Osserva trend e sintomi", "Escalation se peggiora"] };
    }
    return { band: "Molto basso", sev: "ok" as const, action: ["Monitoraggio di routine", "Documenta e rivaluta se cambia il quadro"] };
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
        try { localStorage.setItem(LS.news2Prev, JSON.stringify({ score, ts: Date.now(), band: interpretation.band })); } catch {}
        onToast("Salvato", "success");
      }}>
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ padding: 12, borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 950 }}>Preset clinici</div>
              <div style={{ opacity: 0.78, fontSize: 12.5, marginTop: 2 }}>Sepsi • Shock • Post-op (poi personalizza)</div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" style={ghostBtn()} onClick={() => { setRr(24); setHr(118); setSbp(92); setTemp(38.6); setNeuro("A"); setSpo2(93); setO2(true); }}>Sepsi</button>
              <button type="button" style={ghostBtn()} onClick={() => { setRr(28); setHr(130); setSbp(80); setTemp(36.4); setNeuro("V"); setSpo2(92); setO2(true); }}>Shock</button>
              <button type="button" style={ghostBtn()} onClick={() => { setRr(16); setHr(78); setSbp(120); setTemp(36.8); setNeuro("A"); setSpo2(96); setO2(false); }}>Post-op</button>
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
            <div style={{ fontWeight: 950 }}>Punteggio totale</div>
            <div style={{ fontWeight: 950, fontSize: 20 }}>{score.total}</div>
          </div>

          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 10px",
                borderRadius: 999,
                border:
                  interpretation.sev === "avoid"
                    ? "1px solid rgba(239, 68, 68, 0.30)"
                    : interpretation.sev === "caution"
                    ? "1px solid rgba(245, 158, 11, 0.32)"
                    : "1px solid rgba(34, 197, 94, 0.30)",
                background:
                  interpretation.sev === "avoid"
                    ? "rgba(239, 68, 68, 0.12)"
                    : interpretation.sev === "caution"
                    ? "rgba(245, 158, 11, 0.14)"
                    : "rgba(34, 197, 94, 0.12)",
                color:
                  interpretation.sev === "avoid"
                    ? "rgb(220, 38, 38)"
                    : interpretation.sev === "caution"
                    ? "rgb(217, 119, 6)"
                    : "rgb(22, 163, 74)",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 0.2,
                lineHeight: 1,
              }}>
              <span
                aria-hidden
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background:
                    interpretation.sev === "avoid"
                      ? "rgb(220, 38, 38)"
                      : interpretation.sev === "caution"
                      ? "rgb(217, 119, 6)"
                      : "rgb(22, 163, 74)",
                  boxShadow: "0 0 0 3px rgba(255,255,255,0.06)",
                }}
                />
              {interpretation.band}
            </span>
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
              {interpretation.action.map((a, i) => (
                <li key={i}>{a}</li>
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
    return safeJson<{ score: number; ts: number; band: string } | null>(localStorage.getItem(LS.news2Prev), null);
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
      }}>
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
  const [eye, setEye] = useState<number>(() => (last?.inputs?.eye as number) || 4);
  const [verbal, setVerbal] = useState<number>(() => (last?.inputs?.verbal as number) || 5);
  const [motor, setMotor] = useState<number>(() => (last?.inputs?.motor as number) || 6);

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
      }}>
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
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 10px",
                borderRadius: 999,
                border:
                  band.sev === "avoid"
                    ? "1px solid rgba(239, 68, 68, 0.30)"
                    : band.sev === "caution"
                    ? "1px solid rgba(245, 158, 11, 0.32)"
                    : "1px solid rgba(34, 197, 94, 0.30)",
                background:
                  band.sev === "avoid"
                    ? "rgba(239, 68, 68, 0.12)"
                    : band.sev === "caution"
                    ? "rgba(245, 158, 11, 0.14)"
                    : "rgba(34, 197, 94, 0.12)",
                color:
                  band.sev === "avoid"
                    ? "rgb(220, 38, 38)"
                    : band.sev === "caution"
                    ? "rgb(217, 119, 6)"
                    : "rgb(22, 163, 74)",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 0.2,
                lineHeight: 1,
              }}>
              <span
                aria-hidden
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background:
                    band.sev === "avoid"
                      ? "rgb(220, 38, 38)"
                      : band.sev === "caution"
                      ? "rgb(217, 119, 6)"
                      : "rgb(22, 163, 74)",
                  boxShadow: "0 0 0 3px rgba(255,255,255,0.06)",
                }}
                />
              {band.t}
            </span>
          </div>
          <div style={{ marginTop: 8, opacity: 0.85, fontSize: 13, lineHeight: 1.35 }}>{band.note}</div>
        </div>
      </div>
    </ScaleShell>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 10 }}>
      <div style={{ fontWeight: 850, opacity: 0.9 }}>{label}</div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        style={{
          borderRadius: 999,
          padding: "8px 12px",
          border: "1px solid rgba(255,255,255,0.12)",
          background: value ? "rgba(34,197,94,0.18)" : "rgba(255,255,255,0.03)",
          color: "inherit",
          fontWeight: 900,
          cursor: "pointer",
          minWidth: 92,
          textAlign: "center",
        }}>
        {value ? "Sì" : "No"}
      </button>
    </div>
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
      <div style={{ fontWeight: 850, opacity: 0.9 }}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
        {options.map((o) => {
          const active = o.k === value;
          return (
            <button
              key={o.k}
              type="button"
              onClick={() => onChange(o.k)}
              style={{
                padding: "8px 10px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.12)",
                background: active ? "rgba(59,130,246,0.18)" : "rgba(255,255,255,0.03)",
                color: "inherit",
                fontSize: 12.5,
                fontWeight: 850,
                cursor: "pointer",
              }}>
              {o.t}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * ==========================
 * Compatibilità infusioni EV (ICU-ready)
 * ==========================
 * Disclaimer: strumento di supporto/educativo. Verifica sempre protocolli locali, RCP/SmPC e condizioni del paziente.
 */
function ToolInfusions({
  onSave,
  onUpsell,
  onToast,
}: {
  onSave: (item: UtilityHistoryItem) => void;
  onUpsell: (t: string, d: string, bullets?: string[]) => void;
  onToast: (m: string, type?: any) => void;
}) {
  type Sev = "ok" | "caution" | "avoid";
  type Compat = { with: string; sev: Sev; note: string; flush?: boolean; advanced?: string[] };
  type Drug = { id: string; name: string; class: string; also?: string[]; compat: Compat[] };

  const premium = isPremium();
  const limit = useDailyLimit(LS.infusionsDaily, 5); // free: 5 controlli/die

  const DB: Drug[] = [
    { id: "noradrenalina", name: "Noradrenalina", class: "Vasopressori", also: ["Norepinefrina"], compat: [
      { with: "propofol", sev: "avoid", note: "Emulsione lipidica: evitare Y-site. Linea dedicata.", flush: true, advanced: ["Preferire linea dedicata per vasopressori", "Evita Y-site con emulsioni lipidiche"] },
      { with: "midazolam", sev: "caution", note: "Compatibilità variabile: preferisci linea dedicata o flush prima/dopo.", flush: true, advanced: ["Osserva torbidità/precipitati", "Riduci co-infusione"] },
      { with: "fentanil", sev: "ok", note: "Spesso compatibile in Y-site a concentrazioni comuni.", advanced: ["Sorveglia integrità linea/filtri"] },
      { with: "amiodarone", sev: "avoid", note: "Amiodarone spesso richiede linea dedicata. Evitare co-infusione.", flush: true, advanced: ["Preferire linea dedicata"] },
    ]},
    { id: "amiodarone", name: "Amiodarone", class: "Anti-aritmici", compat: [
      { with: "noradrenalina", sev: "avoid", note: "Preferire linea dedicata.", flush: true },
      { with: "midazolam", sev: "caution", note: "Compatibilità variabile: flush consigliato.", flush: true },
      { with: "propofol", sev: "avoid", note: "Emulsione lipidica: evitare Y-site.", flush: true },
    ]},
    { id: "midazolam", name: "Midazolam", class: "Sedativi", compat: [
      { with: "propofol", sev: "avoid", note: "Emulsione lipidica: evitare Y-site.", flush: true },
      { with: "fentanil", sev: "ok", note: "Spesso compatibile." },
      { with: "noradrenalina", sev: "caution", note: "Compatibilità variabile: preferire flush.", flush: true },
    ]},
    { id: "propofol", name: "Propofol", class: "Sedativi", compat: [
      { with: "noradrenalina", sev: "avoid", note: "Emulsione lipidica: linea dedicata.", flush: true },
      { with: "fentanil", sev: "avoid", note: "Emulsione lipidica: evitare Y-site.", flush: true },
      { with: "midazolam", sev: "avoid", note: "Emulsione lipidica: evitare Y-site.", flush: true },
    ]},
    { id: "fentanil", name: "Fentanil", class: "Oppioidi", compat: [
      { with: "noradrenalina", sev: "ok", note: "Spesso compatibile." },
      { with: "midazolam", sev: "ok", note: "Spesso compatibile." },
      { with: "propofol", sev: "avoid", note: "Propofol: evitare Y-site.", flush: true },
    ]},
    { id: "bicarbonato", name: "Bicarbonato di sodio", class: "Elettroliti", compat: [
      { with: "noradrenalina", sev: "avoid", note: "Rischio incompatibilità/precipitazioni con molte soluzioni. Linea dedicata.", flush: true },
    ]},
  ];

  function allIndex(d: Drug) {
    const names = [d.name, ...(d.also || [])];
    return names.join(" ");
  }

  const [q1, setQ1] = useState("");
  const [q2, setQ2] = useState("");
  const [a, setA] = useState<Drug | null>(null);
  const [b, setB] = useState<Drug | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [outcome, setOutcome] = useState<{ sev: Sev; title: string; note: string; flush: boolean; advanced: string[] } | null>(null);

  const results1 = useMemo(() => {
    const q = normalize(q1);
    if (!q) return DB.slice(0, 8);
    return DB.filter((d) => normalize(allIndex(d)).includes(q)).slice(0, 10);
  }, [q1]);

  const results2 = useMemo(() => {
    const q = normalize(q2);
    if (!q) return DB.slice(0, 8);
    return DB.filter((d) => normalize(allIndex(d)).includes(q)).slice(0, 10);
  }, [q2]);

  function lookup(aId: string, bId: string): Compat | null {
    const da = DB.find((x) => x.id === aId);
    const db = DB.find((x) => x.id === bId);
    if (!da || !db) return null;
    return da.compat.find((c) => c.with === bId) || db.compat.find((c) => c.with === aId) || null;
  }

  function confirm() {
    if (!a || !b) return;

    if (!limit.canUse()) {
      onUpsell(
        "Compatibilità infusioni EV — limite raggiunto",
        "Nel piano Free puoi fare fino a 5 controlli al giorno. Con Premium hai accesso illimitato e dettagli avanzati.",
        ["Illimitato", "Dettagli avanzati", "Database ampliato"]
      );
      return;
    }

    const hit = lookup(a.id, b.id);
    limit.inc();

    if (!hit) {
      setOutcome({
        sev: "caution",
        title: "Attenzione",
        note: "Nessun dato specifico nel database locale. Usa linea dedicata o flush e verifica fonti ufficiali/protocolli ICU.",
        flush: true,
        advanced: premium ? ["Preferire linea dedicata se farmaci ad alto rischio", "Osserva precipitati/torbidità", "Compatibilità dipende da diluente e concentrazione"] : [],
      });
    } else {
      setOutcome({
        sev: hit.sev,
        title: hit.sev === "avoid" ? "Evitare" : hit.sev === "caution" ? "Attenzione" : "Compatibile",
        note: hit.note,
        flush: !!hit.flush,
        advanced: premium ? hit.advanced || [] : [],
      });
    }
    setStep(3);
  }

  const Pill = ({ sev, text }: { sev: Sev; text: string }) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 999, border: sev === "avoid" ? "1px solid rgba(239,68,68,0.30)" : sev === "caution" ? "1px solid rgba(245,158,11,0.32)" : "1px solid rgba(34,197,94,0.30)", background: sev === "avoid" ? "rgba(239,68,68,0.12)" : sev === "caution" ? "rgba(245,158,11,0.14)" : "rgba(34,197,94,0.12)", color: sev === "avoid" ? "rgb(220,38,38)" : sev === "caution" ? "rgb(217,119,6)" : "rgb(22,163,74)", fontSize: 12, fontWeight: 850, lineHeight: 1 }}>
      <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: sev === "avoid" ? "rgb(220,38,38)" : sev === "caution" ? "rgb(217,119,6)" : "rgb(22,163,74)" }} />
      {text}
    </span>
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 950 }}>Compatibilità infusioni EV</div>
          <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>Y-site / flush • Step {step} di 3 • {limit.premium ? "Premium" : `${limit.usedLeft()}/5 controlli disponibili oggi`}</div>
        </div>
        <button type="button" onClick={() => onUpsell("Compatibilità infusioni EV — ICU", "Con Premium sblocchi dettagli avanzati e database ampliato.", ["Dettagli avanzati", "Database più ampio"])} style={ghostBtn()}>
          ICU Boost
        </button>
      </div>

      {step === 1 && (
        <StepPick
          title="Step 1 — Seleziona infusione A"
          query={q1}
          setQuery={setQ1}
          results={results1.map((d) => ({ e: d, label: `${d.name} • ${d.class}` }))}
          onPick={(e) => { setA(e as any); setStep(2); setQ2(""); setB(null); }
        />
      )}

      {step === 2 && (
        <StepPick
          title="Step 2 — Seleziona infusione B"
          query={q2}
          setQuery={setQ2}
          results={results2.map((d) => ({ e: d, label: `${d.name} • ${d.class}` }))}
          onPick={(e) => setB(e as any)}
          footer={
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
              <button type="button" onClick={() => { setStep(1); setQ2(""); setB(null); }} style={ghostBtn()}>
                ← Cambia infusione A
              </button>
              <button type="button" onClick={confirm} disabled={!a || !b} style={primaryBtn(!a || !b)}>
                Verifica compatibilità
              </button>
            </div>
          }}
                />
      )}

      {step === 3 && outcome && a && b && (
        <div style={{ borderRadius: 18, padding: 16, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 950, fontSize: 15 }}>{a.name} + {b.name}</div>
              <div style={{ opacity: 0.75, marginTop: 4, fontSize: 13 }}>{a.class} • {b.class}</div>
            </div>
            <Pill sev={outcome.sev} text={outcome.title} />
          </div>

          <div style={{ marginTop: 10, fontSize: 13.5, lineHeight: 1.35, opacity: 0.95 }}>{outcome.note}</div>

          {outcome.flush && (
            <div style={{ marginTop: 10, padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(245,158,11,0.08)" }}>
              <div style={{ fontWeight: 900 }}>Flush consigliato</div>
              <div style={{ marginTop: 6, fontSize: 13, opacity: 0.9 }}>Se non puoi usare linea dedicata: flush prima/dopo e riduci co-infusione di farmaci ad alto rischio.</div>
            </div>
          )}

          {premium && outcome.advanced?.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 900, marginBottom: 6 }}>Dettagli avanzati (Premium)</div>
              <ul style={{ margin: 0, paddingLeft: 18, opacity: 0.9, lineHeight: 1.35 }}>
                {outcome.advanced.map((x) => <li key={x}>{x}</li>)}
              </ul>
            </div>
          )}

          {!premium && (
            <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <button type="button" onClick={() => onUpsell("Dettagli avanzati infusioni", "Sblocca dettagli avanzati e database ampliato.", ["Dettagli avanzati", "Database ampliato"])} style={ghostBtn()}>
                Sblocca dettagli
              </button>
              <button type="button" onClick={() => { setStep(1); setOutcome(null); setA(null); setB(null); setQ1(""); setQ2(""); }} style={primaryBtn(false)}>
                Nuovo controllo
              </button>
            </div>
          )}

          <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
            <button type="button" onClick={() => { setStep(2); setOutcome(null); }} style={ghostBtn()}>
              ← Modifica scelta
            </button>
            <button type="button" onClick={() => { onSave({ tool: "INFUSION", ts: Date.now(), inputs: { a: a.id, b: b.id }, output: `${a.name} + ${b.name}: ${outcome.title}${outcome.flush ? " (flush)" : ""}` }); onToast("Salvato in storico", "success"); }} style={primaryBtn(false)}>
              Salva
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


/**
 * ==========================
 * Interazioni farmacologiche
 * ==========================
 * Disclaimer: strumento educativo / supporto in reparto, non sostituisce RCP/SmPC o giudizio clinico.
 */
function ToolInteractions({ onSave, onUpsell }: { onSave: (item: UtilityHistoryItem) => void; onUpsell: (t: string, d: string) => void }) {
  type Severity = "ok" | "caution" | "avoid";
  type Interaction = {
    key: string; // other drug id or group key
    sev: Severity;
    why: string;
    monitor?: string[];
    alternatives?: string[]; // premium-only
  };

  type Entry = {
    id: string;
    name: string;
    group: string;
    also?: string[];
    interactions: Interaction[];
  };

  // DB locale “medium”: abbastanza per value percepito + estensibile Patch B
  const DB: Entry[] = [
    {
      id: "warfarin",
      name: "Warfarin",
      group: "Anticoagulanti",
      also: ["Coumadin"],
      interactions: [
        { key: "fans", sev: "avoid", why: "Aumenta rischio emorragico (effetto su coagulazione + mucosa gastrica).", monitor: ["Valuta gastroprotezione", "Controlla segni di sanguinamento", "INR più frequente"], alternatives: ["Paracetamolo (se appropriato)", "Valuta COX-2 selettivo con prudenza"] },
        { key: "macrolidi", sev: "avoid", why: "Possibile aumento INR (inibizione metabolismo).", monitor: ["INR stretto 48–72h", "Valuta riduzione dose"], alternatives: ["Doxiciclina (se indicata)", "Azitromicina spesso meno impattante ma non sempre"] },
        { key: "amiodarone", sev: "avoid", why: "Aumenta INR: spesso serve riduzione dose e monitoraggio stretto.", monitor: ["INR frequente", "Valuta riduzione dose"], alternatives: ["Valuta DOAC se indicato e non controindicato (decisione medico)"] },
        { key: "ssri", sev: "caution", why: "Rischio sanguinamento aumentato (effetto piastrinico).", monitor: ["Valuta rischio/beneficio", "Educazione segni emorragia"] },
      ],
    },
    {
      id: "amiodarone",
      name: "Amiodarone",
      group: "Anti-aritmici",
      interactions: [
        { key: "qt", sev: "avoid", why: "Somma rischio QT lungo/Torsione di punta.", monitor: ["ECG", "K/Mg", "Monitoraggio ritmo"], alternatives: ["Valuta alternativa non QT-prolungante (decisione medico)"] },
        { key: "warfarin", sev: "avoid", why: "Aumenta INR per inibizione metabolismo.", monitor: ["INR stretto", "Aggiusta dose"], alternatives: ["Valuta DOAC se indicato (decisione medico)"] },
        { key: "beta", sev: "caution", why: "Bradicardia e blocchi AV (effetto additivo).", monitor: ["FC/PA", "ECG se sintomi"] },
      ],
    },
    {
      id: "claritromicina",
      name: "Claritromicina",
      group: "Macrolidi",
      also: ["Macrolidi"],
      interactions: [
        { key: "cyp3a4", sev: "avoid", why: "Inibitore CYP3A4: aumenta livelli di molti farmaci.", monitor: ["Valuta interazioni specifiche", "Sorveglia tossicità"], alternatives: ["Azitromicina (minor inibizione)", "Doxiciclina (se indicata)"] },
        { key: "qt", sev: "avoid", why: "Rischio QT lungo.", monitor: ["ECG se rischio elevato", "Correggi elettroliti"] },
      ],
    },
    {
      id: "metoprololo",
      name: "Metoprololo",
      group: "Beta-bloccanti",
      also: ["Betabloccanti"],
      interactions: [
        { key: "calcio", sev: "caution", why: "Somma effetto su conduzione/FC (rischio bradicardia/ipotensione).", monitor: ["FC/PA", "ECG se sintomi"] },
        { key: "amiodarone", sev: "caution", why: "Bradicardia/blocco AV (effetto additivo).", monitor: ["FC/PA", "ECG"] },
      ],
    },
    {
      id: "verapamil",
      name: "Verapamil",
      group: "Calcio-antagonisti",
      also: ["Calcioantagonisti"],
      interactions: [
        { key: "beta", sev: "avoid", why: "Somma effetto su nodo AV → bradicardia/blocco AV.", monitor: ["FC/PA", "ECG"] , alternatives: ["Diltiazem (non sempre migliore)", "Valuta altra strategia (decisione medico)"]},
        { key: "cyp3a4", sev: "caution", why: "Substrato/inibitore: possibile aumento livelli di farmaci co-somministrati.", monitor: ["Sorveglia effetti"] },
      ],
    },
    {
      id: "sertralina",
      name: "Sertralina",
      group: "SSRI",
      interactions: [
        { key: "warfarin", sev: "caution", why: "Rischio sanguinamento aumentato (piastrine).", monitor: ["Sorveglia sanguinamenti", "Valuta INR se variabilità"] },
        { key: "linezolid", sev: "avoid", why: "Rischio sindrome serotoninergica.", monitor: ["Ipertermia, rigidità, agitazione"], alternatives: ["Valuta alternativa antibiotica (decisione medico)", "Sospensione SSRI se indicata e pianificata"] },
      ],
    },

    // chiavi di gruppo “virtuali” (non selezionabili) usate come regole
    { id: "fans", name: "FANS (gruppo)", group: "GRP", interactions: [] },
    { id: "qt", name: "Farmaci QT-prolunganti (gruppo)", group: "GRP", interactions: [] },
    { id: "cyp3a4", name: "Substrati CYP3A4 (gruppo)", group: "GRP", interactions: [] },
    { id: "beta", name: "Beta-bloccanti (gruppo)", group: "GRP", interactions: [] },
    { id: "calcio", name: "Calcio-antagonisti (gruppo)", group: "GRP", interactions: [] },
    { id: "macrolidi", name: "Macrolidi (gruppo)", group: "GRP", interactions: [] },
    { id: "linezolid", name: "Linezolid", group: "Antibiotici", interactions: [] },
  ];

  const limit = useDailyLimit(LS.interactionsDaily, 3);
  const toast = useToast();

  const selectable = useMemo(() => DB.filter((e) => e.group !== "GRP"), []);
  const byId = useMemo(() => {
    const m = new Map<string, Entry>();
    for (const e of DB) m.set(e.id, e);
    return m;
  }, []);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [q1, setQ1] = useState("");
  const [q2, setQ2] = useState("");
  const [a, setA] = useState<Entry | null>(null);
  const [b, setB] = useState<Entry | null>(null);

  const results1 = useMemo(() => searchDrugs(selectable, q1), [selectable, q1]);
  const results2 = useMemo(() => searchDrugs(selectable, q2), [selectable, q2]);

  const outcome = useMemo(() => {
    if (!a || !b) return null;

    // match rules either direction
    const match = (x: Entry, y: Entry) => {
      const keys = new Set<string>([y.id, normalize(y.group)]);
      const also = (y.also || []).map((s) => normalize(s));
      for (const s of also) keys.add(s);

      for (const r of x.interactions) {
        if (keys.has(r.key) || keys.has(normalize(r.key))) return r;
        // allow group keys like "beta", "qt" etc: match by group name too
        const ry = byId.get(r.key);
        if (ry && (ry.id === y.id || normalize(ry.name) === normalize(y.name))) return r;
      }
      return null;
    };

    const r1 = match(a, b);
    const r2 = match(b, a);
    const worst = pickWorst(r1, r2);

    if (!worst) {
      return {
        sev: "ok" as Severity,
        title: "Compatibile",
        why: "Nessuna interazione clinicamente rilevante presente nel database locale per questa coppia.",
        monitor: ["Monitoraggio clinico standard"],
        alternatives: [] as string[],
      };
    }

    return {
      sev: worst.sev,
      title: worst.sev === "avoid" ? "Evitare" : worst.sev === "caution" ? "Attenzione" : "Compatibile",
      why: worst.why,
      monitor: worst.monitor?.length ? worst.monitor : ["Valuta monitoraggio clinico/strumentale in base al paziente"],
      alternatives: worst.alternatives || [],
    };
  }, [a, b, byId]);

  function resetAll() {
    setStep(1);
    setQ1("");
    setQ2("");
    setA(null);
    setB(null);
  }

  function confirm() {
    if (!a || !b || !outcome) return;

    if (!limit.canUse()) {
      toast.push("Limite raggiunto", "warning");
      onUpsell("Sblocca ricerche illimitate", "Hai esaurito le 3 ricerche gratuite di oggi. Con Premium hai ricerche illimitate e alternative terapeutiche.");
      return;
    }

    limit.inc();

    onSave({
      tool: "Interazioni farmacologiche",
      ts: Date.now(),
      inputs: { farmaco1: a.name, farmaco2: b.name },
      output: `${a.name} + ${b.name}: ${outcome.title}`,
    });

    setStep(3);
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ borderRadius: 18, padding: 14, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
        <div style={{ fontSize: 14, fontWeight: 900 }}>Modalità guidata</div>
        <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>Step {step} di 3 • {limit.premium ? "Premium" : `${limit.usedLeft()}/3 ricerche disponibili oggi`}</div>
      </div>

      {step === 1 && (
        <StepPick
          title="Step 1 — Seleziona farmaco 1"
          query={q1}
          setQuery={setQ1}
          results={results1}
          onPick={(e) => {
            setA(e);
            setStep(2);
            setQ2("");
            setB(null);
          }}
                />
      )}

      {step === 2 && (
        <StepPick
          title="Step 2 — Seleziona farmaco 2"
          query={q2}
          setQuery={setQ2}
          results={results2}
          onPick={(e) => setB(e)}
          footer={
            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setQ2("");
                  setB(null);
                }}
                style={ghostBtn()}
              >
                ← Cambia farmaco 1
              </button>

              <button
                type="button"
                onClick={confirm}
                disabled={!a || !b}
                style={primaryBtn(!a || !b)}
              >
                Verifica interazione
              </button>
            </div>
          }}
                />
      )}

      {step === 3 && outcome && a && b && (
        <div style={{ borderRadius: 18, padding: 16, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div>
              <div style={{ fontWeight: 950, fontSize: 15 }}>{a.name} + {b.name}</div>
              <div style={{ opacity: 0.75, marginTop: 4, fontSize: 13 }}>{a.group} • {b.group}</div>
            </div>

            <span style={sevPill(outcome.sev)}>{outcome.title}</span>
          </div>

          <div style={{ marginTop: 12, fontSize: 13, opacity: 0.9, lineHeight: 1.35 }}>{outcome.why}</div>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 900, marginBottom: 6 }}>Monitoraggio consigliato</div>
            <ul style={{ margin: 0, paddingLeft: 18, opacity: 0.85, fontSize: 13 }}>
              {outcome.monitor.map((m, i) => <li key={i} style={{ marginBottom: 4 }}>{m}</li>)}
            </ul>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 900, marginBottom: 6 }}>Alternative terapeutiche</div>
            {limit.premium ? (
              <div style={{ fontSize: 13, opacity: 0.85 }}>
                {outcome.alternatives.length ? (
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {outcome.alternatives.map((x, i) => <li key={i} style={{ marginBottom: 4 }}>{x}</li>)}
                  </ul>
                ) : (
                  <div style={{ opacity: 0.8 }}>Nessuna alternativa specifica presente per questa coppia. Valuta strategie alternative caso per caso.</div>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontSize: 13, opacity: 0.75 }}>Disponibile con Premium (ricerche illimitate + alternative).</div>
                <button type="button" onClick={() => onUpsell("Sblocca Alternative", "Con Premium vedi alternative terapeutiche e dettagli avanzati.")} style={ghostBtn()}>
                  Sblocca
                </button>
              </div>
            )}
          </div>

          <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" onClick={resetAll} style={ghostBtn()}>Nuova ricerca</button>
            {!limit.premium && (
              <button type="button" onClick={() => onUpsell("Ricerche illimitate", "Con Premium ricerche illimitate e contenuti avanzati in Utility.")} style={ghostBtn()}>
                Passa a Premium
              </button>
            )}
          </div>
        </div>
      )}

      <div style={{ opacity: 0.6, fontSize: 12 }}>
        Nota: database locale educazionale. In caso di dubbio, verifica su fonti ufficiali e considera condizioni del paziente.
      </div>
    </div>
  );
}

function StepPick({
  title,
  query,
  setQuery,
  results,
  onPick,
  footer,
}: {
  title: string;
  query: string;
  setQuery: (v: string) => void;
  results: { e: any; label: string }[];
  onPick: (e: any) => void;
  footer?: React.ReactNode;
}) {
  return (
    <div style={{ borderRadius: 18, padding: 16, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
      <div style={{ fontSize: 14, fontWeight: 900 }}>{title}</div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Cerca farmaco…"
        style={{
          width: "100%",
          marginTop: 10,
          borderRadius: 14,
          padding: "12px 12px",
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(0,0,0,0.15)",
          outline: "none",
        }}
                />

      <div style={{ marginTop: 10, display: "grid", gap: 8, maxHeight: 320, overflow: "auto" }}>
        {results.slice(0, 20).map((r, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onPick(r.e)}
            style={{
              textAlign: "left",
              borderRadius: 14,
              padding: 12,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.02)",
              cursor: "pointer",
            }}>
            <div style={{ fontWeight: 900, fontSize: 13 }}>{r.e.name}</div>
            <div style={{ opacity: 0.75, fontSize: 12, marginTop: 3 }}>{r.label}</div>
          </button>
        ))}
      </div>

      {footer}
    </div>
  );
}

function searchDrugs(list: { id: string; name: string; group: string; also?: string[] }[], q: string) {
  const nq = normalize(q);
  if (!nq) {
    return list
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((e) => ({ e, label: e.group }));
  }

  const scored = list.map((e) => {
    const hay = [e.name, e.group, ...(e.also || [])].map(normalize).join(" | ");
    let score = 0;

    // strong matches
    if (hay.startsWith(nq)) score += 100;
    if (hay.includes(nq)) score += 60;

    // token matches
    for (const t of nq.split(" ")) {
      if (!t) continue;
      if (hay.includes(t)) score += 15;
    }

    // slight bonus for shorter distance to start
    const idx = hay.indexOf(nq);
    if (idx >= 0) score += Math.max(0, 20 - idx);

    return { e, score, label: e.group + (e.also?.length ? ` • alias: ${e.also.join(", ")}` : "") };
  });

  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.e.name.localeCompare(b.e.name))
    .map(({ e, label }) => ({ e, label }));
}

function pickWorst(
  a: { sev: "ok" | "caution" | "avoid"; why?: string; monitor?: string[]; alternatives?: string[] } | null,
  b: { sev: "ok" | "caution" | "avoid"; why?: string; monitor?: string[]; alternatives?: string[] } | null
) {
  const rank = (s: "ok" | "caution" | "avoid") => (s === "avoid" ? 2 : s === "caution" ? 1 : 0);
  if (!a && !b) return null;
  if (a && !b) return a;
  if (!a && b) return b;
  return rank(a!.sev) >= rank(b!.sev) ? a! : b!;
}

function sevPill(sev: "ok" | "caution" | "avoid") {
  const base: React.CSSProperties = { fontSize: 12, fontWeight: 950, padding: "6px 10px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.16)" };
  if (sev === "avoid") return { ...base, background: "rgba(255,0,0,0.14)" };
  if (sev === "caution") return { ...base, background: "rgba(255,165,0,0.12)" };
  return { ...base, background: "rgba(0,255,120,0.10)" };
}

function primaryBtn(disabled: boolean): React.CSSProperties {
  return {
    borderRadius: 999,
    padding: "10px 14px",
    border: "1px solid rgba(255,255,255,0.14)",
    background: disabled ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.10)",
    fontWeight: 950,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
  };
}

function ghostBtn(): React.CSSProperties {
  return {
    borderRadius: 999,
    padding: "10px 14px",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.025))",
    fontWeight: 900,
    cursor: "pointer",
  };
}

/**
 * ======================
 * Calcolatori (base)
 * ======================
 * Manteniamo i tool esistenti (Patch B li renderà “smart” in step successivo)
 */
function ToolRenderer({
  id,
  last,
  onSave,
  onToast,
}: {
  id: CalcToolId;
  last: UtilityHistoryItem | null;
  onSave: (item: UtilityHistoryItem) => void;
  onToast: (msg: string, type?: any) => void;
}) {
  switch (id) {
    case "mlh":
      return <ToolMlH last={last} onSave={onSave} onToast={onToast} />;
    case "gtt":
      return <ToolGtt last={last} onSave={onSave} onToast={onToast} />;
    case "mgkgmin":
      return <ToolMgKgMin last={last} onSave={onSave} onToast={onToast} />;
    case "map":
      return <ToolMAP last={last} onSave={onSave} onToast={onToast} />;
    case "bmi":
      return <ToolBMI last={last} onSave={onSave} onToast={onToast} />;
    case "diuresi":
      return <ToolDiuresi last={last} onSave={onSave} onToast={onToast} />;
  }
}

/**
 * =============
 * Tool esistenti
 * =============
 * (lasciati intatti: solo adattati alle nuove props)
 */

function ToolMlH({ last, onSave, onToast }: { last: UtilityHistoryItem | null; onSave: (item: UtilityHistoryItem) => void; onToast: (msg: string, type?: any) => void }) {
  const [vol, setVol] = useState<number>(() => (last?.inputs?.vol as number) || 500);
  const [hours, setHours] = useState<number>(() => (last?.inputs?.hours as number) || 8);

  const out = useMemo(() => {
    const v = Number(vol) || 0;
    const h = Number(hours) || 0;
    if (v <= 0 || h <= 0) return "";
    const mlh = v / h;
    return `${mlh.toFixed(1)} ml/h`;
  }, [vol, hours]);

  return (
    <CalcShell title="Velocità infusione (ml/h)" subtitle="Da volume e tempo" onSave={() => {
      if (!out) return onToast("Compila i campi", "warning");
      onSave({ tool: "ml/h", ts: Date.now(), inputs: { vol, hours }, output: out });
      onToast("Salvato", "success");
    }}>
      <NumRow label="Volume (ml)" value={vol} setValue={setVol} />
      <NumRow label="Tempo (h)" value={hours} setValue={setHours} />
      <CalcOut out={out} />
    </CalcShell>
  );
}

function ToolGtt({ last, onSave, onToast }: { last: UtilityHistoryItem | null; onSave: (item: UtilityHistoryItem) => void; onToast: (msg: string, type?: any) => void }) {
  const [vol, setVol] = useState<number>(() => (last?.inputs?.vol as number) || 500);
  const [min, setMin] = useState<number>(() => (last?.inputs?.min as number) || 60);
  const [set, setSet] = useState<number>(() => (last?.inputs?.set as number) || 20);

  const out = useMemo(() => {
    const v = Number(vol) || 0;
    const m = Number(min) || 0;
    const s = Number(set) || 0;
    if (v <= 0 || m <= 0 || (s !== 20 && s !== 60)) return "";
    const gtt = (v * s) / m;
    return `${Math.round(gtt)} gtt/min`;
  }, [vol, min, set]);

  return (
    <CalcShell title="Gocce/min" subtitle="Deflussore 20 o 60 gtt" onSave={() => {
      if (!out) return onToast("Compila i campi", "warning");
      onSave({ tool: "gtt/min", ts: Date.now(), inputs: { vol, min, set }, output: out });
      onToast("Salvato", "success");
    }}>
      <NumRow label="Volume (ml)" value={vol} setValue={setVol} />
      <NumRow label="Tempo (min)" value={min} setValue={setMin} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 10 }}>
        <div style={{ fontWeight: 850, opacity: 0.9 }}>Deflussore</div>
        <select value={set} onChange={(e) => setSet(Number(e.target.value))} style={selectStyle()}>
          <option value={20}>20 gtt/ml</option>
          <option value={60}>60 gtt/ml</option>
        </select>
      </div>
      <CalcOut out={out} />
    </CalcShell>
  );
}

function ToolMgKgMin({ last, onSave, onToast }: { last: UtilityHistoryItem | null; onSave: (item: UtilityHistoryItem) => void; onToast: (msg: string, type?: any) => void }) {
  const [dose, setDose] = useState<number>(() => (last?.inputs?.dose as number) || 0.1);
  const [weight, setWeight] = useState<number>(() => (last?.inputs?.weight as number) || 70);
  const [conc, setConc] = useState<number>(() => (last?.inputs?.conc as number) || 1);

  const out = useMemo(() => {
    const d = Number(dose) || 0;
    const w = Number(weight) || 0;
    const c = Number(conc) || 0;
    if (d <= 0 || w <= 0 || c <= 0) return "";
    // mg/kg/min -> mg/min
    const mgMin = d * w;
    // mg/min -> ml/min given mg/ml
    const mlMin = mgMin / c;
    const mlH = mlMin * 60;
    return `${mlH.toFixed(2)} ml/h`;
  }, [dose, weight, conc]);

  return (
    <CalcShell title="Dose → ml/h" subtitle="mg/kg/min → ml/h (con concentrazione)" onSave={() => {
      if (!out) return onToast("Compila i campi", "warning");
      onSave({ tool: "mg/kg/min → ml/h", ts: Date.now(), inputs: { dose, weight, conc }, output: out });
      onToast("Salvato", "success");
    }}>
      <NumRow label="Dose (mg/kg/min)" value={dose} setValue={setDose} step={0.01} />
      <NumRow label="Peso (kg)" value={weight} setValue={setWeight} />
      <NumRow label="Concentrazione (mg/ml)" value={conc} setValue={setConc} step={0.1} />
      <CalcOut out={out} />
    </CalcShell>
  );
}

function ToolMAP({ last, onSave, onToast }: { last: UtilityHistoryItem | null; onSave: (item: UtilityHistoryItem) => void; onToast: (msg: string, type?: any) => void }) {
  const [sys, setSys] = useState<number>(() => (last?.inputs?.sys as number) || 120);
  const [dia, setDia] = useState<number>(() => (last?.inputs?.dia as number) || 80);

  const out = useMemo(() => {
    const s = Number(sys) || 0;
    const d = Number(dia) || 0;
    if (s <= 0 || d <= 0 || s <= d) return "";
    const map = d + (s - d) / 3;
    return `${Math.round(map)} mmHg`;
  }, [sys, dia]);

  return (
    <CalcShell title="MAP" subtitle="Pressione arteriosa media" onSave={() => {
      if (!out) return onToast("Compila i campi", "warning");
      onSave({ tool: "MAP", ts: Date.now(), inputs: { sys, dia }, output: out });
      onToast("Salvato", "success");
    }}>
      <NumRow label="Sistolica" value={sys} setValue={setSys} />
      <NumRow label="Diastolica" value={dia} setValue={setDia} />
      <CalcOut out={out} />
    </CalcShell>
  );
}

function ToolBMI({ last, onSave, onToast }: { last: UtilityHistoryItem | null; onSave: (item: UtilityHistoryItem) => void; onToast: (msg: string, type?: any) => void }) {
  const [kg, setKg] = useState<number>(() => (last?.inputs?.kg as number) || 70);
  const [cm, setCm] = useState<number>(() => (last?.inputs?.cm as number) || 175);

  const out = useMemo(() => {
    const w = Number(kg) || 0;
    const h = (Number(cm) || 0) / 100;
    if (w <= 0 || h <= 0) return "";
    const bmi = w / (h * h);
    return `${bmi.toFixed(1)} BMI`;
  }, [kg, cm]);

  return (
    <CalcShell title="BMI" subtitle="Indice massa corporea" onSave={() => {
      if (!out) return onToast("Compila i campi", "warning");
      onSave({ tool: "BMI", ts: Date.now(), inputs: { kg, cm }, output: out });
      onToast("Salvato", "success");
    }}>
      <NumRow label="Peso (kg)" value={kg} setValue={setKg} />
      <NumRow label="Altezza (cm)" value={cm} setValue={setCm} />
      <CalcOut out={out} />
    </CalcShell>
  );
}

function ToolDiuresi({ last, onSave, onToast }: { last: UtilityHistoryItem | null; onSave: (item: UtilityHistoryItem) => void; onToast: (msg: string, type?: any) => void }) {
  const [ml, setMl] = useState<number>(() => (last?.inputs?.ml as number) || 500);
  const [hours, setHours] = useState<number>(() => (last?.inputs?.hours as number) || 8);
  const [weight, setWeight] = useState<number>(() => (last?.inputs?.weight as number) || 70);

  const out = useMemo(() => {
    const v = Number(ml) || 0;
    const h = Number(hours) || 0;
    const w = Number(weight) || 0;
    if (v <= 0 || h <= 0 || w <= 0) return "";
    const rate = v / h / w;
    return `${rate.toFixed(2)} ml/kg/h`;
  }, [ml, hours, weight]);

  return (
    <CalcShell title="Diuresi" subtitle="ml/kg/h" onSave={() => {
      if (!out) return onToast("Compila i campi", "warning");
      onSave({ tool: "Diuresi", ts: Date.now(), inputs: { ml, hours, weight }, output: out });
      onToast("Salvato", "success");
    }}>
      <NumRow label="Diuresi (ml)" value={ml} setValue={setMl} />
      <NumRow label="Tempo (h)" value={hours} setValue={setHours} />
      <NumRow label="Peso (kg)" value={weight} setValue={setWeight} />
      <CalcOut out={out} />
    </CalcShell>
  );
}

function CalcShell({ title, subtitle, children, onSave }: { title: string; subtitle: string; children: React.ReactNode; onSave: () => void }) {
  return (
    <div style={{ borderRadius: 18, padding: 16, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
      <div style={{ fontWeight: 950, fontSize: 15 }}>{title}</div>
      <div style={{ opacity: 0.75, fontSize: 13, marginTop: 4 }}>{subtitle}</div>

      <div style={{ marginTop: 12 }}>{children}</div>

      <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
        <button type="button" onClick={onSave} style={primaryBtn(false)}>
          Salva
        </button>
      </div>
    </div>
  );
}

function NumRow({ label, value, setValue, step }: { label: string; value: number; setValue: (n: number) => void; step?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 10 }}>
      <div style={{ fontWeight: 850, opacity: 0.9 }}>{label}</div>
      <input
        type="number"
        value={value}
        step={step}
        onChange={(e) => setValue(Number(e.target.value))}
        style={inputStyle()}
      />
    </div>
  );
}

function CalcOut({ out }: { out: string }) {
  return (
    <div style={{ marginTop: 12, borderRadius: 14, padding: 12, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.12)" }}>
      <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 900 }}>Risultato</div>
      <div style={{ marginTop: 6, fontSize: 16, fontWeight: 950 }}>{out || "—"}</div>
    </div>
  );
}

function inputStyle(): React.CSSProperties {
  return {
    width: 140,
    borderRadius: 12,
    padding: "10px 10px",
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.15)",
    outline: "none",
    textAlign: "right",
    fontWeight: 850,
  };
}

function selectStyle(): React.CSSProperties {
  return {
    width: 160,
    borderRadius: 12,
    padding: "10px 10px",
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.15)",
    outline: "none",
    fontWeight: 850,
  };
}