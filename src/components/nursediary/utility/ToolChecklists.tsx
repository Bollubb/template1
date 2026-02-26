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

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}

export default function ToolChecklists({
  onUpsell,
  onToast,
}: {
  onUpsell: (t: string, d: string, bullets?: string[]) => void;
  onToast: (m: string, type?: any) => void;
}) {
  const premium = isPremium();
  const [activeId, setActiveId] = useState<string | null>(null);

  const active = useMemo(() => CHECKLISTS.find((c) => c.id === activeId) || null, [activeId]);

  const [state, setState] = useState<Record<string, boolean>>({});

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
    const st = readState(c.id);
    setState(st);
  };

  const toggleStep = (sid: string) => {
    if (!active) return;
    const next = { ...state, [sid]: !state[sid] };
    setState(next);
    writeState(active.id, next);
  };

  const reset = () => {
    if (!active) return;
    const next: Record<string, boolean> = {};
    setState(next);
    writeState(active.id, next);
    onToast("Checklist azzerata", "success");
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

  if (!active) {
    return (
      <div style={{ display: "grid", gap: 10 }}>
        <div className="nd-h2">Checklist operative</div>
        <div className="nd-help">Step-by-step, pronte da reparto. Salva lo stato e riprendi quando vuoi.</div>

        <div style={{ display: "grid", gap: 10 }}>
          {CHECKLISTS.map((c) => (
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
                background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontWeight: 950, letterSpacing: -0.2 }}>{c.title}</div>
                {c.premium && !premium && (
                  <span className="nd-badge nd-badge-amber" style={{ fontSize: 11 }}>
                    Premium
                  </span>
                )}
              </div>
              <div className="nd-help" style={{ marginTop: 4 }}>
                {c.subtitle}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const done = active.steps.filter((s) => state[s.id]).length;
  const pct = Math.round((done / active.steps.length) * 100);

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div>
          <div className="nd-h2">{active.title}</div>
          <div className="nd-help">{active.subtitle}</div>
        </div>
        <span className="nd-badge nd-badge-emerald" style={{ fontSize: 12 }}>
          {pct}%
        </span>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {active.steps.map((s, i) => (
          <button
            key={s.id}
            type="button"
            className="nd-press"
            onClick={() => toggleStep(s.id)}
            style={{
              textAlign: "left",
              padding: 12,
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.12)",
              background: state[s.id]
                ? "linear-gradient(180deg, rgba(16,185,129,0.20), rgba(16,185,129,0.06))"
                : "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
            }}
          >
            <div style={{ width: 22, opacity: 0.9, fontWeight: 950 }}>{state[s.id] ? "☑" : "☐"}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 850, opacity: 0.9 }}>{i + 1}.</div>
              <div style={{ opacity: 0.95 }}>{s.text}</div>
              {s.critical && (
                <div className="nd-help" style={{ marginTop: 4, opacity: 0.9 }}>
                  ⚠️ Passaggio critico
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
        <button type="button" className="nd-btn nd-btn-ghost nd-press" onClick={() => setActiveId(null)}>
          ← Elenco
        </button>
        <button type="button" className="nd-btn nd-btn-ghost nd-press" onClick={reset}>
          Reset
        </button>
        <button type="button" className="nd-btn nd-btn-primary nd-press" onClick={() => void share()}>
          Condividi
        </button>
      </div>
    </div>
  );
}
