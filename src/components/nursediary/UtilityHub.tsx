import React, { useMemo, useState } from "react";
import { useToast } from "./Toast";
import { isPremium } from "@/features/profile/premium";
import PremiumUpsellModal from "./PremiumUpsellModal";
import ToolScales from "./utility/ToolScales";
import ToolInfusions from "./utility/ToolInfusions";
import ToolChecklists from "./utility/ToolChecklists";

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
  { id: "infusion", title: "Compatibilità infusioni EV", subtitle: "Y-site / flush / linea (ICU-ready)", badge: "ICU" },
  { id: "checklists", title: "Checklist operative", subtitle: "Procedure step-by-step da turno", badge: "NEW" },
  { id: "scales", title: "Scale cliniche", subtitle: "NEWS2 + Glasgow con interpretazione", badge: "CORE" },
  { id: "calculators", title: "Calcolatori clinici", subtitle: "Dosaggi e conversioni guidate", badge: "BASE" },
];

const ACCENTS: Record<SectionId, { solid: string; soft: string; border: string }> = {
  interactions: { solid: "rgb(59,130,246)", soft: "rgba(59,130,246,0.16)", border: "rgba(59,130,246,0.34)" }, // blue
  infusion: { solid: "rgb(34,197,94)", soft: "rgba(34,197,94,0.16)", border: "rgba(34,197,94,0.34)" }, // green
  calculators: { solid: "rgb(168,85,247)", soft: "rgba(168,85,247,0.16)", border: "rgba(168,85,247,0.34)" }, // violet
  scales: { solid: "rgb(245,158,11)", soft: "rgba(245,158,11,0.16)", border: "rgba(245,158,11,0.34)" }, // amber
  checklists: { solid: "rgb(236,72,153)", soft: "rgba(236,72,153,0.16)", border: "rgba(236,72,153,0.34)" }, // pink
};


const SECTION_ICONS: Record<SectionId, string> = {
  interactions: "💊",
  infusion: "💉",
  calculators: "∑",
  scales: "🩺",
  checklists: "✅",
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
  const [editFavs, setEditFavs] = useState(false);
  const [dragFav, setDragFav] = useState<UtilityToolId | null>(null);
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

  function setFavsPersist(next: UtilityToolId[]) {
    setFavs(next);
    writeFavs(next);
  }

  function moveFav(tool: UtilityToolId, dir: -1 | 1) {
    setFavs((prev) => {
      const idx = prev.indexOf(tool);
      if (idx < 0) return prev;
      const nextIdx = idx + dir;
      if (nextIdx < 0 || nextIdx >= prev.length) return prev;
      const next = prev.slice();
      const tmp = next[idx];
      next[idx] = next[nextIdx];
      next[nextIdx] = tmp;
      writeFavs(next);
      return next;
    });
  }

  function reorderFavs(from: UtilityToolId, to: UtilityToolId) {
    if (from === to) return;
    setFavs((prev) => {
      const a = prev.indexOf(from);
      const b = prev.indexOf(to);
      if (a < 0 || b < 0) return prev;
      const next = prev.slice();
      next.splice(a, 1);
      next.splice(b, 0, from);
      writeFavs(next);
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

  const TOOL_META: Record<UtilityToolId, { title: string; icon: string; label: string; open: () => void; badge?: string; accent: { solid: string; soft: string; border: string } }> = {
    INTERACTIONS: { title: "Interazioni", icon: "💊", label: "Interazioni", badge: "TOP", open: () => { goSection("interactions"); markRecent("INTERACTIONS"); } , accent: ACCENTS["interactions"] },
    INFUSION: { title: "Infusioni EV", icon: "💉", label: "Infusioni EV", badge: "ICU", open: () => { startToolLoad("INFUSION"); goSection("infusion"); markRecent("INFUSION"); } , accent: ACCENTS["infusion"] },
    NEWS2: { title: "NEWS2", icon: "🩺", label: "NEWS2", badge: "CORE", open: () => { goSection("scales"); setActiveScale("news2"); markRecent("NEWS2"); } , accent: ACCENTS["scales"] },
    GCS: { title: "GCS", icon: "🧠", label: "GCS", badge: "NEURO", open: () => { goSection("scales"); setActiveScale("gcs"); markRecent("GCS"); } , accent: ACCENTS["scales"] },
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
            {/* Contenitore per l'header Utility: rende il blocco superiore coerente/premium */}
            <div className="nd-card nd-surface" style={{ padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <div style={{ fontSize: 18, fontWeight: 950, letterSpacing: -0.2 }}>Utility</div>
                <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 800 }}>Strumenti rapidi da turno</div>
              </div>
            </div>

            <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ flex: 1, position: "relative" }}>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cerca tool o sezioni…"
                  className="nd-input"
                  style={{
                    width: "100%",
                    borderRadius: 14,
                    padding: "10px 12px",
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "rgba(0,0,0,0.25)",
                    color: "rgba(255,255,255,0.92)",
                    outline: "none",
                    fontWeight: 800,
                    fontSize: 13,
                  }}
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

            
            {/* Removed "Azioni rapide" tiles: they duplicated the main list and added noise on mobile */}
{query.trim() === "" && recent3.length > 0 && (
  <div style={{ marginTop: 12 }}>
    <div style={{ fontSize: 12, opacity: 0.72, fontWeight: 950, letterSpacing: -0.2, marginBottom: 8 }}>Ultimi usati</div>
    <div
      style={{
        display: "flex",
        gap: 8,
        flexWrap: "nowrap",
        overflowX: "auto",
        paddingBottom: 2,
        WebkitOverflowScrolling: "touch",
      }}
    >
      {recent3.map((id) => {
        const m = TOOL_META[id];
        if (!m) return null;
        return (
          <button
            key={id}
            type="button"
            className="nd-chip nd-press"
            onClick={() => m.open()}
            style={{ borderColor: m.accent.border, background: m.accent.soft, flex: "0 0 auto" }}
          >
            <span style={{ opacity: 0.9 }}>{m.icon}</span>
            <span style={{ whiteSpace: "nowrap" }}>{m.title}</span>
          </button>
        );
      })}
    </div>
  </div>
)}

            {query.trim() === "" && (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
                  <div style={{ fontSize: 12, opacity: 0.72, fontWeight: 950, letterSpacing: -0.2 }}>Preferiti</div>
                  {premium && favs.length > 1 && (
                    <button
                      type="button"
                      className="nd-press"
                      onClick={() => setEditFavs((v) => !v)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 999,
                        border: "1px solid rgba(255,255,255,0.12)",
                        background: editFavs ? "rgba(16,185,129,0.14)" : "rgba(255,255,255,0.05)",
                        fontWeight: 900,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {editFavs ? "Fine" : "Modifica"}
                    </button>
                  )}
                  {!premium && (
                    <button
                      type="button"
                      className="nd-press"
                      onClick={() =>
                        openUpsell(
                          "Preferiti Premium",
                          "Salva i tool che usi di più e ritrovali in 1 tap.",
                          ["Preferiti illimitati", "Accesso rapido", "Tool avanzati"]
                        )
                      }
                      style={{
                        padding: "6px 10px",
                        borderRadius: 999,
                        border: "1px solid rgba(255,255,255,0.12)",
                        background: "rgba(255,255,255,0.05)",
                        fontWeight: 900,
                        whiteSpace: "nowrap",
                      }}
                    >
                      Sblocca
                    </button>
                  )}
                </div>
            
                {premium && favs.length === 0 ? (
                  <div style={{ opacity: 0.7, fontSize: 13 }}>Nessun preferito ancora. Tocca ☆ su un tool per salvarlo.</div>
                ) : premium ? (
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    {favs.slice(0, 12).map((id) => {
                      const m = TOOL_META[id];
                      if (!m) return null;
                      const canUp = favs.indexOf(id) > 0;
                      const canDown = favs.indexOf(id) < favs.length - 1;
                      return (
                        <div key={id} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <button
                            type="button"
                            className="nd-chip nd-press"
                            draggable={editFavs}
                            onDragStart={(e) => {
                              if (!editFavs) return;
                              setDragFav(id);
                              try {
                                e.dataTransfer.setData("text/plain", id);
                                e.dataTransfer.effectAllowed = "move";
                              } catch {}
                            }}
                            onDragOver={(e) => {
                              if (!editFavs) return;
                              e.preventDefault();
                              try {
                                e.dataTransfer.dropEffect = "move";
                              } catch {}
                            }}
                            onDrop={(e) => {
                              if (!editFavs) return;
                              e.preventDefault();
                              const from = ((): UtilityToolId | null => {
                                const dt = (() => {
                                  try {
                                    return e.dataTransfer.getData("text/plain");
                                  } catch {
                                    return "";
                                  }
                                })();
                                if (isUtilityToolId(dt)) return dt;
                                return dragFav;
                              })();
                              if (from && isUtilityToolId(from)) reorderFavs(from, id);
                              setDragFav(null);
                            }}
                            onDragEnd={() => setDragFav(null)}
                            onClick={() => (editFavs ? undefined : m.open())}
                            style={{
                              borderColor: m.accent.border,
                              opacity: editFavs ? 0.95 : 1,
                              cursor: editFavs ? "grab" : "pointer",
                            }}
                            title={editFavs ? "Trascina per riordinare" : undefined}
                          >
                            <span style={{ opacity: 0.9 }}>{m.icon}</span>
                            <span style={{ whiteSpace: "nowrap" }}>{m.title}</span>
                          </button>

                          {editFavs && (
                            <div style={{ display: "inline-flex", gap: 4 }}>
                              <button
                                type="button"
                                className="nd-press"
                                disabled={!canUp}
                                onClick={() => moveFav(id, -1)}
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: 10,
                                  border: "1px solid rgba(255,255,255,0.12)",
                                  background: "rgba(255,255,255,0.05)",
                                  opacity: canUp ? 1 : 0.35,
                                  fontWeight: 950,
                                }}
                                aria-label="Sposta su"
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                className="nd-press"
                                disabled={!canDown}
                                onClick={() => moveFav(id, 1)}
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: 10,
                                  border: "1px solid rgba(255,255,255,0.12)",
                                  background: "rgba(255,255,255,0.05)",
                                  opacity: canDown ? 1 : 0.35,
                                  fontWeight: 950,
                                }}
                                aria-label="Sposta giù"
                              >
                                ↓
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ opacity: 0.7, fontSize: 13 }}>Con Premium puoi salvare e ritrovare i tool in 1 tap.</div>
                )}
              </div>
            )}
                        </div>
          </div>

          <div style={{ display: "grid", gap: 12, paddingTop: 10 }}>
            {filteredSections.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => goSection(s.id)}
                className="nd-tile nd-press"
                style={{
                  textAlign: "left",
                  borderRadius: 18,
                  padding: 16,
                  border: `1px solid ${ACCENTS[s.id].border}`,
                  background: `linear-gradient(180deg, ${ACCENTS[s.id].soft}, rgba(255,255,255,0.02))`,
                  boxShadow: `0 18px 44px rgba(0,0,0,0.46), 0 0 0 3px ${ACCENTS[s.id].soft}`,
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
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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

                <div style={{ opacity: 0.55, fontWeight: 900, fontSize: 18 }}>›</div>
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
          {section === "checklists" && <ToolChecklists onUpsell={openUpsell} onToast={(m, t) => toast.push(m, t)} />}

          {section === "calculators" && (
            <>
              {!activeCalc ? (
                <div style={{ display: "grid", gap: 10 }}>
                  <CalcCard title="Velocità infusione" subtitle="ml/h da volume e tempo" icon="⏱️" onClick={() => setActiveCalc("mlh")} />
                  <CalcCard title="Gocce/min" subtitle="Deflussore 20 o 60 gtt" icon="💧" onClick={() => setActiveCalc("gtt")} />
                  <CalcCard title="Dose → ml/h" subtitle="mg/kg/min → ml/h (con concentrazione)" icon="🧪" onClick={() => setActiveCalc("mgkgmin")} />
                  <CalcCard title="MAP" subtitle="Pressione arteriosa media" icon="📈" onClick={() => setActiveCalc("map")} />
                  <CalcCard title="BMI" subtitle="Indice di massa corporea" icon="⚖️" onClick={() => setActiveCalc("bmi")} />
                  <CalcCard title="Diuresi" subtitle="ml/kg/h" icon="🚰" onClick={() => setActiveCalc("diuresi")} />
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
    <button
      type="button"
      onClick={onClick}
      className="nd-tile nd-press"
      style={{
        textAlign: "left",
        borderRadius: 18,
        padding: 14,
        border: `1px solid ${a.border}`,
        background: `linear-gradient(180deg, ${a.soft}, rgba(255,255,255,0.02))`,
        boxShadow: `0 18px 44px rgba(0,0,0,0.46), 0 0 0 3px ${a.soft}`,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
function ToolInteractions({ onSave, onUpsell }: { onSave: (item: UtilityHistoryItem) => void; onUpsell: (t: string, d: string, bullets?: string[]) => void }) {
  type Severity = "ok" | "caution" | "avoid";
  type Interaction = {
    key: string; // drug id OR tag/group key
    sev: Severity;
    why: string;
    monitor?: string[];
    alternatives?: string[]; // premium-only details
  };

  type Entry = {
    id: string;
    name: string;
    group: string;
    also?: string[]; // brand / common aliases
    tags: string[]; // semantic tags used for matching and UI
    interactions: Interaction[];
  };

  const sevRank: Record<Severity, number> = { ok: 0, caution: 1, avoid: 2 };

  const GROUP_META: Record<
    string,
    { label: string; tags: string[]; hint?: string; sevDefault?: Severity }
  > = {
    fans: { label: "FANS", tags: ["Sanguinamento", "Rene"] },
    anticoag: { label: "Anticoagulanti", tags: ["Sanguinamento"] },
    antiagg: { label: "Antiaggreganti", tags: ["Sanguinamento"] },
    ssri: { label: "SSRI", tags: ["SNC", "Sanguinamento"] },
    snri: { label: "SNRI", tags: ["SNC", "Sanguinamento"] },
    serotonina: { label: "Serotonina", tags: ["SNC"] },
    qt: { label: "QT lungo", tags: ["QT"] },
    cyp3a4: { label: "CYP3A4/P-gp", tags: ["SNC"] },
    beta: { label: "Beta-bloccanti", tags: ["SNC"] },
    ccblocker: { label: "Calcio-antagonisti", tags: ["SNC"] },
    digoxin: { label: "Digossina", tags: ["SNC"] },
    nefrotox: { label: "Nefrotossicità", tags: ["Rene"] },
    acei: { label: "ACE-inibitori", tags: ["Rene"] },
    arb: { label: "Sartani", tags: ["Rene"] },
    kplus: { label: "Potassio", tags: ["Rene"] },
    loop: { label: "Diuretici dell'ansa", tags: ["Rene"] },
    ksparing: { label: "Risparmiatori K+", tags: ["Rene"] },
    oppioidi: { label: "Oppioidi", tags: ["SNC"] },
    tramadolo: { label: "Tramadolo", tags: ["SNC", "Serotonina"] },
    linezolid: { label: "Linezolid", tags: ["SNC", "Serotonina"] },
    macrolidi: { label: "Macrolidi", tags: ["QT"] },
    chinoloni: { label: "Fluorochinoloni", tags: ["QT"] },
  };

  // DB locale: “alta resa” per reparto. Estensibile con patch successive.
  const DB: Entry[] = [
    {
      id: "warfarin",
      name: "Warfarin",
      group: "Anticoagulanti",
      also: ["Coumadin"],
      tags: ["anticoag"],
      interactions: [
        { key: "fans", sev: "avoid", why: "Aumenta rischio emorragico (effetto su coagulazione + mucosa gastrica).", monitor: ["Valuta gastroprotezione", "Controlla segni di sanguinamento", "INR più frequente"], alternatives: ["Paracetamolo (se appropriato)", "Valuta COX-2 selettivo con prudenza"] },
        { key: "macrolidi", sev: "avoid", why: "Possibile aumento INR (inibizione metabolismo).", monitor: ["INR stretto 48–72h", "Valuta aggiustamento dose"], alternatives: ["Doxiciclina (se indicata)", "Azitromicina spesso meno impattante ma non sempre"] },
        { key: "amiodarone", sev: "avoid", why: "Aumenta INR: spesso serve riduzione dose e monitoraggio stretto.", monitor: ["INR frequente", "Valuta riduzione dose"], alternatives: ["Valuta DOAC se indicato (decisione medico)"] },
        { key: "ssri", sev: "caution", why: "Rischio sanguinamento aumentato (effetto piastrinico).", monitor: ["Valuta rischio/beneficio", "Educazione segni emorragia"] },
      ],
    },
    {
      id: "apixaban",
      name: "Apixaban",
      group: "DOAC",
      tags: ["anticoag", "doac", "cyp3a4"],
      interactions: [
        { key: "fans", sev: "avoid", why: "Rischio emorragico aumentato (effetto additivo).", monitor: ["Segni di sanguinamento", "Valuta gastroprotezione"] },
        { key: "antiagg", sev: "avoid", why: "Rischio emorragico aumentato con antiaggreganti.", monitor: ["Segni di sanguinamento", "Valuta indicazione clinica"] },
        { key: "cyp3a4", sev: "caution", why: "Inibitori/induttori CYP3A4/P-gp possono alterare i livelli.", monitor: ["Segni di sanguinamento o inefficacia", "Valuta interazioni specifiche"], alternatives: ["Valuta molecola alternativa (decisione medico)"] },
      ],
    },
    {
      id: "rivaroxaban",
      name: "Rivaroxaban",
      group: "DOAC",
      tags: ["anticoag", "doac", "cyp3a4"],
      interactions: [
        { key: "fans", sev: "avoid", why: "Rischio emorragico aumentato (effetto additivo).", monitor: ["Segni di sanguinamento", "Valuta gastroprotezione"] },
        { key: "antiagg", sev: "avoid", why: "Rischio emorragico aumentato con antiaggreganti.", monitor: ["Segni di sanguinamento", "Valuta indicazione clinica"] },
        { key: "cyp3a4", sev: "caution", why: "Interazioni via CYP3A4/P-gp: livelli variabili.", monitor: ["Segni di sanguinamento", "Valuta interazioni specifiche"] },
      ],
    },
    {
      id: "dabigatran",
      name: "Dabigatran",
      group: "DOAC",
      tags: ["anticoag", "doac"],
      interactions: [
        { key: "fans", sev: "avoid", why: "Rischio emorragico aumentato (effetto additivo).", monitor: ["Segni di sanguinamento", "Valuta gastroprotezione"] },
        { key: "antiagg", sev: "avoid", why: "Rischio emorragico aumentato con antiaggreganti.", monitor: ["Segni di sanguinamento", "Valuta indicazione clinica"] },
        { key: "nefrotox", sev: "caution", why: "Peggioramento funzione renale aumenta esposizione.", monitor: ["Creatinina/diuresi", "Segni di sanguinamento"] },
      ],
    },
    {
      id: "eparina",
      name: "Eparina (UFH)",
      group: "Anticoagulanti",
      tags: ["anticoag"],
      interactions: [
        { key: "fans", sev: "avoid", why: "Rischio emorragico aumentato.", monitor: ["Segni di sanguinamento", "Valuta gastroprotezione"] },
        { key: "antiagg", sev: "avoid", why: "Rischio emorragico aumentato con antiaggreganti.", monitor: ["Segni di sanguinamento"] },
      ],
    },
    {
      id: "enoxaparina",
      name: "Enoxaparina",
      group: "Anticoagulanti",
      tags: ["anticoag"],
      interactions: [
        { key: "fans", sev: "avoid", why: "Rischio emorragico aumentato.", monitor: ["Segni di sanguinamento", "Valuta gastroprotezione"] },
        { key: "antiagg", sev: "avoid", why: "Rischio emorragico aumentato con antiaggreganti.", monitor: ["Segni di sanguinamento"] },
      ],
    },
    {
      id: "asa",
      name: "Acido acetilsalicilico",
      group: "Antiaggreganti",
      also: ["Aspirina", "ASA"],
      tags: ["antiagg"],
      interactions: [
        { key: "anticoag", sev: "avoid", why: "Rischio emorragico aumentato con anticoagulanti.", monitor: ["Segni di sanguinamento", "Valuta gastroprotezione"] },
        { key: "fans", sev: "caution", why: "Somma rischio sanguinamento gastrointestinale.", monitor: ["Gastroprotezione se indicata", "Segni di sanguinamento"] },
        { key: "ssri", sev: "caution", why: "Rischio sanguinamento aumentato (effetto piastrinico).", monitor: ["Segni di sanguinamento"] },
      ],
    },
    {
      id: "clopidogrel",
      name: "Clopidogrel",
      group: "Antiaggreganti",
      tags: ["antiagg"],
      interactions: [
        { key: "anticoag", sev: "avoid", why: "Rischio emorragico aumentato con anticoagulanti.", monitor: ["Segni di sanguinamento", "Valuta indicazione clinica"] },
        { key: "fans", sev: "caution", why: "Somma rischio sanguinamento GI.", monitor: ["Gastroprotezione se indicata"] },
      ],
    },
    {
      id: "ibuprofene",
      name: "Ibuprofene",
      group: "FANS",
      tags: ["fans"],
      interactions: [
        { key: "anticoag", sev: "avoid", why: "Rischio emorragico aumentato (additivo).", monitor: ["Segni di sanguinamento", "Valuta gastroprotezione"] },
        { key: "antiagg", sev: "caution", why: "Aumenta rischio sanguinamento GI.", monitor: ["Gastroprotezione se indicata"] },
        { key: "acei", sev: "caution", why: "Possibile riduzione effetto antipertensivo e peggioramento funzione renale.", monitor: ["PA", "Creatinina/diuresi"] },
        { key: "arb", sev: "caution", why: "Possibile peggioramento funzione renale.", monitor: ["Creatinina/diuresi"] },
        { key: "nefrotox", sev: "caution", why: "Rischio renale additivo con altri nefrotossici.", monitor: ["Creatinina/diuresi"] },
      ],
    },
    {
      id: "paracetamolo",
      name: "Paracetamolo",
      group: "Analgesici",
      also: ["Tachipirina"],
      tags: [],
      interactions: [
        { key: "warfarin", sev: "caution", why: "A dosi elevate/prolungate può aumentare INR.", monitor: ["INR se uso prolungato o alte dosi"] },
      ],
    },
    {
      id: "amiodarone",
      name: "Amiodarone",
      group: "Anti-aritmici",
      tags: ["qt", "cyp3a4"],
      interactions: [
        { key: "qt", sev: "avoid", why: "Somma rischio QT lungo/Torsione di punta.", monitor: ["ECG", "K/Mg", "Monitoraggio ritmo"], alternatives: ["Valuta alternativa non QT-prolungante (decisione medico)"] },
        { key: "warfarin", sev: "avoid", why: "Aumenta INR per inibizione metabolismo.", monitor: ["INR stretto", "Aggiusta dose"] },
        { key: "beta", sev: "caution", why: "Bradicardia e blocchi AV (effetto additivo).", monitor: ["FC/PA", "ECG se sintomi"] },
        { key: "digoxin", sev: "avoid", why: "Aumenta livelli di digossina (P-gp): rischio tossicità.", monitor: ["FC/ECG", "Segni tossicità (nausea, aritmie)", "Valuta livelli se disponibili"], alternatives: ["Riduzione dose digossina (decisione medico)"] },
      ],
    },
    {
      id: "metoprololo",
      name: "Metoprololo",
      group: "Beta-bloccanti",
      tags: ["beta"],
      interactions: [
        { key: "ccblocker", sev: "caution", why: "Bradicardia/blocco AV con verapamil/diltiazem.", monitor: ["FC/PA", "ECG se sintomi"] },
        { key: "amiodarone", sev: "caution", why: "Bradicardia e blocchi AV (additivo).", monitor: ["FC/PA"] },
      ],
    },
    {
      id: "verapamil",
      name: "Verapamil",
      group: "Calcio-antagonisti",
      tags: ["ccblocker", "cyp3a4"],
      interactions: [
        { key: "beta", sev: "caution", why: "Bradicardia/blocco AV con beta-bloccanti.", monitor: ["FC/PA", "ECG se sintomi"] },
        { key: "digoxin", sev: "avoid", why: "Aumenta livelli di digossina (P-gp): rischio tossicità.", monitor: ["FC/ECG", "Segni tossicità", "Valuta livelli se disponibili"] },
      ],
    },
    {
      id: "digossina",
      name: "Digossina",
      group: "Cardiovascolari",
      tags: ["digoxin"],
      interactions: [
        { key: "loop", sev: "caution", why: "Ipokaliemia aumenta rischio tossicità da digossina.", monitor: ["K/Mg", "ECG", "Segni tossicità"] },
        { key: "amiodarone", sev: "avoid", why: "Aumenta livelli di digossina: rischio tossicità.", monitor: ["FC/ECG", "Segni tossicità", "Valuta livelli se disponibili"] },
        { key: "ccblocker", sev: "caution", why: "Con verapamil/diltiazem aumenta rischio bradicardia.", monitor: ["FC/ECG"] },
      ],
    },
    {
      id: "furosemide",
      name: "Furosemide",
      group: "Diuretici",
      tags: ["loop"],
      interactions: [
        { key: "digoxin", sev: "caution", why: "Ipokaliemia aumenta rischio tossicità da digossina.", monitor: ["K/Mg", "Segni tossicità digossina"] },
        { key: "nefrotox", sev: "caution", why: "Disidratazione/ipoVolemia può peggiorare funzione renale con nefrotossici.", monitor: ["Diuresi/creatinina"] },
      ],
    },
    {
      id: "spironolattone",
      name: "Spironolattone",
      group: "Diuretici",
      tags: ["ksparing", "kplus"],
      interactions: [
        { key: "acei", sev: "avoid", why: "Rischio iperkaliemia aumentato con ACE-inibitori.", monitor: ["K+", "ECG se iperkaliemia", "Funzione renale"] },
        { key: "arb", sev: "avoid", why: "Rischio iperkaliemia aumentato con sartani.", monitor: ["K+", "Funzione renale"] },
        { key: "kplus", sev: "avoid", why: "Somma di potassio: rischio iperkaliemia.", monitor: ["K+", "ECG se rischio"] },
      ],
    },
    {
      id: "ramipril",
      name: "Ramipril",
      group: "ACE-inibitori",
      tags: ["acei"],
      interactions: [
        { key: "ksparing", sev: "avoid", why: "Rischio iperkaliemia aumentato con risparmiatori di K+.", monitor: ["K+", "Creatinina"] },
        { key: "kplus", sev: "avoid", why: "Supplementi K+ aumentano rischio iperkaliemia.", monitor: ["K+", "Creatinina"] },
        { key: "fans", sev: "caution", why: "Possibile riduzione effetto e rischio renale (triade: ACEi/diuretico/FANS).", monitor: ["PA", "Creatinina/diuresi"] },
      ],
    },
    {
      id: "losartan",
      name: "Losartan",
      group: "Sartani",
      tags: ["arb"],
      interactions: [
        { key: "ksparing", sev: "avoid", why: "Rischio iperkaliemia aumentato con risparmiatori di K+.", monitor: ["K+", "Creatinina"] },
        { key: "kplus", sev: "avoid", why: "Supplementi K+ aumentano rischio iperkaliemia.", monitor: ["K+", "Creatinina"] },
        { key: "fans", sev: "caution", why: "Rischio renale aumentato (ARB + diuretico + FANS).", monitor: ["Creatinina/diuresi", "PA"] },
      ],
    },
    {
      id: "kcl",
      name: "Potassio (KCl)",
      group: "Elettroliti",
      tags: ["kplus"],
      interactions: [
        { key: "acei", sev: "avoid", why: "Rischio iperkaliemia con ACE-inibitori.", monitor: ["K+", "ECG se rischio"] },
        { key: "arb", sev: "avoid", why: "Rischio iperkaliemia con sartani.", monitor: ["K+", "ECG se rischio"] },
        { key: "ksparing", sev: "avoid", why: "Rischio iperkaliemia con risparmiatori di K+.", monitor: ["K+"] },
      ],
    },
    {
      id: "sertralina",
      name: "Sertralina",
      group: "SSRI",
      tags: ["ssri", "serotonina"],
      interactions: [
        { key: "anticoag", sev: "caution", why: "Rischio sanguinamento aumentato (effetto piastrinico).", monitor: ["Segni di sanguinamento"] },
        { key: "linezolid", sev: "avoid", why: "Rischio sindrome serotoninergica (linezolid).", monitor: ["Agitazione, iperreflessia, febbre", "Valuta sospensione/alternativa (decisione medico)"] },
        { key: "tramadolo", sev: "caution", why: "Aumenta rischio sindrome serotoninergica e convulsioni.", monitor: ["Stato mentale", "Tremori/iperreflessia"] },
      ],
    },
    {
      id: "escitalopram",
      name: "Escitalopram",
      group: "SSRI",
      tags: ["ssri", "serotonina", "qt"],
      interactions: [
        { key: "qt", sev: "avoid", why: "Rischio QT lungo (additivo con altri farmaci QT).", monitor: ["ECG se rischio", "Correggi elettroliti"] },
        { key: "anticoag", sev: "caution", why: "Rischio sanguinamento aumentato.", monitor: ["Segni di sanguinamento"] },
        { key: "linezolid", sev: "avoid", why: "Rischio sindrome serotoninergica.", monitor: ["Agitazione, iperreflessia, febbre"] },
      ],
    },
    {
      id: "venlafaxina",
      name: "Venlafaxina",
      group: "SNRI",
      tags: ["snri", "serotonina"],
      interactions: [
        { key: "anticoag", sev: "caution", why: "Rischio sanguinamento aumentato.", monitor: ["Segni di sanguinamento"] },
        { key: "linezolid", sev: "avoid", why: "Rischio sindrome serotoninergica.", monitor: ["Agitazione, iperreflessia, febbre"] },
      ],
    },
    {
      id: "tramadolo",
      name: "Tramadolo",
      group: "Analgesici",
      tags: ["tramadolo", "serotonina", "oppioidi"],
      interactions: [
        { key: "ssri", sev: "caution", why: "Aumenta rischio sindrome serotoninergica e convulsioni.", monitor: ["Stato mentale", "Tremori/iperreflessia"] },
        { key: "snri", sev: "caution", why: "Aumenta rischio sindrome serotoninergica e convulsioni.", monitor: ["Stato mentale", "Tremori/iperreflessia"] },
        { key: "linezolid", sev: "avoid", why: "Rischio elevato di sindrome serotoninergica.", monitor: ["Sintomi neurovegetativi", "Valuta alternativa (decisione medico)"] },
      ],
    },
    {
      id: "linezolid",
      name: "Linezolid",
      group: "Antibiotici",
      tags: ["linezolid", "serotonina"],
      interactions: [
        { key: "ssri", sev: "avoid", why: "Rischio sindrome serotoninergica con SSRI.", monitor: ["Agitazione, iperreflessia, febbre", "Monitoraggio stretto"] },
        { key: "snri", sev: "avoid", why: "Rischio sindrome serotoninergica con SNRI.", monitor: ["Agitazione, iperreflessia, febbre"] },
        { key: "tramadolo", sev: "avoid", why: "Rischio sindrome serotoninergica.", monitor: ["Stato mentale", "Iperreflessia"] },
      ],
    },
    {
      id: "claritromicina",
      name: "Claritromicina",
      group: "Macrolidi",
      also: ["Macrolidi"],
      tags: ["macrolidi", "qt", "cyp3a4"],
      interactions: [
        { key: "cyp3a4", sev: "avoid", why: "Inibitore CYP3A4/P-gp: aumenta livelli di molti farmaci.", monitor: ["Valuta interazioni specifiche", "Sorveglia tossicità"], alternatives: ["Azitromicina (minor inibizione)", "Doxiciclina (se indicata)"] },
        { key: "qt", sev: "avoid", why: "Rischio QT lungo.", monitor: ["ECG se rischio elevato", "Correggi elettroliti"] },
        { key: "digoxin", sev: "avoid", why: "Aumenta livelli di digossina (P-gp).", monitor: ["Segni tossicità digossina", "FC/ECG"] },
        { key: "doac", sev: "caution", why: "Possibile aumento livelli DOAC (P-gp/CYP).", monitor: ["Segni sanguinamento"] },
      ],
    },
    {
      id: "ciprofloxacina",
      name: "Ciprofloxacina",
      group: "Fluorochinoloni",
      also: ["Chinoloni"],
      tags: ["chinoloni", "qt"],
      interactions: [
        { key: "qt", sev: "avoid", why: "Può prolungare QT: rischio additivo.", monitor: ["ECG se rischio", "Correggi elettroliti"] },
      ],
    },
    {
      id: "ondansetron",
      name: "Ondansetron",
      group: "Antiemetici",
      tags: ["qt"],
      interactions: [
        { key: "qt", sev: "avoid", why: "Prolunga QT: rischio additivo con altri farmaci QT.", monitor: ["ECG se rischio", "K/Mg"] },
        { key: "serotonina", sev: "caution", why: "Raro: contributo a quadro serotoninergico in combinazioni multiple.", monitor: ["Stato mentale", "Tremori/iperreflessia"] },
      ],
    },
    {
      id: "haloperidolo",
      name: "Haloperidolo",
      group: "Antipsicotici",
      tags: ["qt", "cns"],
      interactions: [
        { key: "qt", sev: "avoid", why: "Prolunga QT: rischio additivo.", monitor: ["ECG", "K/Mg"] },
        { key: "oppioidi", sev: "caution", why: "Sedazione/dep respiratoria additiva.", monitor: ["FR/SaO2", "Stato di vigilanza"] },
      ],
    },
    {
      id: "quetiapina",
      name: "Quetiapina",
      group: "Antipsicotici",
      tags: ["qt", "cns"],
      interactions: [
        { key: "qt", sev: "avoid", why: "Può prolungare QT: rischio additivo.", monitor: ["ECG se rischio", "K/Mg"] },
        { key: "oppioidi", sev: "caution", why: "Sedazione additiva.", monitor: ["Stato di vigilanza", "FR"] },
      ],
    },
    {
      id: "vancomicina",
      name: "Vancomicina",
      group: "Antibiotici",
      tags: ["nefrotox"],
      interactions: [
        { key: "nefrotox", sev: "caution", why: "Somma rischio nefrotossicità con altri nefrotossici.", monitor: ["Creatinina/diuresi", "Livelli se disponibili"] },
        { key: "gentamicina", sev: "avoid", why: "Rischio nefro/ototossicità aumentato (additivo).", monitor: ["Creatinina/diuresi", "Udito", "Livelli se disponibili"] },
      ],
    },
    {
      id: "gentamicina",
      name: "Gentamicina",
      group: "Aminoglicosidi",
      tags: ["nefrotox"],
      interactions: [
        { key: "nefrotox", sev: "avoid", why: "Rischio nefro/ototossicità additivo.", monitor: ["Creatinina/diuresi", "Udito", "Livelli se disponibili"] },
        { key: "vancomicina", sev: "avoid", why: "Rischio nefro/ototossicità aumentato.", monitor: ["Creatinina/diuresi", "Udito"] },
      ],
    },
  ];

  const isBrowser = () => typeof window !== "undefined";

  function norm(s: string) {
    return s
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9+ ]/g, " ")
      .replace(/\s+/g, " ");
  }

  const byId = useMemo(() => {
    const m = new Map<string, Entry>();
    DB.forEach((e) => m.set(e.id, e));
    return m;
  }, []);

  const searchIndex = useMemo(() => {
    const out: { id: string; text: string }[] = [];
    DB.forEach((e) => {
      const parts = [e.name, e.id, e.group, ...(e.also || [])];
      out.push({ id: e.id, text: norm(parts.join(" ")) });
    });
    return out;
  }, []);

  // UI state
  const [a, setA] = useState<Entry | null>(null);
  const [b, setB] = useState<Entry | null>(null);
  const [qa, setQa] = useState("");
  const [qb, setQb] = useState("");

  const [showAlt, setShowAlt] = useState(false);

  function clearAll() {
    setA(null);
    setB(null);
    setQa("");
    setQb("");
    setShowAlt(false);
  }

  function swap() {
    setA((prevA) => {
      const nextA = b;
      setB(prevA);
      return nextA;
    });
  }

  function matches(e: Entry, q: string) {
    const nq = norm(q);
    if (!nq) return true;
    const hit = searchIndex.find((x) => x.id === e.id);
    if (!hit) return false;
    // allow multi-token match
    return nq.split(" ").every((t) => hit.text.includes(t));
  }

  const listA = useMemo(() => {
    const q = qa.trim();
    if (!q) return DB.slice(0, 18);
    return DB.filter((e) => matches(e, q)).slice(0, 24);
  }, [qa]);

  const listB = useMemo(() => {
    const q = qb.trim();
    if (!q) return DB.slice(0, 18);
    return DB.filter((e) => matches(e, q)).slice(0, 24);
  }, [qb]);

  function getMatches(from: Entry, other: Entry): Interaction[] {
    const otherKeys = new Set<string>([other.id, ...(other.tags || [])]);
    // also match groups by tags: if key is present in other.tags, it matches
    const hits: Interaction[] = [];
    from.interactions.forEach((it) => {
      if (otherKeys.has(it.key)) hits.push(it);
    });
    return hits;
  }

  function inferTags(seedA: string, seedB: string, why: string, monitor: string[]) {
    const s = `${seedA} ${seedB} ${why} ${monitor.join(" ")}`.toLowerCase();
    const tags: string[] = [];
    const push = (t: string) => {
      if (!tags.includes(t)) tags.push(t);
    };
    if (s.includes("qt")) push("QT");
    if (s.includes("torsione") || s.includes("ecg")) push("QT");
    if (s.includes("creatin") || s.includes("diuresi") || s.includes("ren")) push("Rene");
    if (s.includes("sanguin") || s.includes("emorrag") || s.includes("inr")) push("Sanguinamento");
    if (s.includes("sedaz") || s.includes("convuls") || s.includes("stato mentale") || s.includes("seroton")) push("SNC");
    return tags;
  }

  const result = useMemo(() => {
    if (!a || !b) return null;

    const hitsAB = getMatches(a, b);
    const hitsBA = getMatches(b, a);
    const all = [...hitsAB, ...hitsBA];

    let worst: Interaction | null = null;
    all.forEach((it) => {
      if (!worst || sevRank[it.sev] > sevRank[worst.sev]) worst = it;
    });

    const sev: Severity = worst?.sev || "ok";
    const why =
      worst?.why ||
      "Nessuna interazione clinicamente rilevante presente nel database locale per questa coppia.";
    const monitor =
      worst?.monitor?.length
        ? worst.monitor
        : ["Monitoraggio clinico standard in base al paziente e al contesto."];
    const alternatives = worst?.alternatives || [];

    // Collect UI tags from matched keys + heuristic
    const uiTags: string[] = [];
    const matchedKeys = new Set<string>();
    all.forEach((it) => matchedKeys.add(it.key));
    matchedKeys.forEach((k) => {
      const meta = GROUP_META[k];
      if (meta?.tags?.length) meta.tags.forEach((t) => (uiTags.includes(t) ? null : uiTags.push(t)));
    });
    inferTags(a.id, b.id, why, monitor).forEach((t) => (uiTags.includes(t) ? null : uiTags.push(t)));

    return {
      sev,
      why,
      monitor,
      alternatives,
      tags: uiTags,
      title:
        sev === "avoid" ? "Da evitare" : sev === "caution" ? "Attenzione" : "Compatibile",
    };
  }, [a, b]);

  const sevStyle = (sev: Severity) => {
    if (sev === "avoid")
      return { bg: "rgba(244,63,94,0.16)", br: "rgba(244,63,94,0.45)", text: "rgba(255,255,255,0.96)" };
    if (sev === "caution")
      return { bg: "rgba(245,158,11,0.14)", br: "rgba(245,158,11,0.40)", text: "rgba(255,255,255,0.96)" };
    return { bg: "rgba(16,185,129,0.14)", br: "rgba(16,185,129,0.40)", text: "rgba(255,255,255,0.96)" };
  };

  async function share(text: string) {
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return true;
      }
    } catch {}
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {}
    return false;
  }

  function saveToHistory() {
    if (!a || !b || !result) return;
    const out = `${a.name} + ${b.name}: ${result.title}\n- ${result.why}\nMonitoraggio: ${result.monitor.join("; ")}`;
    onSave({
      tool: "INTERACTIONS",
      ts: Date.now(),
      inputs: { a: a.id, b: b.id },
      output: out,
    });
  }

  const premium = isPremium();

  const pill = (label: string, tone: "muted" | "ok" | "caution" | "avoid" = "muted") => {
    const base = { borderRadius: 999, padding: "6px 10px", fontSize: 12, fontWeight: 950 as const, letterSpacing: -0.2 };
    const toneStyle =
      tone === "avoid"
        ? { border: "1px solid rgba(244,63,94,0.35)", background: "rgba(244,63,94,0.12)" }
        : tone === "caution"
        ? { border: "1px solid rgba(245,158,11,0.35)", background: "rgba(245,158,11,0.10)" }
        : tone === "ok"
        ? { border: "1px solid rgba(16,185,129,0.35)", background: "rgba(16,185,129,0.10)" }
        : { border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.06)" };
    return <span style={{ ...base, ...toneStyle }}>{label}</span>;
  };

  return (
    <div className="nd-surface" style={{ padding: 14, borderRadius: 18, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div>
          <div style={{ fontWeight: 1000, fontSize: 18, letterSpacing: -0.4 }}>Interazioni farmacologiche</div>
          <div style={{ opacity: 0.72, fontSize: 12, marginTop: 2 }}>Seleziona 2 farmaci: risposta immediata (database locale).</div>
        </div>
        <button
          type="button"
          className="nd-btn nd-btn-ghost nd-press"
          style={{ borderRadius: 999, padding: "8px 12px" }}
          onClick={() =>
            onUpsell(
              "Utility Premium",
              "Sblocca alternative terapeutiche e preferiti avanzati.",
              ["Alternative quando presenti", "Preferiti riordinabili", "Aggiornamenti database"]
            )
          }
        >
          Premium
        </button>
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 10, gridTemplateColumns: "1fr" }}>
        {/* Picker A */}
        <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 16, padding: 12, background: "rgba(0,0,0,0.20)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontWeight: 950, fontSize: 13, opacity: 0.9 }}>Farmaco 1</div>
            {a ? <button type="button" className="nd-btn nd-btn-ghost nd-press" style={{ padding: "6px 10px", borderRadius: 999 }} onClick={() => setA(null)}>Cambia</button> : null}
          </div>

          {a ? (
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontWeight: 1000 }}>{a.name}</div>
                <div style={{ opacity: 0.7, fontSize: 12 }}>{a.group}</div>
              </div>
            </div>
          ) : (
            <>
              <input
                value={qa}
                onChange={(e) => setQa(e.target.value)}
                placeholder="Cerca farmaco..."
                style={{ width: "100%", marginTop: 8, padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.25)", color: "rgba(255,255,255,0.92)" }}
              />
              <div style={{ marginTop: 8, maxHeight: 220, overflow: "auto", borderRadius: 12 }}>
                {listA.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    className="nd-press"
                    onClick={() => { setA(e); setQa(""); }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 12px",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.03)",
                      marginBottom: 8,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 950 }}>{e.name}</div>
                    <div style={{ opacity: 0.7, fontSize: 12 }}>{e.group}</div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Picker B */}
        <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 16, padding: 12, background: "rgba(0,0,0,0.20)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontWeight: 950, fontSize: 13, opacity: 0.9 }}>Farmaco 2</div>
            <div style={{ display: "flex", gap: 8 }}>
              {(a && b) ? (
                <button type="button" className="nd-btn nd-btn-ghost nd-press" style={{ padding: "6px 10px", borderRadius: 999 }} onClick={swap}>↔</button>
              ) : null}
              {b ? <button type="button" className="nd-btn nd-btn-ghost nd-press" style={{ padding: "6px 10px", borderRadius: 999 }} onClick={() => setB(null)}>Cambia</button> : null}
            </div>
          </div>

          {b ? (
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontWeight: 1000 }}>{b.name}</div>
                <div style={{ opacity: 0.7, fontSize: 12 }}>{b.group}</div>
              </div>
            </div>
          ) : (
            <>
              <input
                value={qb}
                onChange={(e) => setQb(e.target.value)}
                placeholder="Cerca farmaco..."
                style={{ width: "100%", marginTop: 8, padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.25)", color: "rgba(255,255,255,0.92)" }}
              />
              <div style={{ marginTop: 8, maxHeight: 220, overflow: "auto", borderRadius: 12 }}>
                {listB.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    className="nd-press"
                    onClick={() => { setB(e); setQb(""); }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 12px",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.03)",
                      marginBottom: 8,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 950 }}>{e.name}</div>
                    <div style={{ opacity: 0.7, fontSize: 12 }}>{e.group}</div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Result */}
        {a && b && result ? (
          <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 18, padding: 14, background: "rgba(255,255,255,0.03)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 1000, fontSize: 15, letterSpacing: -0.2 }}>{a.name} + {b.name}</div>
                <div style={{ opacity: 0.68, fontSize: 12, marginTop: 2 }}>{a.group} • {b.group}</div>
              </div>
              <div style={{ borderRadius: 999, padding: "6px 10px", border: `1px solid ${sevStyle(result.sev).br}`, background: sevStyle(result.sev).bg, fontWeight: 1000, fontSize: 12 }}>
                {result.title}
              </div>
            </div>

            {result.tags?.length ? (
              <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
                {result.tags.slice(0, 4).map((t) => pill(t, result.sev === "avoid" ? "avoid" : result.sev === "caution" ? "caution" : "ok"))}
              </div>
            ) : null}

            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 950 }}>Perché</div>
              <div style={{ marginTop: 4, opacity: 0.92, lineHeight: 1.35 }}>{result.why}</div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 950 }}>Monitoraggio consigliato</div>
              <ul style={{ marginTop: 6, paddingLeft: 18, opacity: 0.92, lineHeight: 1.35 }}>
                {result.monitor.slice(0, 5).map((m, i) => <li key={i}>{m}</li>)}
              </ul>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 950 }}>Alternative terapeutiche</div>
                {!premium && result.alternatives.length ? (
                  <button type="button" className="nd-btn nd-btn-ghost nd-press" style={{ padding: "6px 10px", borderRadius: 999 }} onClick={() => onUpsell("Alternative (Premium)", "Sblocca alternative e note aggiuntive.", ["Alternative quando presenti", "Aggiornamenti database"])}>
                    Sblocca
                  </button>
                ) : null}
              </div>

              {result.alternatives.length ? (
                premium ? (
                  <ul style={{ marginTop: 6, paddingLeft: 18, opacity: 0.92, lineHeight: 1.35 }}>
                    {result.alternatives.slice(0, 4).map((m, i) => <li key={i}>{m}</li>)}
                  </ul>
                ) : (
                  <div style={{ marginTop: 6, opacity: 0.78 }}>
                    {pill("Disponibili (Premium)", "muted")}
                  </div>
                )
              ) : (
                <div style={{ marginTop: 6, opacity: 0.78 }}>Nessuna alternativa specifica presente per questa coppia.</div>
              )}
            </div>

            <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="button" className="nd-btn nd-btn-primary nd-press" style={{ borderRadius: 999, padding: "10px 14px" }} onClick={saveToHistory}>
                Salva
              </button>
              <button
                type="button"
                className="nd-btn nd-btn-ghost nd-press"
                style={{ borderRadius: 999, padding: "10px 14px" }}
                onClick={async () => {
                  const out = `${a.name} + ${b.name}: ${result.title}\nPerché: ${result.why}\nMonitoraggio: ${result.monitor.join("; ")}`;
                  const ok = await share(out);
                  // no toast here (Tool is inside UtilityHub, use onUpsell for now is heavy). Silent.
                  if (!ok) {
                    try { /* noop */ } catch {}
                  }
                }}
              >
                Condividi
              </button>
              <button type="button" className="nd-btn nd-btn-ghost nd-press" style={{ borderRadius: 999, padding: "10px 14px" }} onClick={clearAll}>
                Nuova ricerca
              </button>
            </div>

            <div style={{ marginTop: 10, opacity: 0.55, fontSize: 11 }}>
              Nota: database locale educativo. In caso di dubbio, verifica su fonti ufficiali e considera condizioni del paziente.
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

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
      <CalcOut out={out} onToast={onToast} />
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
      <CalcOut out={out} onToast={onToast} />
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
      <CalcOut out={out} onToast={onToast} />
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
      <CalcOut out={out} onToast={onToast} />
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
      <CalcOut out={out} onToast={onToast} />
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
      <CalcOut out={out} onToast={onToast} />
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

function NumRow({
  label,
  value,
  setValue,
  step,
  min,
  max,
}: {
  label: string;
  value: number;
  setValue: (n: number) => void;
  step?: number;
  min?: number;
  max?: number;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 10 }}>
      <div style={{ fontWeight: 850, opacity: 0.9 }}>{label}</div>
      <input
        type="number"
        value={value}
        step={step}
        min={min}
        max={max}
        onChange={(e) => {
          const raw = Number(e.target.value);
          if (!Number.isFinite(raw)) return setValue(0);
          let next = raw;
          if (typeof min === "number") next = Math.max(min, next);
          if (typeof max === "number") next = Math.min(max, next);
          setValue(next);
        }}
        style={inputStyle()}
      />
    </div>
  );
}

function CalcOut({ out, onToast }: { out: string; onToast: (msg: string, type?: any) => void }) {
  const canCopy = !!out;
  return (
    <div style={{ marginTop: 12, borderRadius: 14, padding: 12, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.12)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 900 }}>Risultato</div>
        <button
          type="button"
          className="nd-press"
          onClick={() => {
            if (!canCopy) return;
            const ok = copyTextToClipboard(out);
            onToast(ok ? "Copiato" : "Impossibile copiare", ok ? "success" : "warning");
          }}
          style={{
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.12)",
            background: canCopy ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
            opacity: canCopy ? 1 : 0.55,
            fontWeight: 900,
            cursor: canCopy ? "pointer" : "not-allowed",
            whiteSpace: "nowrap",
          }}
        >
          Copia
        </button>
      </div>
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
