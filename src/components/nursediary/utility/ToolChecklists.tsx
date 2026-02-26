import React, { useMemo, useState } from "react";
import { isPremium } from "@/features/profile/premium";

/**
 * Checklist operative (MVP)
 * - Local-first, persist per checklist
 * - Share/copy as plain text
 * Nota: supporto didattico/organizzativo. Verifica sempre protocolli locali.
 */

type ChecklistStep = { id: string; text: string; critical?: boolean };
type Checklist = { id: string; title: string; subtitle: string; premium?: boolean; steps: ChecklistStep[] };

const LS_PREFIX = "nd_utility_checklist_state_v1:";
const LS_LAST = "nd_utility_checklist_last_v1";
const LS_NIGHT = "nd_utility_checklist_night_v1";
const LS_TIMER_PREFIX = "nd_utility_checklist_timer_v1:";
const LS_LAST_STEP_PREFIX = "nd_utility_checklist_last_step_v1:";

const CHECKLISTS: Checklist[] = [
  {
    id: "cvc",
    title: "CVC – Medicazione",
    subtitle: "Checklist rapida da reparto",
    steps: [
      { id: "hand", text: "Igiene mani + guanti (sterili se da protocollo).", critical: true },
      { id: "id", text: "Identifica paziente, verifica indicazioni e allergie (clorexidina/cerotti).", critical: true },
      { id: "site", text: "Ispeziona sito: arrossamento, essudato, dolore, sanguinamento." },
      { id: "asepsi", text: "Allestimento campo e materiale in asepsi.", critical: true },
      { id: "clean", text: "Detersione/antisepsi secondo protocollo (es. clorexidina 2% in alcol, tempo di contatto).", critical: true },
      { id: "dry", text: "Lascia asciugare completamente prima di coprire.", critical: true },
      { id: "dressing", text: "Applica medicazione (trasparente/garza) e fissa correttamente." },
      { id: "label", text: "Etichetta: data/ora, operatore, tipo medicazione." },
      { id: "flush", text: "Valuta pervietà/flush se previsto e registra eventuali anomalie." },
      { id: "document", text: "Documenta procedura e condizioni del sito." },
    ],
  },
  {
    id: "transfusion",
    title: "Trasfusione",
    subtitle: "Prima / durante / reazioni",
    premium: true,
    steps: [
      { id: "order", text: "Verifica prescrizione, consenso e indicazione clinica.", critical: true },
      { id: "id2", text: "Identificazione a 2 operatori + confronto bracciale/sacca.", critical: true },
      { id: "baseline", text: "Parametri basali e accesso venoso idoneo (calibro).", critical: true },
      { id: "compat", text: "Controllo gruppo/compatibilità e integrità sacca (scadenza, emolisi).", critical: true },
      { id: "start", text: "Avvia lentamente e resta in osservazione iniziale (primi 10–15 min).", critical: true },
      { id: "monitor", text: "Monitorizza: T°, FC, PA, SpO₂; valuta sintomi (brividi, dispnea, prurito, dolore lombare).", critical: true },
      { id: "reaction", text: "Se sospetta reazione: STOP trasfusione, mantieni accesso con fisiologica, avvisa medico.", critical: true },
      { id: "doc", text: "Documenta tempi, volume, eventuali eventi avversi e provvedimenti." },
    ],
  },
  {
    id: "sepsis",
    title: "Sepsi – Bundle iniziale",
    subtitle: "Riconoscimento e prime azioni",
    premium: true,
    steps: [
      { id: "suspect", text: "Sospetta sepsi: infezione + deterioramento clinico / NEWS2 ↑.", critical: true },
      { id: "vitals", text: "Parametri, diuresi, stato mentale; allerta team.", critical: true },
      { id: "lactate", text: "Prelievi: lattato, emoculture (se indicato) prima di antibiotico.", critical: true },
      { id: "abx", text: "Antibiotico entro tempo da protocollo (priorità elevata).", critical: true },
      { id: "fluids", text: "Fluidi se ipotensione/iperlattacidemia (secondo indicazione medica/protocollo).", critical: true },
      { id: "monitor2", text: "Rivaluta parametri e risposta; rivaluta lattato se elevato.", critical: true },
      { id: "source", text: "Supporta identificazione del focus (urine, torace, ferite) e drenaggi/cateteri se indicato." },
      { id: "document", text: "Documenta tempi: sospetto, prelievi, antibiotico, fluidi, escalation." },
    ],
  },
];

function readState(id: string): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LS_PREFIX + id);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function writeState(id: string, st: Record<string, boolean>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_PREFIX + id, JSON.stringify(st));
  } catch {}
}

function readNight(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(LS_NIGHT) === "1";
  } catch {
    return false;
  }
}

function writeNight(v: boolean) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_NIGHT, v ? "1" : "0");
  } catch {}
}

function readLast(): { id: string; ts: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_LAST);
    return raw ? (JSON.parse(raw) as any) : null;
  } catch {
    return null;
  }
}

function writeLast(id: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_LAST, JSON.stringify({ id, ts: Date.now() }));
  } catch {}
}

function readLastStep(id: string): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(LS_LAST_STEP_PREFIX + id) || "";
  } catch {
    return "";
  }
}

function writeLastStep(id: string, sid: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_LAST_STEP_PREFIX + id, sid);
  } catch {}
}

type TimerState = { start: number; dur: number };

function readTimer(id: string): TimerState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_TIMER_PREFIX + id);
    return raw ? (JSON.parse(raw) as any) : null;
  } catch {
    return null;
  }
}

function writeTimer(id: string, timer: TimerState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_TIMER_PREFIX + id, JSON.stringify(timer));
  } catch {}
}

function clearTimer(id: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LS_TIMER_PREFIX + id);
  } catch {}
}

async function copyText(text: string): Promise<boolean> {
  if (typeof navigator === "undefined") return false;
  try {
    // @ts-ignore
    if (navigator.clipboard?.writeText) {
      // @ts-ignore
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // ignore
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "-9999px";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function formatMMSS(ms: number): string {
  const remaining = Math.max(0, ms);
  const mm = Math.floor(remaining / 60000);
  const ss = Math.floor((remaining % 60000) / 1000);
  return `${mm.toString().padStart(2, "0")}:${ss.toString().padStart(2, "0")}`;
}

export default function ToolChecklists({
  onUpsell,
  onToast,
}: {
  onUpsell: (t: string, d: string, bullets?: string[]) => void;
  onToast: (m: string, type?: any) => void;
}) {
  const premium = isPremium();
  const [night, setNight] = useState<boolean>(() => readNight());
  const [tick, setTick] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = useMemo(() => CHECKLISTS.find((c) => c.id === activeId) || null, [activeId]);
  const [state, setState] = useState<Record<string, boolean>>({});

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const id = window.setInterval(() => setTick((t) => (t + 1) % 1000000), 1000);
    return () => window.clearInterval(id);
  }, []);

  const toggleNight = () => {
    setNight((p) => {
      const n = !p;
      writeNight(n);
      onToast(n ? "Modalità notte ON" : "Modalità notte OFF", "success");
      return n;
    });
  };

  const openChecklist = (c: Checklist) => {
    if (c.premium && !premium) {
      onUpsell("Checklist operative", "Sblocca checklist pronte da reparto (step-by-step).", [
        "Trasfusioni",
        "Sepsi bundle",
        "Nuove checklist ogni settimana",
      ]);
      return;
    }
    setActiveId(c.id);
    writeLast(c.id);
    setState(readState(c.id));
  };

  const toggleStep = (sid: string) => {
    if (!active) return;
    const next = { ...state, [sid]: !state[sid] };
    setState(next);
    writeState(active.id, next);
    writeLastStep(active.id, sid);
    writeLast(active.id);
  };

  const reset = () => {
    if (!active) return;
    const next: Record<string, boolean> = {};
    setState(next);
    writeState(active.id, next);
    writeLastStep(active.id, "");
    writeLast(active.id);
    onToast("Checklist azzerata", "success");
  };

  const startTimer = (minutes: number) => {
    if (!active) return;
    const dur = Math.max(1, Math.round(minutes)) * 60_000;
    writeTimer(active.id, { start: Date.now(), dur });
    onToast(`Timer avviato (${minutes} min)`, "success");
  };

  const stopTimer = () => {
    if (!active) return;
    clearTimer(active.id);
    onToast("Timer fermato", "success");
  };

  const share = async () => {
    if (!active) return;
    const done = active.steps.filter((s) => state[s.id]).length;
    const lines = [
      `✅ ${active.title}`,
      active.subtitle ? `— ${active.subtitle}` : "",
      "",
      ...active.steps.map((s) => `${state[s.id] ? "☑" : "☐"} ${s.text}`),
      "",
      `Progressi: ${done}/${active.steps.length}`,
      "— Nurse Diary",
    ].filter(Boolean);
    const text = lines.join("\n");
    const ok = await copyText(text);
    onToast(ok ? "Copiato negli appunti" : "Impossibile copiare", ok ? "success" : "error");
  };

  const shellStyle: React.CSSProperties = {
    display: "grid",
    gap: 12,
    padding: 14,
    borderRadius: 20,
    border: "1px solid rgba(255,255,255,0.14)",
    background: night ? "rgba(0,0,0,0.38)" : "linear-gradient(180deg, rgba(14,18,30,0.92), rgba(14,18,30,0.78))",
    boxShadow: "0 16px 44px rgba(0,0,0,0.44)",
  };

  if (!active) {
    const last = readLast();
    const resume = (() => {
      if (!last?.id) return null;
      const c = CHECKLISTS.find((x) => x.id === last.id);
      if (!c) return null;
      const st = readState(c.id);
      const done = c.steps.filter((s) => st[s.id]).length;
      if (done === 0 || done >= c.steps.length) return null;
      return { c, done };
    })();

    return (
      <div style={shellStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div className="nd-h2">Checklist operative</div>
          <button
            type="button"
            className="nd-press"
            onClick={toggleNight}
            style={{
              padding: "8px 10px",
              borderRadius: 999,
              border: night ? "1px solid rgba(16,185,129,0.55)" : "1px solid rgba(255,255,255,0.12)",
              background: night ? "rgba(16,185,129,0.18)" : "rgba(255,255,255,0.05)",
              fontWeight: 950,
              fontSize: 12,
              whiteSpace: "nowrap",
            }}
          >
            {night ? "🌙 Notte" : "☀️ Giorno"}
          </button>
        </div>
        <div className="nd-help">Step-by-step, pronte da reparto. Salva lo stato e riprendi quando vuoi.</div>

        {resume && (
          <button
            type="button"
            className="nd-card nd-press"
            onClick={() => openChecklist(resume.c)}
            style={{
              textAlign: "left",
              padding: 14,
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.16)",
              background: "linear-gradient(180deg, rgba(16,185,129,0.14), rgba(255,255,255,0.02))",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <div style={{ fontWeight: 950, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                Riprendi: {resume.c.title}
              </div>
              <span className="nd-badge nd-badge-emerald">
                {resume.done}/{resume.c.steps.length}
              </span>
            </div>
            <div className="nd-help" style={{ marginTop: 4 }}>Hai una checklist in corso. Tocca per riprendere.</div>
          </button>
        )}

        <div style={{ display: "grid", gap: 10 }}>
          {CHECKLISTS.map((c) => {
            const locked = !!c.premium && !premium;
            return (
              <button
                key={c.id}
                type="button"
                className="nd-card nd-press"
                onClick={() => openChecklist(c)}
                style={{
                  textAlign: "left",
                  padding: 14,
                  borderRadius: 18,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.04)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                  <div style={{ fontWeight: 950 }}>{c.title}</div>
                  {locked ? <span className="nd-badge nd-badge-gold">🔒 Premium</span> : <span className="nd-badge">NEW</span>}
                </div>
                <div className="nd-help" style={{ marginTop: 4 }}>{c.subtitle}</div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const done = active.steps.filter((s) => state[s.id]).length;
  const lastStepId = readLastStep(active.id);
  const timer = readTimer(active.id);
  const remaining = timer ? Math.max(0, timer.dur - (Date.now() - timer.start)) : 0;
  void tick;

  const quickTimers = active.id === "transfusion" ? [15] : active.id === "sepsis" ? [60] : [];

  return (
    <div style={shellStyle}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <button
          type="button"
          className="nd-btn nd-btn-ghost nd-press"
          style={{ padding: "10px 12px" }}
          onClick={() => setActiveId(null)}
        >
          ← Indietro
        </button>
        <button
          type="button"
          className="nd-press"
          onClick={toggleNight}
          style={{
            padding: "8px 10px",
            borderRadius: 999,
            border: night ? "1px solid rgba(16,185,129,0.55)" : "1px solid rgba(255,255,255,0.12)",
            background: night ? "rgba(16,185,129,0.18)" : "rgba(255,255,255,0.05)",
            fontWeight: 950,
            fontSize: 12,
            whiteSpace: "nowrap",
          }}
        >
          {night ? "🌙 Notte" : "☀️ Giorno"}
        </button>
      </div>

      <div className="nd-tile" style={{ padding: 14, borderRadius: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div style={{ fontWeight: 950 }}>{active.title}</div>
          <span className="nd-badge nd-badge-emerald">
            {done}/{active.steps.length}
          </span>
        </div>
        <div className="nd-help" style={{ marginTop: 4 }}>{active.subtitle}</div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10, alignItems: "center" }}>
          <button type="button" className="nd-btn nd-btn-ghost nd-press" style={{ padding: "10px 12px" }} onClick={() => void share()}>
            Condividi
          </button>
          <button type="button" className="nd-btn nd-btn-ghost nd-press" style={{ padding: "10px 12px" }} onClick={reset}>
            Reset
          </button>

          {quickTimers.length > 0 && (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {timer ? (
                <span className="nd-badge nd-badge-emerald">⏱ {formatMMSS(remaining)}</span>
              ) : (
                <span className="nd-badge">⏱ Timer</span>
              )}
              {timer ? (
                <button type="button" className="nd-btn nd-btn-ghost nd-press" style={{ padding: "10px 12px" }} onClick={stopTimer}>
                  Stop
                </button>
              ) : (
                quickTimers.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className="nd-btn nd-btn-ghost nd-press"
                    style={{ padding: "10px 12px" }}
                    onClick={() => startTimer(m)}
                  >
                    {m}m
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {active.steps.map((s) => {
          const checked = !!state[s.id];
          const isLast = lastStepId === s.id;
          return (
            <button
              key={s.id}
              type="button"
              className="nd-press"
              onClick={() => toggleStep(s.id)}
              style={{
                textAlign: "left",
                padding: 12,
                borderRadius: 16,
                border: isLast ? "1px solid rgba(16,185,129,0.55)" : "1px solid rgba(255,255,255,0.12)",
                background: checked ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.04)",
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
              }}
            >
              <div style={{ fontSize: 16, lineHeight: "20px", marginTop: 1 }}>{checked ? "☑" : "☐"}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 900, opacity: checked ? 0.9 : 1 }}>
                  {s.critical ? "⚠️ " : ""}
                  {s.text}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="nd-help" style={{ marginTop: 6, opacity: 0.7 }}>
        Nota: contenuto didattico/organizzativo. Segui sempre protocolli locali.
      </div>
    </div>
  );
}
