import React, { useEffect, useMemo, useState } from "react";
import { isPremium } from "@/features/profile/premium";

type UtilityHistoryItem = {
  tool: string;
  ts: number;
  inputs: Record<string, string | number | boolean>;
  output: string;
};

const LS_INFUSIONS_DAILY = "nd_utility_infusions_daily_v1";

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

  return { premium, canUse, usedLeft, inc };
}

/**
 * ==========================
 * Compatibilità infusioni EV (ICU-ready)
 * ==========================
 * Disclaimer: strumento di supporto/educativo. Verifica sempre protocolli locali, RCP/SmPC e condizioni del paziente.
 */
export default function ToolInfusions({
  onOpen,
  onSave,
  onUpsell,
  onToast,
  isFav,
  onToggleFav,
}: {
  onOpen?: () => void;
  onSave: (item: UtilityHistoryItem) => void;
  onUpsell: (t: string, d: string, bullets?: string[]) => void;
  onToast: (m: string, type?: any) => void;
  isFav?: boolean;
  onToggleFav?: () => void;
}) {
  type Sev = "ok" | "caution" | "avoid";
  type Compat = { with: string; sev: Sev; note: string; flush?: boolean; advanced?: string[] };
  type Drug = { id: string; name: string; class: string; also?: string[]; compat: Compat[] };

  const premium = isPremium();
  const limit = useDailyLimit(LS_INFUSIONS_DAILY, 5); // free: 5 controlli/die

  useEffect(() => {
    onOpen?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const DB: Drug[] = [
    {
      id: "noradrenalina",
      name: "Noradrenalina",
      class: "Vasopressori",
      also: ["Norepinefrina"],
      compat: [
        { with: "propofol", sev: "avoid", note: "Emulsione lipidica: evitare Y-site. Linea dedicata.", flush: true, advanced: ["Preferire linea dedicata per vasopressori", "Evita Y-site con emulsioni lipidiche"] },
        { with: "midazolam", sev: "caution", note: "Compatibilità variabile: preferisci linea dedicata o flush prima/dopo.", flush: true, advanced: ["Osserva torbidità/precipitati", "Riduci co-infusione"] },
        { with: "fentanil", sev: "ok", note: "Spesso compatibile in Y-site a concentrazioni comuni.", advanced: ["Sorveglia integrità linea/filtri"] },
        { with: "amiodarone", sev: "avoid", note: "Amiodarone spesso richiede linea dedicata. Evitare co-infusione.", flush: true, advanced: ["Preferire linea dedicata"] },
      ],
    },
    { id: "amiodarone", name: "Amiodarone", class: "Anti-aritmici", compat: [{ with: "noradrenalina", sev: "avoid", note: "Preferire linea dedicata.", flush: true }, { with: "midazolam", sev: "caution", note: "Compatibilità variabile: flush consigliato.", flush: true }, { with: "propofol", sev: "avoid", note: "Emulsione lipidica: evitare Y-site.", flush: true }] },
    { id: "midazolam", name: "Midazolam", class: "Sedativi", compat: [{ with: "propofol", sev: "avoid", note: "Emulsione lipidica: evitare Y-site.", flush: true }, { with: "fentanil", sev: "ok", note: "Spesso compatibile." }, { with: "noradrenalina", sev: "caution", note: "Compatibilità variabile: preferire flush.", flush: true }] },
    { id: "propofol", name: "Propofol", class: "Sedativi", compat: [{ with: "noradrenalina", sev: "avoid", note: "Emulsione lipidica: linea dedicata.", flush: true }, { with: "fentanil", sev: "avoid", note: "Emulsione lipidica: evitare Y-site.", flush: true }, { with: "midazolam", sev: "avoid", note: "Emulsione lipidica: evitare Y-site.", flush: true }] },
    { id: "fentanil", name: "Fentanil", class: "Oppioidi", compat: [{ with: "noradrenalina", sev: "ok", note: "Spesso compatibile." }, { with: "midazolam", sev: "ok", note: "Spesso compatibile." }, { with: "propofol", sev: "avoid", note: "Propofol: evitare Y-site.", flush: true }] },
    { id: "bicarbonato", name: "Bicarbonato di sodio", class: "Elettroliti", compat: [{ with: "noradrenalina", sev: "avoid", note: "Rischio incompatibilità/precipitazioni con molte soluzioni. Linea dedicata.", flush: true }] },

    /* =====================
     * ICU DB ampliato (v1)
     * Nota: compatibilità dipende da diluente, concentrazione, flusso e dispositivo.
     * ===================== */
    {
      id: "adrenalina",
      name: "Adrenalina",
      class: "Vasopressori",
      compat: [
        { with: "propofol", sev: "avoid", note: "Emulsione lipidica: evitare co-infusione. Linea dedicata.", flush: true, advanced: ["Preferire linea dedicata", "Evita Y-site con emulsioni"] },
        { with: "fentanil", sev: "ok", note: "Spesso compatibile a concentrazioni comuni (monitorare).", advanced: ["Osserva torbidità/precipitati"] },
        { with: "bicarbonato", sev: "avoid", note: "Alcalinizzazione e rischio incompatibilità: evitare. Linea dedicata.", flush: true },
      ],
    },
    {
      id: "vasopressina",
      name: "Vasopressina",
      class: "Vasopressori",
      compat: [
        { with: "noradrenalina", sev: "caution", note: "Spesso gestita su linee dedicate; se Y-site: flush e sorveglianza.", flush: true, advanced: ["Riduci co-infusione", "Preferire linee separate in shock"] },
        { with: "propofol", sev: "avoid", note: "Emulsione lipidica: evitare Y-site.", flush: true },
        { with: "midazolam", sev: "caution", note: "Compatibilità variabile: flush consigliato.", flush: true },
      ],
    },
    {
      id: "dopamina",
      name: "Dopamina",
      class: "Vasopressori",
      compat: [
        { with: "bicarbonato", sev: "avoid", note: "Soluzioni alcaline: evitare co-infusione.", flush: true },
        { with: "furosemide", sev: "caution", note: "Compatibilità variabile: preferire flush/linea dedicata.", flush: true },
        { with: "fentanil", sev: "ok", note: "Spesso compatibile a concentrazioni comuni." },
      ],
    },
    {
      id: "dobutamina",
      name: "Dobutamina",
      class: "Inotropi",
      compat: [
        { with: "bicarbonato", sev: "avoid", note: "Soluzioni alcaline: evitare.", flush: true },
        { with: "noradrenalina", sev: "caution", note: "Preferire linee separate se possibile (farmaci vasoattivi).", flush: true },
        { with: "midazolam", sev: "caution", note: "Compatibilità variabile: flush consigliato.", flush: true },
      ],
    },
    {
      id: "nitroglicerina",
      name: "Nitroglicerina",
      class: "Vasodilatatori",
      compat: [
        { with: "noradrenalina", sev: "caution", note: "Possibile, ma preferire linee dedicate per vasoattivi.", flush: true },
        { with: "propofol", sev: "avoid", note: "Emulsione lipidica: evitare Y-site.", flush: true },
        { with: "fentanil", sev: "ok", note: "Spesso compatibile." },
      ],
    },
    {
      id: "nicardipina",
      name: "Nicardipina",
      class: "Vasodilatatori",
      compat: [
        { with: "noradrenalina", sev: "caution", note: "Preferire linee separate; se necessario flush.", flush: true },
        { with: "midazolam", sev: "caution", note: "Compatibilità variabile: flush consigliato.", flush: true },
      ],
    },
    {
      id: "insulina",
      name: "Insulina regolare",
      class: "Ormoni",
      compat: [
        { with: "noradrenalina", sev: "caution", note: "Preferire linee separate; attenzione a dead space e assorbimento.", flush: true, advanced: ["Attenzione a adsorbimento su set", "Rivaluta glicemia frequentemente"] },
        { with: "kcl", sev: "ok", note: "Spesso compatibile (protocollo insulin/potassio)." },
      ],
    },
    {
      id: "eparina",
      name: "Eparina",
      class: "Anticoagulanti",
      compat: [
        { with: "noradrenalina", sev: "caution", note: "Compatibilità variabile: preferire flush/linea dedicata.", flush: true },
        { with: "vancomicina", sev: "caution", note: "Potenziale incompatibilità: meglio linea separata o flush.", flush: true },
      ],
    },
    {
      id: "kcl",
      name: "Cloruro di potassio (KCl)",
      class: "Elettroliti",
      compat: [
        { with: "ceftriaxone", sev: "caution", note: "Dipende da diluente/concentrazione: preferire flush.", flush: true },
        { with: "insulina", sev: "ok", note: "Spesso compatibile in protocolli dedicati." },
      ],
    },
    {
      id: "mgso4",
      name: "Solfato di magnesio",
      class: "Elettroliti",
      compat: [
        { with: "noradrenalina", sev: "caution", note: "Possibile ma preferire flush/linea dedicata.", flush: true },
        { with: "ceftriaxone", sev: "caution", note: "Compatibilità variabile: flush consigliato.", flush: true },
      ],
    },
    {
      id: "calcio",
      name: "Calcio gluconato",
      class: "Elettroliti",
      compat: [
        { with: "ceftriaxone", sev: "avoid", note: "Rischio precipitazione (soprattutto neonati). Evitare co-infusione.", flush: true, advanced: ["Non co-infondere con ceftriaxone", "Linea dedicata"] },
        { with: "bicarbonato", sev: "avoid", note: "Rischio precipitati con bicarbonato: evitare.", flush: true },
      ],
    },
    {
      id: "ceftriaxone",
      name: "Ceftriaxone",
      class: "Antibiotici",
      compat: [
        { with: "calcio", sev: "avoid", note: "Evitare co-infusione con calcio per rischio precipitazione.", flush: true },
        { with: "noradrenalina", sev: "caution", note: "Compatibilità variabile: flush consigliato.", flush: true },
      ],
    },
    {
      id: "piptazo",
      name: "Piperacillina/Tazobactam",
      class: "Antibiotici",
      compat: [
        { with: "vancomicina", sev: "caution", note: "Possibile incompatibilità: preferire linee separate o flush.", flush: true, advanced: ["Evita co-infusione prolungata", "Usa flush prima/dopo"] },
        { with: "noradrenalina", sev: "caution", note: "Preferire flush.", flush: true },
      ],
    },
    {
      id: "meropenem",
      name: "Meropenem",
      class: "Antibiotici",
      compat: [
        { with: "noradrenalina", sev: "caution", note: "Compatibilità variabile: flush consigliato.", flush: true },
        { with: "vancomicina", sev: "caution", note: "Preferire linee separate o flush.", flush: true },
      ],
    },
    {
      id: "vancomicina",
      name: "Vancomicina",
      class: "Antibiotici",
      compat: [
        { with: "piptazo", sev: "caution", note: "Potenziale incompatibilità: meglio linea separata o flush.", flush: true },
        { with: "eparina", sev: "caution", note: "Compatibilità variabile: preferire flush.", flush: true },
      ],
    },
    {
      id: "furosemide",
      name: "Furosemide",
      class: "Diuretici",
      compat: [
        { with: "dopamina", sev: "caution", note: "Compatibilità variabile: flush consigliato.", flush: true },
        { with: "noradrenalina", sev: "caution", note: "Preferire flush/linea dedicata.", flush: true },
      ],
    },
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
      onUpsell("Compatibilità infusioni EV — limite raggiunto", "Nel piano Free puoi fare fino a 5 controlli al giorno. Con Premium hai accesso illimitato e dettagli avanzati.", ["Illimitato", "Dettagli avanzati", "Database ampliato"]);
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

  return (
    <div className="nd-card nd-card-pad nd-fade-in">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div>
            <div className="text-base font-extrabold flex items-center gap-2">
              Compatibilità infusioni EV
              {onToggleFav && (
                <button
                  type="button"
                  className="nd-press"
                  onClick={onToggleFav}
                  aria-label={isFav ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}
                  className={`nd-press rounded-full px-3 py-1.5 text-xs font-extrabold border border-white/12 ${isFav ? "bg-amber-300/15" : "bg-white/5"} text-white/90`}>
                  {isFav ? "★" : "☆"}
                </button>
              )}
            </div>
          <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>
            Y-site / flush • Step {step} di 3 • {limit.premium ? "Premium" : `${limit.usedLeft()}/5 controlli disponibili oggi`}
          </div>
          </div>
        </div>
        <button
          type="button"
          className="nd-press"
          onClick={() => onUpsell("Compatibilità infusioni EV — ICU", "Con Premium sblocchi dettagli avanzati e database ampliato.", ["Dettagli avanzati", "Database più ampio"])}
          style={ghostBtn()}>
          ICU Boost
        </button>
      </div>

      {!limit.premium && limit.usedLeft() <= 1 && (
        <div className="nd-fade-in" style={{ marginTop: 10, borderRadius: 14, padding: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", opacity: 0.95 }}>
          <div style={{ fontWeight: 900, fontSize: 13 }}>Tip</div>
          <div style={{ marginTop: 6, fontSize: 13, opacity: 0.85, lineHeight: 1.35 }}>
            Ti resta <b>{limit.usedLeft()}</b> controllo gratuito oggi. Con Premium: illimitato + database ampliato ICU.
          </div>
        </div>
      )}

      {step === 1 && (
        <StepPick<Drug>
          title="Step 1 — Seleziona infusione A"
          query={q1}
          setQuery={setQ1}
          results={results1.map((d) => ({ e: d, label: `${d.name} • ${d.class}` }))}
          onPick={(e) => {
            setA(e);
            setStep(2);
            setQ2("");
            setB(null);
          }}
          footer={a ? <div style={{ marginTop: 10, opacity: 0.8, fontSize: 12.5 }}>Selezionato: <b>{a.name}</b></div> : null}
        />
      )}

      {step === 2 && (
        <StepPick<Drug>
          title="Step 2 — Seleziona infusione B"
          query={q2}
          setQuery={setQ2}
          results={results2.map((d) => ({ e: d, label: `${d.name} • ${d.class}` }))}
          onPick={(e) => setB(e)}
          footer={
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
              <button type="button" className="nd-press" onClick={() => { setStep(1); setQ2(""); setB(null); }} style={ghostBtn()}>
                ← Cambia infusione A
              </button>
              <button type="button" className="nd-press" onClick={confirm} disabled={!a || !b} style={primaryBtn(!a || !b)}>
                Verifica compatibilità
              </button>
            </div>
          }
        />
      )}

      {step === 3 && outcome && a && b && (
        <div className="nd-pop" style={{ borderRadius: 18, padding: 16, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 950, fontSize: 15 }}>{a.name} + {b.name}</div>
              <div style={{ opacity: 0.75, marginTop: 4, fontSize: 13 }}>{a.class} • {b.class}</div>
            </div>
            <SeverityPill sev={outcome.sev} text={outcome.title} />
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

          <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
            <button type="button" className="nd-press" onClick={() => { setStep(2); setOutcome(null); }} style={ghostBtn()}>
              ← Modifica scelta
            </button>
            <button type="button" className="nd-press" onClick={() => { onSave({ tool: "INFUSION", ts: Date.now(), inputs: { a: a.id, b: b.id }, output: `${a.name} + ${b.name}: ${outcome.title}${outcome.flush ? " (flush)" : ""}` }); onToast("Salvato in storico", "success"); }} style={primaryBtn(false)}>
              Salva
            </button>
            <button type="button" onClick={() => { setStep(1); setOutcome(null); setA(null); setB(null); setQ1(""); setQ2(""); }} style={primaryBtn(false)}>
              Nuovo controllo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StepPick<T>({
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
  results: { e: T; label: string }[];
  onPick: (e: T) => void;
  footer?: React.ReactNode;
}) {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontWeight: 950, fontSize: 14 }}>{title}</div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Cerca…"
        style={{ marginTop: 10, width: "100%", borderRadius: 14, padding: "10px 12px", border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.02)", color: "inherit", fontWeight: 800 }}
      />

      <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
        {results.map((r) => (
          <button key={r.label} type="button" onClick={() => onPick(r.e)} style={{ textAlign: "left", borderRadius: 14, padding: "10px 12px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)", cursor: "pointer", fontWeight: 850, fontSize: 13 }}>
            {r.label}
          </button>
        ))}
      </div>

      {footer}
    </div>
  );
}

function SeverityPill({ sev, text }: { sev: "ok" | "caution" | "avoid"; text: string }) {
  const palette =
    sev === "avoid"
      ? { border: "1px solid rgba(239,68,68,0.30)", bg: "rgba(239,68,68,0.12)", fg: "rgb(220,38,38)" }
      : sev === "caution"
      ? { border: "1px solid rgba(245,158,11,0.32)", bg: "rgba(245,158,11,0.14)", fg: "rgb(217,119,6)" }
      : { border: "1px solid rgba(34,197,94,0.30)", bg: "rgba(34,197,94,0.12)", fg: "rgb(22,163,74)" };

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 999, border: palette.border, background: palette.bg, color: palette.fg, fontSize: 12, fontWeight: 900, lineHeight: 1 }}>
      <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: palette.fg, boxShadow: "0 0 0 3px rgba(255,255,255,0.06)" }} />
      {text}
    </span>
  );
}

function ghostBtn(): React.CSSProperties {
  return { borderRadius: 999, padding: "8px 10px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.02)", cursor: "pointer", fontWeight: 850, fontSize: 12.5 };
}

function primaryBtn(disabled: boolean): React.CSSProperties {
  return { borderRadius: 14, padding: "10px 12px", border: "1px solid rgba(255,255,255,0.14)", background: "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))", cursor: disabled ? "not-allowed" : "pointer", fontWeight: 900, opacity: disabled ? 0.6 : 1 };
}
