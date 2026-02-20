import React, { useMemo, useState } from "react";
import { useToast } from "./Toast";
import { isPremium } from "@/features/profile/premium";
import PremiumUpsellModal from "./PremiumUpsellModal";
import ToolScales from "./utility/ToolScales";
import ToolInfusions from "./utility/ToolInfusions";

const LS = {
  section: "nd_utility_section_v1",
  favs: "nd_utility_favs",
  history: "nd_utility_history_v1",
  recent: "nd_utility_recent_tools_v1",
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

type UtilityToolId = "INTERACTIONS" | "INFUSION" | "NEWS2" | "GCS";
type RecentItem = { tool: UtilityToolId; ts: number };

const UTILITY_TOOLS: UtilityToolId[] = ["INTERACTIONS", "INFUSION", "NEWS2", "GCS"];

function isUtilityToolId(x: any): x is UtilityToolId {
  return UTILITY_TOOLS.includes(x as UtilityToolId);
}

function safeJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

const isBrowser = () => typeof window !== "undefined" && typeof localStorage !== "undefined";

function readFavs(): UtilityToolId[] {
  if (!isBrowser()) return [];
  const raw = safeJson<string[]>(localStorage.getItem(LS.favs), []);
  return raw.filter((x): x is UtilityToolId => isUtilityToolId(x));
}

function writeFavs(next: UtilityToolId[]) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(LS.favs, JSON.stringify(Array.from(new Set(next))));
  } catch {}
}

function readRecent(): RecentItem[] {
  if (!isBrowser()) return [];
  const raw = safeJson<any[]>(localStorage.getItem(LS.recent), []);
  // Defensive: older builds may have stored other tool ids
  return raw
    .filter((x) => x && isUtilityToolId(x.tool))
    .map((x) => ({ tool: x.tool as UtilityToolId, ts: typeof x.ts === "number" ? x.ts : Date.now() }))
    .slice(0, 10);
}

function writeRecent(next: RecentItem[]) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(LS.recent, JSON.stringify(next));
  } catch {}
}

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

const ACCENTS: Record<SectionId, { solid: string; soft: string; border: string }> = {
  interactions: { solid: "rgb(59,130,246)", soft: "rgba(59,130,246,0.16)", border: "rgba(59,130,246,0.34)" }, // blue
  infusion: { solid: "rgb(34,197,94)", soft: "rgba(34,197,94,0.16)", border: "rgba(34,197,94,0.34)" }, // green
  calculators: { solid: "rgb(168,85,247)", soft: "rgba(168,85,247,0.16)", border: "rgba(168,85,247,0.34)" }, // violet
  scales: { solid: "rgb(245,158,11)", soft: "rgba(245,158,11,0.16)", border: "rgba(245,158,11,0.34)" }, // amber
  checklists: { solid: "rgb(236,72,153)", soft: "rgba(236,72,153,0.16)", border: "rgba(236,72,153,0.34)" }, // pink
};


const SECTION_ICONS: Record<SectionId, string> = {
  interactions: "↔",
  infusion: "IV",
  calculators: "∑",
  scales: "GCS",
  checklists: "✓",
};


export default function UtilityHub({ onBack }: { onBack: () => void }) {
  const toast = useToast();
  const premium = isPremium();

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

  const [favs, setFavs] = useState<UtilityToolId[]>(() => readFavs());
  const [recent, setRecent] = useState<RecentItem[]>(() => readRecent());

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

  function markRecent(tool: UtilityToolId) {
    if (!isBrowser()) return;
    setRecent((prev) => {
      const next: RecentItem[] = [{ tool, ts: Date.now() }, ...prev.filter((x) => x.tool !== tool)].slice(0, 10);
      writeRecent(next);
      return next;
    });
  }

  function toggleFav(tool: UtilityToolId) {
    if (!premium) {
      openUpsell(
        "Preferiti Premium",
        "Salva i tool che usi di più e ritrovali in 1 tap. Con Free puoi usare i tool, ma non salvarli tra i preferiti.",
        ["Preferiti illimitati", "Accesso rapido", "Tool avanzati"]
      );
      return;
    }
    setFavs((prev) => {
      const removing = prev.includes(tool);
      const next = removing ? prev.filter((x) => x !== tool) : [tool, ...prev];
      writeFavs(next);
      toast.push(removing ? "Rimosso dai preferiti" : "Aggiunto ai preferiti", "success");
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

  const TOOL_META: Record<UtilityToolId, { label: string; open: () => void; badge?: string; accent: { solid: string; soft: string; border: string } }> = {
    INTERACTIONS: { label: "Interazioni", badge: "TOP", open: () => { goSection("interactions"); markRecent("INTERACTIONS"); } , accent: ACCENTS["interactions"] },
    INFUSION: { label: "Infusioni EV", badge: "ICU", open: () => { startToolLoad("INFUSION"); goSection("infusion"); markRecent("INFUSION"); } , accent: ACCENTS["infusion"] },
    NEWS2: { label: "NEWS2", badge: "CORE", open: () => { goSection("scales"); setActiveScale("news2"); markRecent("NEWS2"); } , accent: ACCENTS["scales"] },
    GCS: { label: "GCS", badge: "NEURO", open: () => { goSection("scales"); setActiveScale("gcs"); markRecent("GCS"); } , accent: ACCENTS["scales"] },
  };

  const [query, setQuery] = useState("");

  const [toolLoading, setToolLoading] = useState<{ id: UtilityToolId | null; on: boolean }>({ id: null, on: false });
  function startToolLoad(id: UtilityToolId, ms = 180) {
    setToolLoading({ id, on: true });
    window.setTimeout(() => setToolLoading((p) => (p.id === id ? { id: null, on: false } : p)), ms);
  }


  const recent3 = useMemo(() => {
    const uniq: UtilityToolId[] = [];
    // 1) recent list (already unique by tool)
    for (const r of recent) {
      const t = r?.tool;
      if (!t) continue;
      if (!TOOL_META[t]) continue;
      if (!uniq.includes(t)) uniq.push(t);
      if (uniq.length >= 3) break;
    }
    // 2) fallback from history
    if (uniq.length < 3) {
      for (const h of history) {
        const t = h?.tool as any;
        if (!t) continue;
        if (!isUtilityToolId(t)) continue;
        if (!TOOL_META[t]) continue;
        if (uniq.includes(t)) continue;
        uniq.push(t);
        if (uniq.length >= 3) break;
      }
    }
    return uniq;
  }, [recent, history]);

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SECTIONS;
    return SECTIONS.filter((s) => (s.title + " " + s.subtitle).toLowerCase().includes(q));
  }, [query]);

  // NOTE: Nessuna utility genera XP (evita spam classifica)

  return (
    <div>
      {!section && (
        <div>
          <div className="nd-sticky-header">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <div style={{ fontSize: 18, fontWeight: 950, letterSpacing: -0.2 }}>Utility</div>
                <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 800 }}>Tool rapidi, guidati e “safe”</div>
              </div>
            </div>

            <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ flex: 1, position: "relative" }}>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cerca tool o sezioni…"
                  className="nd-input"
                />
              </div>
              {query.trim() && (
                <button
                  type="button"
                  className="nd-press"
                  onClick={() => setQuery("")}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "rgba(255,255,255,0.05)",
                    fontWeight: 900,
                    color: "rgba(255,255,255,0.92)",
                  }}>
                  Pulisci
                </button>
              )}
            </div>

            {query.trim() === "" && recent3.length > 0 && (
              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {recent3.map((id) => {
                  const m = TOOL_META[id];
                  if (!m) return null;
                  return (
                    <button
                      key={id}
                      type="button"
                      className="nd-press"
                      onClick={() => m.open()}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 10px",
                        borderRadius: 999,
                        border: `1px solid ${m.accent.border}`,
                        background: m.accent.soft,
                        color: "rgba(255,255,255,0.92)",
                        fontWeight: 950,
                        fontSize: 12,
                        letterSpacing: -0.2,
                      }}>
                      <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: m.accent.solid }} />
                      {m.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid gap-3 pt-2 md:grid-cols-2">
            {filteredSections.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => goSection(s.id)}
                className="nd-press"
                style={{
                  textAlign: "left",
                  borderRadius: 18,
                  padding: 16,
                  border: `1px solid ${ACCENTS[s.id].border}`,
                  background: `linear-gradient(180deg, ${ACCENTS[s.id].soft}, rgba(255,255,255,0.02))`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  cursor: "pointer",
                  maxWidth: "100%",
                  minWidth: 0,
                  flex: "1 1 220px",
                  whiteSpace: "normal",
                  wordBreak: "break-word",
                  lineHeight: 1.2,
                  willChange: "transform",
                  transition: "transform 120ms ease, border-color 120ms ease, background 120ms ease",
                }}>
                <div>
                  <div className="flex items-center gap-2.5">
                    <span
                      aria-hidden
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        background: ACCENTS[s.id].solid,
                        boxShadow: `0 0 0 3px ${ACCENTS[s.id].soft}`,
                      }}
                    />
                    <span
                      aria-hidden
                      style={{
                        minWidth: 34,
                        height: 26,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "0 8px",
                        borderRadius: 999,
                        border: `1px solid ${ACCENTS[s.id].border}`,
                        background: "rgba(255,255,255,0.03)",
                        color: "rgba(255,255,255,0.92)",
                        fontSize: 12,
                        fontWeight: 950,
                        letterSpacing: -0.2,
                      }}>
                      {SECTION_ICONS[s.id]}
                    </span>
                    <div style={{ fontSize: 16, fontWeight: 900, color: ACCENTS[s.id].solid }}>{s.title}</div>
                    {s.badge && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 850,
                          padding: "3px 10px",
                          borderRadius: 999,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minWidth: 44,
                          whiteSpace: "nowrap",
                          lineHeight: 1,
                          border: `1px solid ${ACCENTS[s.id].border}`,
                          background: ACCENTS[s.id].soft,
                          color: ACCENTS[s.id].solid,
                          opacity: 0.98,
                        }}>
                        {s.badge}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, opacity: 0.75, marginTop: 4 }}>{s.subtitle}</div>
                </div>

                <div className="text-lg font-extrabold text-white/50">›</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {!!section && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
            <button
              type="button"
              className="nd-press"
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
          </div>

          {section === "interactions" &&
            (toolLoading.on && toolLoading.id === "INTERACTIONS" ? (
              <ToolSkeleton title="Interazioni" accent={ACCENTS["interactions"]} />
            ) : (
              <ToolInteractions onSave={pushHistory} onUpsell={openUpsell} />
            ))}

          {section === "infusion" &&
            (toolLoading.on && toolLoading.id === "INFUSION" ? (
              <ToolSkeleton title="Infusioni EV" accent={ACCENTS["infusion"]} />
            ) : (
              <ToolInfusions
                onOpen={() => markRecent("INFUSION")}
                onSave={(it) => {
                  pushHistory(it);
                  markRecent("INFUSION");
                }}
                onUpsell={openUpsell}
                onToast={(m, t) => toast.push(m, t)}
                isFav={favs.includes("INFUSION")}
                onToggleFav={() => toggleFav("INFUSION")}
              />
            ))}
          {section === "scales" && (
            <ToolScales
              active={activeScale}
              setActive={(id) => {
                setActiveScale(id);
                if (id === "news2") markRecent("NEWS2");
                if (id === "gcs") markRecent("GCS");
              }}
              lastByTool={lastByTool}
              onSave={(it) => {
                pushHistory(it);
                if (it.tool === "NEWS2") markRecent("NEWS2");
                if (it.tool === "GCS") markRecent("GCS");
              }}
              onUpsell={openUpsell}
              onToast={(m, t) => toast.push(m, t)}
              favs={favs}
              onToggleFav={toggleFav}
            />
          )}
          {section === "checklists" && <ComingSoon title="Checklist operative" desc="Checklist step-by-step, stampabili e pronte da reparto." onUpsell={openUpsell} />}

          {section === "calculators" && (
            <>
              {!activeCalc ? (
                <div style={{ display: "grid", gap: 10 }}>
                  <CalcCard title="Velocità infusione" subtitle="ml/h da volume e tempo" icon="⏱" onClick={() => setActiveCalc("mlh")} />
                  <CalcCard title="Gocce/min" subtitle="Deflussore 20 o 60 gtt" icon="滴" onClick={() => setActiveCalc("gtt")} />
                  <CalcCard title="Dose → ml/h" subtitle="mg/kg/min → ml/h (con concentrazione)" icon="⚗" onClick={() => setActiveCalc("mgkgmin")} />
                  <CalcCard title="MAP" subtitle="Pressione arteriosa media" icon="MAP" onClick={() => setActiveCalc("map")} />
                  <CalcCard title="BMI" subtitle="Indice di massa corporea" icon="BMI" onClick={() => setActiveCalc("bmi")} />
                  <CalcCard title="Diuresi" subtitle="ml/kg/h" icon="H₂O" onClick={() => setActiveCalc("diuresi")} />
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

function ToolSkeleton({
  title,
  accent,
}: {
  title: string;
  accent: { solid: string; soft: string; border: string };
}) {
  return (
    <div
      className="nd-fade-in"
      style={{
        border: `1px solid ${accent.border}`,
        background: `linear-gradient(180deg, ${accent.soft}, rgba(255,255,255,0.03))`,
        borderRadius: 18,
        padding: 14,
      }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 950, color: accent.solid, letterSpacing: -0.2 }}>{title}</div>
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>Caricamento…</div>
        </div>
        <div
          className="nd-skel"
          style={{
            width: 86,
            height: 26,
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.06)",
          }}
        />
      </div>
      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        <div className="nd-skel" style={{ height: 14, borderRadius: 10, background: "rgba(255,255,255,0.06)" }} />
        <div className="nd-skel" style={{ height: 14, borderRadius: 10, width: "92%", background: "rgba(255,255,255,0.06)" }} />
        <div className="nd-skel" style={{ height: 14, borderRadius: 10, width: "84%", background: "rgba(255,255,255,0.06)" }} />
      </div>
    </div>
  );
}

function CalcCard({ title, subtitle, icon, onClick }: { title: string; subtitle: string; icon: string; onClick: () => void }) {
  const a = ACCENTS["calculators"];
  return (
    <button type="button" onClick={onClick} className="nd-card nd-card-pad nd-press w-full text-left flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden
          style={{
            minWidth: 34,
            height: 26,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 8px",
            borderRadius: 999,
            border: `1px solid ${a.border}`,
            background: "rgba(0,0,0,0.18)",
            color: a.solid,
            fontSize: 12,
            fontWeight: 950,
            letterSpacing: -0.2,
          }}>
          {icon}
        </span>
        <div>
          <div style={{ fontWeight: 950, color: "rgba(255,255,255,0.92)" }}>{title}</div>
          <div style={{ fontSize: 13, opacity: 0.75, marginTop: 2 }}>{subtitle}</div>
        </div>
      </div>

      <div style={{ opacity: 0.55, fontWeight: 900, fontSize: 18, color: a.solid }}>›</div>
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
            <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
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

              <button type="button" onClick={confirm} disabled={!a || !b} style={primaryBtn(!a || !b)}>
                Verifica interazione
              </button>
            </div>
          }
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
