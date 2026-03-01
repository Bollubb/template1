import React, { useMemo, useState, useEffect } from "react";
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
  interactionsPairs: "nd_utility_interactions_pairs_v1",
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

  type FavPair = { a: string; b: string; ts: number };
  const [favPairs, setFavPairs] = useState<FavPair[]>(() => {
    if (!isBrowser()) return [];
    return safeJson<FavPair[]>(localStorage.getItem(LS.interactionsPairs as any), []);
  });
  const writeFavPairs = (next: FavPair[]) => {
    setFavPairs(next);
    if (!isBrowser()) return;
    try {
      localStorage.setItem(LS.interactionsPairs as any, JSON.stringify(next.slice(0, 30)));
    } catch {}
  };
  const pairKey = (x: string, y: string) => (x < y ? `${x}__${y}` : `${y}__${x}`);
  const hasPair = (x: string, y: string) => favPairs.some((p) => pairKey(p.a, p.b) === pairKey(x, y));
  const addPair = (x: string, y: string) => {
    const key = pairKey(x, y);
    const next = [{ a: x, b: y, ts: Date.now() }, ...favPairs.filter((p) => pairKey(p.a, p.b) !== key)].slice(0, 30);
    writeFavPairs(next);
  };
  const removePair = (x: string, y: string) => {
    const key = pairKey(x, y);
    writeFavPairs(favPairs.filter((p) => pairKey(p.a, p.b) !== key));
  };

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
    <div style={{ borderRadius: 22, padding: 18, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.05)", boxShadow: "0 18px 40px rgba(0,0,0,0.35)" }}>
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
  const DB_BASE: Entry[] = [
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

    
    // ---- Estensione DB (alta resa infermieristica) ----
    {
      id: "apixaban",
      name: "Apixaban",
      group: "DOAC",
      interactions: [
        { key: "antiagg", sev: "avoid", why: "Somma rischio emorragico con antiaggreganti.", monitor: ["Valuta segni di sanguinamento", "Valuta indicazione clinica"], alternatives: ["Monoterapia se appropriata (decisione medico)"] },
        { key: "fans", sev: "avoid", why: "Aumenta rischio emorragico (mucosa + piastrine).", monitor: ["Educazione segni di sanguinamento", "Valuta gastroprotezione"] },
        { key: "cyp3a4", sev: "caution", why: "Interazioni metaboliche possibili (CYP3A4/P-gp).", monitor: ["Sorveglia sanguinamenti", "Valuta farmaci concomitanti"] },
      ],
    },
    {
      id: "enoxaparina",
      name: "Enoxaparina",
      group: "Eparine",
      interactions: [
        { key: "antiagg", sev: "avoid", why: "Somma rischio emorragico (eparina + antiaggregante).", monitor: ["Controlla ematomi/sanguinamenti", "Valuta Hb se indicato"] },
        { key: "fans", sev: "avoid", why: "Somma rischio emorragico.", monitor: ["Segni emorragia", "Valuta gastroprotezione"] },
      ],
    },
    {
      id: "aspirina",
      name: "Acido acetilsalicilico",
      group: "Antiaggreganti",
      also: ["ASA"],
      interactions: [
        { key: "anticoag", sev: "avoid", why: "Somma rischio emorragico con anticoagulanti.", monitor: ["Segni sanguinamento", "Valuta Hb/ematocrito se indicato"] },
        { key: "fans", sev: "avoid", why: "Somma gastrolesività e rischio emorragico.", monitor: ["Valuta gastroprotezione"] },
      ],
    },
    {
      id: "clopidogrel",
      name: "Clopidogrel",
      group: "Antiaggreganti",
      interactions: [
        { key: "ppi", sev: "caution", why: "Alcuni PPI possono ridurre attivazione (CYP2C19).", monitor: ["Valuta scelta PPI", "Sorveglia efficacia antiaggregante secondo indicazione"] },
        { key: "anticoag", sev: "avoid", why: "Somma rischio emorragico.", monitor: ["Segni sanguinamento"] },
      ],
    },
    {
      id: "ramipril",
      name: "Ramipril",
      group: "ACE-inibitori",
      interactions: [
        { key: "k", sev: "caution", why: "Rischio iperkaliemia (specie con risparmiatori di K).", monitor: ["K sierico", "ECG se K elevato"] },
        { key: "diuretici", sev: "caution", why: "Ipotensione/insufficienza renale in associazione.", monitor: ["PA", "Creatinina", "Diuresi"] },
      ],
    },
    {
      id: "losartan",
      name: "Losartan",
      group: "ARB",
      interactions: [
        { key: "k", sev: "caution", why: "Rischio iperkaliemia.", monitor: ["K sierico", "Monitoraggio ECG se rischio"] },
        { key: "diuretici", sev: "caution", why: "Ipotensione/creatinina ↑ in associazione.", monitor: ["PA", "Creatinina", "Diuresi"] },
      ],
    },
    {
      id: "spironolattone",
      name: "Spironolattone",
      group: "Diuretici",
      interactions: [
        { key: "acei", sev: "caution", why: "Somma rischio iperkaliemia (ACEi/ARB + risparmiatore K).", monitor: ["K sierico", "Segni iperkaliemia"] },
        { key: "arb", sev: "caution", why: "Somma rischio iperkaliemia.", monitor: ["K sierico"] },
      ],
    },
    {
      id: "furosemide",
      name: "Furosemide",
      group: "Diuretici",
      interactions: [
        { key: "nefro", sev: "caution", why: "Rischio disidratazione/AKI con farmaci nefrotossici o ipovolemia.", monitor: ["Diuresi", "Creatinina", "PA"] },
        { key: "digossina", sev: "caution", why: "Ipokaliemia può aumentare tossicità da digossina.", monitor: ["K/Mg", "Segni tossicità digossina", "ECG"] },
      ],
    },
    {
      id: "digossina",
      name: "Digossina",
      group: "Cardiovascolari",
      interactions: [
        { key: "amiodarone", sev: "avoid", why: "Aumenta livelli di digossina (P-gp) → tossicità.", monitor: ["ECG", "Segni tossicità (nausea, aritmie)", "Valuta livello se indicato"], alternatives: ["Valuta riduzione dose (decisione medico)"] },
        { key: "macrolidi", sev: "caution", why: "Possibile aumento livelli e aritmie.", monitor: ["ECG", "Sintomi"] },
      ],
    },
    {
      id: "litio",
      name: "Litio",
      group: "Psichiatria",
      interactions: [
        { key: "diuretici", sev: "avoid", why: "Diuretici (specie tiazidici) aumentano livelli di litio.", monitor: ["Segni tossicità (tremore, confusione)", "Valuta livelli"] },
        { key: "fans", sev: "avoid", why: "FANS possono aumentare livelli di litio.", monitor: ["Segni tossicità", "Valuta alternative analgesiche"] },
        { key: "acei", sev: "caution", why: "ACEi possono aumentare livelli di litio.", monitor: ["Segni tossicità", "Valuta livelli"] },
      ],
    },
    {
      id: "metformina",
      name: "Metformina",
      group: "Antidiabetici",
      interactions: [
        { key: "nefro", sev: "caution", why: "Rischio accumulo in insufficienza renale (lattacidosi).", monitor: ["Creatinina/eGFR", "Segni acidosi lattica"] },
      ],
    },
    {
      id: "insulina",
      name: "Insulina",
      group: "Antidiabetici",
      interactions: [
        { key: "beta", sev: "caution", why: "Beta-bloccanti possono mascherare ipoglicemia.", monitor: ["Glicemie ravvicinate", "Educazione sintomi atipici"] },
        { key: "cortico", sev: "caution", why: "Corticosteroidi aumentano glicemia → necessità aggiustamento.", monitor: ["Glicemie", "Schema insulinico"] },
      ],
    },
    {
      id: "tramadolo",
      name: "Tramadolo",
      group: "Analgesici",
      interactions: [
        { key: "serotonina", sev: "avoid", why: "Rischio sindrome serotoninergica con SSRI/SNRI/MAOI/linezolid.", monitor: ["Agitazione, iperreflessia, febbre", "Allerta medico"] },
        { key: "cns", sev: "caution", why: "Depressione SNC con sedativi/oppiacei/benzodiazepine.", monitor: ["FR/SpO2", "Sedazione"] },
      ],
    },
    {
      id: "morfina",
      name: "Morfina",
      group: "Oppioidi",
      interactions: [
        { key: "cns", sev: "avoid", why: "Depressione respiratoria con benzodiazepine/altri sedativi.", monitor: ["FR/SpO2", "Sedazione", "Scala dolore"] },
      ],
    },


    // chiavi di gruppo “virtuali” (non selezionabili) usate come regole
    { id: "fans", name: "FANS (gruppo)", group: "GRP", interactions: [] },
    { id: "qt", name: "Farmaci QT-prolunganti (gruppo)", group: "GRP", interactions: [] },
    { id: "cyp3a4", name: "Substrati CYP3A4 (gruppo)", group: "GRP", interactions: [] },
    { id: "beta", name: "Beta-bloccanti (gruppo)", group: "GRP", interactions: [] },
    { id: "calcio", name: "Calcio-antagonisti (gruppo)", group: "GRP", interactions: [] },
    { id: "macrolidi", name: "Macrolidi (gruppo)", group: "GRP", interactions: [] },
    
    { id: "doac", name: "DOAC (gruppo)", group: "GRP", interactions: [] },
    { id: "anticoag", name: "Anticoagulanti (gruppo)", group: "GRP", interactions: [] },
    { id: "antiagg", name: "Antiaggreganti (gruppo)", group: "GRP", interactions: [] },
    { id: "acei", name: "ACE-inibitori (gruppo)", group: "GRP", interactions: [] },
    { id: "arb", name: "ARB (gruppo)", group: "GRP", interactions: [] },
    { id: "diuretici", name: "Diuretici (gruppo)", group: "GRP", interactions: [] },
    { id: "k", name: "Farmaci che aumentano K (gruppo)", group: "GRP", interactions: [] },
    { id: "nefro", name: "Nefrotossici/AKI risk (gruppo)", group: "GRP", interactions: [] },
    { id: "serotonina", name: "Serotoninergici (gruppo)", group: "GRP", interactions: [] },
    { id: "digossina", name: "Digossina (gruppo)", group: "GRP", interactions: [] },
    { id: "ppi", name: "PPI (gruppo)", group: "GRP", interactions: [] },
    { id: "cortico", name: "Corticosteroidi (gruppo)", group: "GRP", interactions: [] },
    { id: "cns", name: "Depressori SNC (gruppo)", group: "GRP", interactions: [] },

    { id: "linezolid", name: "Linezolid", group: "Antibiotici", interactions: [] },
  ];

  const DB_EXTRA: Entry[] = [
    {
      id: "edoxaban",
      name: "Edoxaban",
      group: "Anticoagulanti",
      also: ["Lixiana"],
      interactions: [],
    },
    {
      id: "acenocumarolo",
      name: "Acenocumarolo",
      group: "Anticoagulanti",
      also: ["Sintrom"],
      interactions: [],
    },
    {
      id: "argatroban",
      name: "Argatroban",
      group: "Anticoagulanti",
      interactions: [],
    },
    {
      id: "bivalirudina",
      name: "Bivalirudina",
      group: "Anticoagulanti",
      interactions: [],
    },
    {
      id: "dalteparina",
      name: "Dalteparina",
      group: "Eparine",
      also: ["Fragmin"],
      interactions: [],
    },
    {
      id: "nadroparina",
      name: "Nadroparina",
      group: "Eparine",
      also: ["Fraxiparina"],
      interactions: [],
    },
    {
      id: "dipiridamolo",
      name: "Dipiridamolo",
      group: "Antiaggreganti",
      also: ["Persantin"],
      interactions: [],
    },
    {
      id: "ticlopidina",
      name: "Ticlopidina",
      group: "Antiaggreganti",
      also: ["Tiklid"],
      interactions: [],
    },
    {
      id: "cilostazolo",
      name: "Cilostazolo",
      group: "Antiaggreganti",
      also: ["Pletal"],
      interactions: [],
    },
    {
      id: "piroxicam",
      name: "Piroxicam",
      group: "FANS",
      also: ["Feldene"],
      interactions: [],
    },
    {
      id: "meloxicam",
      name: "Meloxicam",
      group: "FANS",
      also: ["Mobic"],
      interactions: [],
    },
    {
      id: "nimesulide",
      name: "Nimesulide",
      group: "FANS",
      also: ["Aulin"],
      interactions: [],
    },
    {
      id: "ketoprofene",
      name: "Ketoprofene",
      group: "FANS",
      also: ["Oki"],
      interactions: [],
    },
    {
      id: "dexketoprofene",
      name: "Dexketoprofene",
      group: "FANS",
      also: ["Enantyum"],
      interactions: [],
    },
    {
      id: "paracetamolo",
      name: "Paracetamolo",
      group: "Analgesici",
      also: ["Tachipirina", "Efferalgan"],
      interactions: [],
    },
    {
      id: "amoxicillina",
      name: "Amoxicillina",
      group: "Beta-lattamici",
      also: ["Amoxil"],
      interactions: [],
    },
    {
      id: "amoxclav",
      name: "Amoxicillina/Acido clavulanico",
      group: "Beta-lattamici",
      also: ["Augmentin"],
      interactions: [],
    },
    {
      id: "piptazo",
      name: "Piperacillina/Tazobactam",
      group: "Beta-lattamici",
      also: ["Tazocin"],
      interactions: [],
    },
    {
      id: "cefazolina",
      name: "Cefazolina",
      group: "Cefalosporine",
      interactions: [],
    },
    {
      id: "cefuroxima",
      name: "Cefuroxima",
      group: "Cefalosporine",
      also: ["Zinnat"],
      interactions: [],
    },
    {
      id: "cefotaxime",
      name: "Cefotaxime",
      group: "Cefalosporine",
      interactions: [],
    },
    {
      id: "ceftazidime",
      name: "Ceftazidime",
      group: "Cefalosporine",
      interactions: [],
    },
    {
      id: "cefepime",
      name: "Cefepime",
      group: "Cefalosporine",
      interactions: [],
    },
    {
      id: "meropenem",
      name: "Meropenem",
      group: "Carbapenemi",
      also: ["Meronem"],
      interactions: [],
    },
    {
      id: "imipenem-cilastatina",
      name: "Imipenem/Cilastatina",
      group: "Carbapenemi",
      also: ["Tienam"],
      interactions: [],
    },
    {
      id: "ertapenem",
      name: "Ertapenem",
      group: "Carbapenemi",
      also: ["Invanz"],
      interactions: [],
    },
    {
      id: "vancomicina",
      name: "Vancomicina",
      group: "Glicopeptidi",
      also: ["Vancocin"],
      interactions: [],
    },
    {
      id: "teicoplanina",
      name: "Teicoplanina",
      group: "Glicopeptidi",
      also: ["Targocid"],
      interactions: [],
    },
    {
      id: "gentamicina",
      name: "Gentamicina",
      group: "Aminoglicosidi",
      also: ["Gentalyn"],
      interactions: [],
    },
    {
      id: "amikacina",
      name: "Amikacina",
      group: "Aminoglicosidi",
      interactions: [],
    },
    {
      id: "tobramicina",
      name: "Tobramicina",
      group: "Aminoglicosidi",
      interactions: [],
    },
    {
      id: "linezolid",
      name: "Linezolid",
      group: "Oxazolidinoni",
      also: ["Zyvox"],
      interactions: [],
    },
    {
      id: "daptomicina",
      name: "Daptomicina",
      group: "Lipopeptidi",
      also: ["Cubicin"],
      interactions: [],
    },
    {
      id: "doxiciclina",
      name: "Doxiciclina",
      group: "Tetracicline",
      also: ["Bassado"],
      interactions: [],
    },
    {
      id: "minociclina",
      name: "Minociclina",
      group: "Tetracicline",
      interactions: [],
    },
    {
      id: "metronidazolo",
      name: "Metronidazolo",
      group: "Antibiotici",
      also: ["Flagyl"],
      interactions: [],
    },
    {
      id: "clindamicina",
      name: "Clindamicina",
      group: "Lincosamidi",
      also: ["Dalacin"],
      interactions: [],
    },
    {
      id: "rifaximina",
      name: "Rifaximina",
      group: "Antibiotici",
      also: ["Normix"],
      interactions: [],
    },
    {
      id: "nitrofurantoina",
      name: "Nitrofurantoina",
      group: "Antibiotici",
      also: ["Macrobid"],
      interactions: [],
    },
    {
      id: "ondansetron",
      name: "Ondansetron",
      group: "Antiemetici",
      also: ["Zofran"],
      interactions: [],
    },
    {
      id: "domperidone",
      name: "Domperidone",
      group: "Gastroprocin.",
      also: ["Motilium"],
      interactions: [],
    },
    {
      id: "metadone",
      name: "Metadone",
      group: "Oppioidi",
      interactions: [],
    },
    {
      id: "amlodipina",
      name: "Amlodipina",
      group: "Calcio-antagonisti",
      also: ["Norvasc"],
      interactions: [],
    },
    {
      id: "nifedipina",
      name: "Nifedipina",
      group: "Calcio-antagonisti",
      also: ["Adalat"],
      interactions: [],
    },
    {
      id: "ivabradina",
      name: "Ivabradina",
      group: "Antianginosi",
      also: ["Procoralan"],
      interactions: [],
    },
    {
      id: "nitroglicerina",
      name: "Nitroglicerina",
      group: "Nitrati",
      also: ["Nitroderm"],
      interactions: [],
    },
    {
      id: "isosorbide-mononitrato",
      name: "Isosorbide mononitrato",
      group: "Nitrati",
      also: ["Monoket"],
      interactions: [],
    },
    {
      id: "levotiroxina",
      name: "Levotiroxina",
      group: "Ormoni tiroidei",
      also: ["Eutirox"],
      interactions: [],
    },
    {
      id: "metilprednisolone",
      name: "Metilprednisolone",
      group: "Corticosteroidi",
      also: ["Urbason"],
      interactions: [],
    },
    {
      id: "allopurinolo",
      name: "Allopurinolo",
      group: "Metabolismo",
      also: ["Zyloric"],
      interactions: [],
    },
    {
      id: "colchicina",
      name: "Colchicina",
      group: "Metabolismo",
      also: ["Colchicina"],
      interactions: [],
    },
    {
      id: "alprazolam",
      name: "Alprazolam",
      group: "Benzodiazepine",
      also: ["Xanax"],
      interactions: [],
    },
    {
      id: "mirtazapina",
      name: "Mirtazapina",
      group: "Antidepressivi",
      also: ["Remeron"],
      interactions: [],
    },
    {
      id: "bupropione",
      name: "Bupropione",
      group: "Antidepressivi",
      also: ["Wellbutrin"],
      interactions: [],
    },
    {
      id: "trazodone",
      name: "Trazodone",
      group: "Antidepressivi",
      also: ["Trittico"],
      interactions: [],
    },
    {
      id: "atorvastatina",
      name: "Atorvastatina",
      group: "Lipidici",
      interactions: [],
    },
    {
      id: "simvastatina",
      name: "Simvastatina",
      group: "Lipidici",
      interactions: [],
    },
    {
      id: "rosuvastatina",
      name: "Rosuvastatina",
      group: "Lipidici",
      interactions: [],
    },
    {
      id: "pravastatina",
      name: "Pravastatina",
      group: "Lipidici",
      interactions: [],
    },
    {
      id: "ezetimibe",
      name: "Ezetimibe",
      group: "Lipidici",
      interactions: [],
    },
    {
      id: "fenofibrato",
      name: "Fenofibrato",
      group: "Lipidici",
      interactions: [],
    },
    {
      id: "omeprazolo",
      name: "Omeprazolo",
      group: "Gastroprotettori",
      interactions: [],
    },
    {
      id: "esomeprazolo",
      name: "Esomeprazolo",
      group: "Gastroprotettori",
      interactions: [],
    },
    {
      id: "pantoprazolo",
      name: "Pantoprazolo",
      group: "Gastroprotettori",
      interactions: [],
    },
    {
      id: "lansoprazolo",
      name: "Lansoprazolo",
      group: "Gastroprotettori",
      interactions: [],
    },
    {
      id: "rabeprazolo",
      name: "Rabeprazolo",
      group: "Gastroprotettori",
      interactions: [],
    },
    {
      id: "ceftriaxone",
      name: "Ceftriaxone",
      group: "Cefalosporine",
      interactions: [],
    },
    {
      id: "cefixime",
      name: "Cefixime",
      group: "Cefalosporine",
      interactions: [],
    },
    {
      id: "cefalexina",
      name: "Cefalexina",
      group: "Cefalosporine",
      interactions: [],
    },
    {
      id: "cefadroxil",
      name: "Cefadroxil",
      group: "Cefalosporine",
      interactions: [],
    },
    {
      id: "cefaclor",
      name: "Cefaclor",
      group: "Cefalosporine",
      interactions: [],
    },
    {
      id: "azitromicina",
      name: "Azitromicina",
      group: "Macrolidi",
      interactions: [],
    },
    {
      id: "eritromicina",
      name: "Eritromicina",
      group: "Macrolidi",
      interactions: [],
    },
    {
      id: "fluconazolo",
      name: "Fluconazolo",
      group: "Azoli",
      interactions: [],
    },
    {
      id: "itraconazolo",
      name: "Itraconazolo",
      group: "Azoli",
      interactions: [],
    },
    {
      id: "voriconazolo",
      name: "Voriconazolo",
      group: "Azoli",
      interactions: [],
    },
    {
      id: "posaconazolo",
      name: "Posaconazolo",
      group: "Azoli",
      interactions: [],
    },
    {
      id: "levofloxacina",
      name: "Levofloxacina",
      group: "Fluorochinoloni",
      interactions: [],
    },
    {
      id: "ciprofloxacina",
      name: "Ciprofloxacina",
      group: "Fluorochinoloni",
      interactions: [],
    },
    {
      id: "moxifloxacina",
      name: "Moxifloxacina",
      group: "Fluorochinoloni",
      interactions: [],
    },
    {
      id: "norfloxacina",
      name: "Norfloxacina",
      group: "Fluorochinoloni",
      interactions: [],
    },
    {
      id: "sotalolo",
      name: "Sotalolo",
      group: "Anti-aritmici",
      interactions: [],
    },
    {
      id: "flecainide",
      name: "Flecainide",
      group: "Anti-aritmici",
      interactions: [],
    },
    {
      id: "propafenone",
      name: "Propafenone",
      group: "Anti-aritmici",
      interactions: [],
    },
    {
      id: "atenololo",
      name: "Atenololo",
      group: "Beta-bloccanti",
      interactions: [],
    },
    {
      id: "bisoprololo",
      name: "Bisoprololo",
      group: "Beta-bloccanti",
      interactions: [],
    },
    {
      id: "carvedilolo",
      name: "Carvedilolo",
      group: "Beta-bloccanti",
      interactions: [],
    },
    {
      id: "nebivololo",
      name: "Nebivololo",
      group: "Beta-bloccanti",
      interactions: [],
    },
    {
      id: "propranololo",
      name: "Propranololo",
      group: "Beta-bloccanti",
      interactions: [],
    },
    {
      id: "lisinopril",
      name: "Lisinopril",
      group: "ACE-inibitori",
      interactions: [],
    },
    {
      id: "enalapril",
      name: "Enalapril",
      group: "ACE-inibitori",
      interactions: [],
    },
    {
      id: "perindopril",
      name: "Perindopril",
      group: "ACE-inibitori",
      interactions: [],
    },
    {
      id: "captopril",
      name: "Captopril",
      group: "ACE-inibitori",
      interactions: [],
    },
    {
      id: "valsartan",
      name: "Valsartan",
      group: "Sartani",
      interactions: [],
    },
    {
      id: "candesartan",
      name: "Candesartan",
      group: "Sartani",
      interactions: [],
    },
    {
      id: "irbesartan",
      name: "Irbesartan",
      group: "Sartani",
      interactions: [],
    },
    {
      id: "olmesartan",
      name: "Olmesartan",
      group: "Sartani",
      interactions: [],
    },
    {
      id: "telmisartan",
      name: "Telmisartan",
      group: "Sartani",
      interactions: [],
    },
    {
      id: "torsemide",
      name: "Torsemide",
      group: "Diuretici",
      interactions: [],
    },
    {
      id: "bumetanide",
      name: "Bumetanide",
      group: "Diuretici",
      interactions: [],
    },
    {
      id: "idroclorotiazide",
      name: "Idroclorotiazide",
      group: "Diuretici",
      interactions: [],
    },
    {
      id: "clortalidone",
      name: "Clortalidone",
      group: "Diuretici",
      interactions: [],
    },
    {
      id: "indapamide",
      name: "Indapamide",
      group: "Diuretici",
      interactions: [],
    },
    {
      id: "eplerenone",
      name: "Eplerenone",
      group: "Diuretici risparmiatori di K",
      interactions: [],
    },
    {
      id: "amiloride",
      name: "Amiloride",
      group: "Diuretici risparmiatori di K",
      interactions: [],
    },
    {
      id: "escitalopram",
      name: "Escitalopram",
      group: "SSRI",
      interactions: [],
    },
    {
      id: "citalopram",
      name: "Citalopram",
      group: "SSRI",
      interactions: [],
    },
    {
      id: "fluoxetina",
      name: "Fluoxetina",
      group: "SSRI",
      interactions: [],
    },
    {
      id: "paroxetina",
      name: "Paroxetina",
      group: "SSRI",
      interactions: [],
    },
    {
      id: "fluvoxamina",
      name: "Fluvoxamina",
      group: "SSRI",
      interactions: [],
    },
    {
      id: "venlafaxina",
      name: "Venlafaxina",
      group: "SNRI",
      interactions: [],
    },
    {
      id: "duloxetina",
      name: "Duloxetina",
      group: "SNRI",
      interactions: [],
    },
    {
      id: "desvenlafaxina",
      name: "Desvenlafaxina",
      group: "SNRI",
      interactions: [],
    },
    {
      id: "amitriptilina",
      name: "Amitriptilina",
      group: "Antidepressivi triciclici",
      interactions: [],
    },
    {
      id: "clomipramina",
      name: "Clomipramina",
      group: "Antidepressivi triciclici",
      interactions: [],
    },
    {
      id: "imipramina",
      name: "Imipramina",
      group: "Antidepressivi triciclici",
      interactions: [],
    },
    {
      id: "quetiapina",
      name: "Quetiapina",
      group: "Antipsicotici",
      interactions: [],
    },
    {
      id: "olanzapina",
      name: "Olanzapina",
      group: "Antipsicotici",
      interactions: [],
    },
    {
      id: "risperidone",
      name: "Risperidone",
      group: "Antipsicotici",
      interactions: [],
    },
    {
      id: "aloperidolo",
      name: "Aloperidolo",
      group: "Antipsicotici",
      interactions: [],
    },
    {
      id: "aripiprazolo",
      name: "Aripiprazolo",
      group: "Antipsicotici",
      interactions: [],
    },
    {
      id: "gliclazide",
      name: "Gliclazide",
      group: "Antidiabetici",
      interactions: [],
    },
    {
      id: "glimepiride",
      name: "Glimepiride",
      group: "Antidiabetici",
      interactions: [],
    },
    {
      id: "empagliflozin",
      name: "Empagliflozin",
      group: "Antidiabetici",
      interactions: [],
    },
    {
      id: "dapagliflozin",
      name: "Dapagliflozin",
      group: "Antidiabetici",
      interactions: [],
    },
    {
      id: "semaglutide",
      name: "Semaglutide",
      group: "Antidiabetici",
      interactions: [],
    },
    {
      id: "liraglutide",
      name: "Liraglutide",
      group: "Antidiabetici",
      interactions: [],
    },
    {
      id: "ibuprofene",
      name: "Ibuprofene",
      group: "FANS",
      interactions: [],
    },
    {
      id: "diclofenac",
      name: "Diclofenac",
      group: "FANS",
      interactions: [],
    },
    {
      id: "naproxene",
      name: "Naproxene",
      group: "FANS",
      interactions: [],
    },
    {
      id: "ketorolac",
      name: "Ketorolac",
      group: "FANS",
      interactions: [],
    },
    {
      id: "celecoxib",
      name: "Celecoxib",
      group: "FANS",
      interactions: [],
    },
    {
      id: "etoricoxib",
      name: "Etoricoxib",
      group: "FANS",
      interactions: [],
    },
    {
      id: "ossicodone",
      name: "Ossicodone",
      group: "Oppioidi",
      interactions: [],
    },
    {
      id: "fentanil",
      name: "Fentanil",
      group: "Oppioidi",
      interactions: [],
    },
    {
      id: "tapentadol",
      name: "Tapentadol",
      group: "Oppioidi",
      interactions: [],
    },
    {
      id: "diazepam",
      name: "Diazepam",
      group: "Benzodiazepine",
      interactions: [],
    },
    {
      id: "lorazepam",
      name: "Lorazepam",
      group: "Benzodiazepine",
      interactions: [],
    },
    {
      id: "midazolam",
      name: "Midazolam",
      group: "Benzodiazepine",
      interactions: [],
    },
    {
      id: "clonazepam",
      name: "Clonazepam",
      group: "Benzodiazepine",
      interactions: [],
    },
    {
      id: "prednisone",
      name: "Prednisone",
      group: "Corticosteroidi",
      interactions: [],
    },
    {
      id: "desametasone",
      name: "Desametasone",
      group: "Corticosteroidi",
      interactions: [],
    },
    {
      id: "idrocortisone",
      name: "Idrocortisone",
      group: "Corticosteroidi",
      interactions: [],
    },
    {
      id: "carbamazepina",
      name: "Carbamazepina",
      group: "Antiepilettici",
      interactions: [],
    },
    {
      id: "valproato",
      name: "Valproato",
      group: "Antiepilettici",
      interactions: [],
    },
    {
      id: "levetiracetam",
      name: "Levetiracetam",
      group: "Antiepilettici",
      interactions: [],
    },
    {
      id: "lamotrigina",
      name: "Lamotrigina",
      group: "Antiepilettici",
      interactions: [],
    },
    {
      id: "fenitoina",
      name: "Fenitoina",
      group: "Antiepilettici",
      interactions: [],
    },
    {
      id: "topiramato",
      name: "Topiramato",
      group: "Antiepilettici",
      interactions: [],
    },
    {
      id: "rivaroxaban",
      name: "Rivaroxaban",
      group: "Anticoagulanti",
      interactions: [],
    },
    {
      id: "dabigatran",
      name: "Dabigatran",
      group: "Anticoagulanti",
      interactions: [],
    },
    {
      id: "fondaparinux",
      name: "Fondaparinux",
      group: "Anticoagulanti",
      interactions: [],
    },
  
    // ===== Massive DB expansion (Italy-friendly brand + molecule search) =====
    { id: "paracetamolo", name: "Paracetamolo", group: "Analgesici/Antipiretici", also: ["Tachipirina", "Efferalgan"], interactions: [] },
    { id: "ibuprofene", name: "Ibuprofene", group: "FANS", also: ["Brufen", "Nurofen", "Moment"], interactions: [] },
    { id: "ketorolac", name: "Ketorolac", group: "FANS", also: ["Toradol"], interactions: [] },
    { id: "diclofenac", name: "Diclofenac", group: "FANS", also: ["Voltaren"], interactions: [] },
    { id: "naprossene", name: "Naproxene", group: "FANS", also: ["Naprosyn"], interactions: [] },
    { id: "omeprazolo", name: "Omeprazolo", group: "IPP", also: ["Losec", "Omeprazen"], interactions: [] },
    { id: "pantoprazolo", name: "Pantoprazolo", group: "IPP", also: ["Pantorc"], interactions: [] },
    { id: "esomeprazolo", name: "Esomeprazolo", group: "IPP", also: ["Nexium"], interactions: [] },
    { id: "lansoprazolo", name: "Lansoprazolo", group: "IPP", also: ["Limpidex"], interactions: [] },
    { id: "metformina", name: "Metformina", group: "Antidiabetici", also: ["Metforal", "Glucophage"], interactions: [] },
    { id: "insulina_rapida", name: "Insulina rapida", group: "Antidiabetici", also: ["Humalog", "Novorapid", "Apidra"], interactions: [] },
    { id: "insulina_basale", name: "Insulina basale", group: "Antidiabetici", also: ["Lantus", "Toujeo", "Tresiba"], interactions: [] },
    { id: "fentanil", name: "Fentanil", group: "Oppioidi", also: ["Durogesic"], interactions: [] },
    { id: "morfina", name: "Morfina", group: "Oppioidi", also: ["Morphine"], interactions: [] },
    { id: "ossicodone", name: "Ossicodone", group: "Oppioidi", also: ["OxyContin"], interactions: [] },
    { id: "tramadolo", name: "Tramadolo", group: "Oppioidi", also: ["Contramal"], interactions: [] },
    { id: "lorazepam", name: "Lorazepam", group: "Benzodiazepine", also: ["Tavor"], interactions: [] },
    { id: "diazepam", name: "Diazepam", group: "Benzodiazepine", also: ["Valium"], interactions: [] },
    { id: "midazolam", name: "Midazolam", group: "Benzodiazepine", also: ["Ipnovel"], interactions: [] },
    { id: "alprazolam", name: "Alprazolam", group: "Benzodiazepine", also: ["Xanax"], interactions: [] },
    { id: "quetiapina", name: "Quetiapina", group: "Antipsicotici", also: ["Seroquel"], interactions: [] },
    { id: "olanzapina", name: "Olanzapina", group: "Antipsicotici", also: ["Zyprexa"], interactions: [] },
    { id: "aloperidolo", name: "Aloperidolo", group: "Antipsicotici", also: ["Haldol"], interactions: [] },
    { id: "sertralina", name: "Sertralina", group: "SSRI", also: ["Zoloft"], interactions: [] },
    { id: "citalopram", name: "Citalopram", group: "SSRI", also: ["Seropram"], interactions: [] },
    { id: "escitalopram", name: "Escitalopram", group: "SSRI", also: ["Cipralex"], interactions: [] },
    { id: "fluoxetina", name: "Fluoxetina", group: "SSRI", also: ["Prozac"], interactions: [] },
    { id: "venlafaxina", name: "Venlafaxina", group: "SNRI", also: ["Efexor"], interactions: [] },
    { id: "duloxetina", name: "Duloxetina", group: "SNRI", also: ["Cymbalta"], interactions: [] },
    { id: "atorvastatina", name: "Atorvastatina", group: "Statine", also: ["Torvast", "Lipitor"], interactions: [] },
    { id: "rosuvastatina", name: "Rosuvastatina", group: "Statine", also: ["Crestor"], interactions: [] },
    { id: "simvastatina", name: "Simvastatina", group: "Statine", also: ["Zocor"], interactions: [] },
    { id: "amlodipina", name: "Amlodipina", group: "Calcio-antagonisti", also: ["Norvasc"], interactions: [] },
    { id: "ramipril", name: "Ramipril", group: "ACE-inibitori", also: ["Triatec"], interactions: [] },
    { id: "enalapril", name: "Enalapril", group: "ACE-inibitori", also: ["Renitec"], interactions: [] },
    { id: "lisinopril", name: "Lisinopril", group: "ACE-inibitori", also: ["Zestril"], interactions: [] },
    { id: "losartan", name: "Losartan", group: "Sartani", also: ["Cozaar"], interactions: [] },
    { id: "valsartan", name: "Valsartan", group: "Sartani", also: ["Diovan"], interactions: [] },
    { id: "furosemide_alt", name: "Furosemide (brand)", group: "Diuretici", also: ["Lasix"], interactions: [] },
    { id: "spironolattone", name: "Spironolattone", group: "Diuretici", also: ["Aldactone"], interactions: [] },
    { id: "torasemide", name: "Torasemide", group: "Diuretici", also: ["Torem"], interactions: [] },
    { id: "metoprololo", name: "Metoprololo", group: "Beta-bloccanti", also: ["Seloken"], interactions: [] },
    { id: "bisoprololo", name: "Bisoprololo", group: "Beta-bloccanti", also: ["Congescor"], interactions: [] },
    { id: "carvedilolo", name: "Carvedilolo", group: "Beta-bloccanti", also: ["Dilatrend"], interactions: [] },
    { id: "diltiazem", name: "Diltiazem", group: "Calcio-antagonisti", also: ["Cardizem"], interactions: [] },
    { id: "verapamil", name: "Verapamil", group: "Calcio-antagonisti", also: ["Isoptin"], interactions: [] },
    { id: "prednisone", name: "Prednisone", group: "Corticosteroidi", also: ["Deltacortene"], interactions: [] },
    { id: "metilprednisolone", name: "Metilprednisolone", group: "Corticosteroidi", also: ["Urbason", "Solu-Medrol"], interactions: [] },
    { id: "desametasone", name: "Desametasone", group: "Corticosteroidi", also: ["Decadron"], interactions: [] },
    { id: "ondansetron", name: "Ondansetron", group: "Antiemetici", also: ["Zofran"], interactions: [] },
    { id: "metoclopramide", name: "Metoclopramide", group: "Antiemetici", also: ["Plasil"], interactions: [] },
    { id: "domperidone", name: "Domperidone", group: "Antiemetici", also: ["Motilium"], interactions: [] },
    { id: "levetiracetam", name: "Levetiracetam", group: "Antiepilettici", also: ["Keppra"], interactions: [] },
    { id: "valproato", name: "Acido valproico", group: "Antiepilettici", also: ["Depakin"], interactions: [] },
    { id: "carbamazepina", name: "Carbamazepina", group: "Antiepilettici", also: ["Tegretol"], interactions: [] },
    { id: "lamotrigina", name: "Lamotrigina", group: "Antiepilettici", also: ["Lamictal"], interactions: [] },
    { id: "gentamicina_alt", name: "Gentamicina (brand)", group: "Aminoglicosidi", also: ["Gentalyn"], interactions: [] },
    { id: "piperacillina_tazobactam", name: "Piperacillina/Tazobactam", group: "Antibiotici", also: ["Tazocin"], interactions: [] },
    { id: "amoxicillina_acclav", name: "Amoxicillina/Ac. clavulanico", group: "Antibiotici", also: ["Augmentin"], interactions: [] },
    { id: "ceftriaxone_alt", name: "Ceftriaxone (brand)", group: "Cefalosporine", also: ["Rocefin"], interactions: [] },
    { id: "cefuroxime", name: "Cefuroxime", group: "Cefalosporine", also: ["Zinnat"], interactions: [] },
    { id: "cefepime", name: "Cefepime", group: "Cefalosporine", also: ["Maxipime"], interactions: [] },
    { id: "meropenem_alt", name: "Meropenem (brand)", group: "Carbapenemi", also: ["Merrem"], interactions: [] },
    { id: "imipenem_cilastatina", name: "Imipenem/Cilastatina", group: "Carbapenemi", also: ["Tienam"], interactions: [] },
    { id: "linezolid", name: "Linezolid", group: "Antibiotici", also: ["Zyvoxid"], interactions: [] },
    { id: "daptomicina", name: "Daptomicina", group: "Antibiotici", also: ["Cubicin"], interactions: [] },
    { id: "fluconazolo", name: "Fluconazolo", group: "Azoli", also: ["Diflucan"], interactions: [] },
    { id: "itraconazolo", name: "Itraconazolo", group: "Azoli", also: ["Sporanox"], interactions: [] },
    { id: "voriconazolo", name: "Voriconazolo", group: "Azoli", also: ["Vfend"], interactions: [] },
    { id: "posaconazolo", name: "Posaconazolo", group: "Azoli", also: ["Noxafil"], interactions: [] },
    { id: "aciclovir", name: "Aciclovir", group: "Antivirali", also: ["Zovirax"], interactions: [] },
    { id: "oseltamivir", name: "Oseltamivir", group: "Antivirali", also: ["Tamiflu"], interactions: [] },
    { id: "levotiroxina", name: "Levotiroxina", group: "Ormoni", also: ["Eutirox"], interactions: [] },
    { id: "salbutamolo", name: "Salbutamolo", group: "Broncodilatatori", also: ["Ventolin"], interactions: [] },
    { id: "budesonide", name: "Budesonide", group: "Corticosteroidi inalatori", also: ["Pulmicort"], interactions: [] },
    { id: "tiotropio", name: "Tiotropio", group: "Broncodilatatori", also: ["Spiriva"], interactions: [] },

  ];

  const DB: Entry[] = [...DB_BASE, ...DB_EXTRA];



  const limit = useDailyLimit(LS.interactionsDaily, 3);
  const toast = useToast();

  type FavPair = { a: string; b: string; ts: number };
  const [favPairs, setFavPairs] = useState<FavPair[]>(() => {
    if (!isBrowser()) return [];
    return safeJson<FavPair[]>(localStorage.getItem(LS.interactionsPairs as any), []);
  });
  const writeFavPairs = (next: FavPair[]) => {
    setFavPairs(next);
    if (!isBrowser()) return;
    try {
      localStorage.setItem(LS.interactionsPairs as any, JSON.stringify(next.slice(0, 30)));
    } catch {}
  };
  const pairKey = (x: string, y: string) => (x < y ? `${x}__${y}` : `${y}__${x}`);
  const hasPair = (x: string, y: string) => favPairs.some((p) => pairKey(p.a, p.b) === pairKey(x, y));
  const addPair = (x: string, y: string) => {
    const key = pairKey(x, y);
    const next = [{ a: x, b: y, ts: Date.now() }, ...favPairs.filter((p) => pairKey(p.a, p.b) !== key)].slice(0, 30);
    writeFavPairs(next);
  };
  const removePair = (x: string, y: string) => {
    const key = pairKey(x, y);
    writeFavPairs(favPairs.filter((p) => pairKey(p.a, p.b) !== key));
  };


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
  const [focusTag, setFocusTag] = useState<null | "qt" | "rene" | "bleed" | "snc">(null);

  

// ===== Guided AI suggestions (Step 1) =====
const step1Suggestions = useMemo(() => {
  if (!a) return [] as { e: Entry; sev: Severity; why: string; monitor: string[]; tags: { id: "qt" | "rene" | "bleed" | "snc"; label: string; icon: string }[] }[];

  const match = (x: Entry, y: Entry) => {
    const keys = new Set<string>([y.id, normalize(y.group)]);
    const also = (y.also || []).map((s) => normalize(s));
    also.forEach((s) => keys.add(s));
    for (const r of x.interactions) {
      if (keys.has(r.key) || keys.has(normalize(r.key))) return r;
      const ry = byId.get(r.key);
      if (ry && (ry.id === y.id || normalize(ry.name) === normalize(y.name))) return r;
    }
    return null;
  };

  const out: { e: Entry; sev: Severity; why: string; monitor: string[]; tags: { id: "qt" | "rene" | "bleed" | "snc"; label: string; icon: string }[] }[] = [];
  for (const e of DB) {
    if (e.id === a.id) continue;
    const r1 = match(a, e);
    const r2 = match(e, a);
    const worst = pickWorst(r1, r2);
    if (!worst) continue;
    const sev: Severity = worst.sev || "ok";
    if (sev === "ok") continue; // keep only clinically relevant suggestions
    const why = worst.why || "Interazione potenzialmente rilevante.";
    const monitor = worst.monitor?.length ? worst.monitor : [];
    const tags = inferTags(`${a.name} ${e.name}`, why, monitor as any);
    if (focusTag && !tags.find((t) => t.id === focusTag)) continue;
    out.push({ e, sev, why, monitor, tags });
  }

  const rank = (s: Severity) => (s === "avoid" ? 2 : s === "caution" ? 1 : 0);
  out.sort((x, y) => rank(y.sev) - rank(x.sev) || x.e.name.localeCompare(y.e.name));
  return out.slice(0, 12);
}, [a?.id, byId, DB, focusTag]);

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
        tags: [] as any[],
      };
    }

    return {
      sev: worst.sev,
      title: worst.sev === "avoid" ? "Evitare" : worst.sev === "caution" ? "Attenzione" : "Compatibile",
      why: worst.why,
      monitor: worst.monitor?.length ? worst.monitor : ["Valuta monitoraggio clinico/strumentale in base al paziente"],
      alternatives: worst.alternatives || [],
      // "worst" is a reduced interaction object (sev/why/monitor/alternatives) and does not carry an id/key.
      // Use the current pair (a,b) as tag seed to keep typing strict and avoid TS errors.
      tags: inferTags(`${a} ${b}`.trim(), String(worst.why || ""), (worst.monitor || []) as any),
    };
  }, [a, b, byId]);

  function inferTags(key: string, why: string, monitor: string[]) {
    const tags: { id: "qt" | "rene" | "bleed" | "snc"; label: string; icon: string }[] = [];
    const hay = normalize([key, why, ...(monitor || [])].join(" "));
    const push = (id: any, label: string, icon: string) => {
      if (!tags.find((t) => t.id === id)) tags.push({ id, label, icon });
    };
    if (hay.includes("qt") || hay.includes("torsione") || hay.includes("aritmi")) push("qt", "QT", "⚡");
    if (hay.includes("creatin") || hay.includes("diures") || hay.includes("aki") || hay.includes("nefro") || hay.includes("ren")) push("rene", "Rene", "🧪");
    if (hay.includes("emorrag") || hay.includes("sangu") || hay.includes("inr") || hay.includes("piastrin")) push("bleed", "Sanguin.", "🩸");
    if (hay.includes("snc") || hay.includes("sedaz") || hay.includes("depress") || hay.includes("respir") || hay.includes("coscien")) push("snc", "SNC", "🫁");
    return tags.slice(0, 4);
  }

  async function shareOutcome() {
    if (!a || !b || !outcome) return;
    const tags = outcome.tags?.length ? ` (${outcome.tags.map((t:any) => t.label).join(", ")})` : "";
    const text = [
      `💊 Interazioni — ${a.name} + ${b.name}`,
      `Esito: ${outcome.title}${tags}`,
      `Motivo: ${outcome.why}`,
      "",
      "Monitoraggio:",
      ...(outcome.monitor || []).map((m:any) => `• ${m}`),
      "",
      "— Nurse Diary",
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.push("Copiato negli appunti", "success");
    } catch {
      toast.push("Impossibile copiare", "error");
    }
  }

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
      <>
      <div
  style={{
    borderRadius: 24,
    padding: 16,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "linear-gradient(180deg, rgba(120,200,255,0.10), rgba(255,255,255,0.04))",
    boxShadow: "0 20px 46px rgba(0,0,0,0.42)",
    position: "sticky",
    top: 10,
    zIndex: 5,
    backdropFilter: "blur(10px)",
  }}
>
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
    <div>
      <div style={{ fontSize: 14, fontWeight: 950, letterSpacing: 0.2 }}>Assistente clinico</div>
      <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
        Step {step} di 3 • {limit.premium ? "Premium" : `${limit.usedLeft()}/3 oggi`}
      </div>
    </div>

    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
      {a && (
        <span
          style={{
            padding: "7px 10px",
            borderRadius: 999,
            border: "1px solid rgba(120,255,200,0.28)",
            background: "rgba(120,255,200,0.10)",
            fontSize: 12,
            fontWeight: 950,
            whiteSpace: "nowrap",
          }}
        >
          Farmaco 1: {a.name}
        </span>
      )}
      {b && (
        <span
          style={{
            padding: "7px 10px",
            borderRadius: 999,
            border: "1px solid rgba(255,200,80,0.28)",
            background: "rgba(255,200,80,0.10)",
            fontSize: 12,
            fontWeight: 950,
            whiteSpace: "nowrap",
          }}
        >
          Farmaco 2: {b.name}
        </span>
      )}
    </div>
  </div>

  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
    {[1, 2, 3].map((n) => (
      <div
        key={n}
        style={{
          flex: 1,
          height: 10,
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.10)",
          background:
            n <= step
              ? n === 3
                ? "rgba(120,255,200,0.18)"
                : "rgba(120,200,255,0.18)"
              : "rgba(255,255,255,0.06)",
          boxShadow: n <= step ? "0 10px 18px rgba(0,0,0,0.22)" : "none",
          transition: "all 160ms ease",
        }}
      />
    ))}
  </div>
</div>

      {step === 1 && (
            {!a ? (
      <StepPick
          title="Step 1 — Seleziona farmaco 1"
          query={q1}
          setQuery={setQ1}
          results={results1}
          onPick={(e) => { setA(e); setQ1(e.name); setQ2(""); setB(null); /* stay on Step 1 to show AI suggestions */ }}

footer={
  <>
    {a && (
      <div style={{ marginTop: 12, borderRadius: 16, padding: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ fontSize: 12, opacity: 0.78 }}>Selezionato</div>
          <button
            type="button"
            onClick={() => setStep(2)}
            className="nd-btn nd-press"
            style={{ padding: "10px 14px", borderRadius: 999, fontWeight: 950 }}
          >
            Continua →
          </button>
        </div>
        <div style={{ fontSize: 14, fontWeight: 950, marginTop: 6 }}>{a.name}</div>
        <div style={{ fontSize: 12, opacity: 0.78, marginTop: 2 }}>{a.group}</div>
      </div>
    )}

    {a && (
      <div style={{ marginTop: 12, borderRadius: 18, padding: 14, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(8,10,16,0.82)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 950 }}>🤖 Suggerimenti automatici</div>
            <div style={{ fontSize: 12, opacity: 0.78, marginTop: 4 }}>1 tap su una card = selezione del 2° farmaco + verifica.</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          {([
            { id: null, label: "Tutti" },
            { id: "qt", label: "QT" },
            { id: "bleed", label: "Sanguin." },
            { id: "rene", label: "Rene" },
            { id: "snc", label: "SNC" },
          ] as any[]).map((t) => (
            <button
              key={String(t.id)}
              type="button"
              onClick={() => setFocusTag(t.id)}
              style={{
                padding: "7px 10px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.14)",
                background:
                  (focusTag ?? null) === (t.id ?? null)
                    ? t.id === "qt"
                      ? "rgba(120,200,255,0.18)"
                      : t.id === "bleed"
                      ? "rgba(255,80,80,0.18)"
                      : t.id === "rene"
                      ? "rgba(180,120,255,0.16)"
                      : t.id === "snc"
                      ? "rgba(255,200,80,0.18)"
                      : "rgba(255,255,255,0.14)"
                    : "rgba(255,255,255,0.06)",
                fontSize: 12,
                fontWeight: 950,
                cursor: "pointer",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {step1Suggestions.length === 0 ? (
          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.78 }}>Nessun suggerimento “ad alto rischio” trovato per questo farmaco nel database locale.</div>
        ) : (
          <>
            {(() => {
  const list = step1Suggestions.slice(0, 8);
  const hero = list.find((x) => x.sev === "avoid") || list[0];
  const rest = list.filter((x) => x !== hero);

  const Card = ({ c, big }: { c: any; big?: boolean }) => (
    <button
      key={c.e.id}
      type="button"
      onClick={() => {
        setB(c.e);
        setQ2(c.e.name);
        setStep(3);
      }}
      className="nd-press"
      style={{
        width: "100%",
        textAlign: "left",
        padding: big ? 14 : 12,
        borderRadius: big ? 22 : 18,
        border: "1px solid rgba(255,255,255,0.16)",
        background:
          c.sev === "avoid"
            ? "linear-gradient(180deg, rgba(255,80,80,0.20), rgba(255,80,80,0.10))"
            : "linear-gradient(180deg, rgba(255,200,80,0.18), rgba(255,200,80,0.08))",
        boxShadow: big ? "0 18px 36px rgba(0,0,0,0.40)" : "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: big ? 18 : 16 }}>{riskIcon(c.why)}</span>
          <div>
            <div style={{ fontSize: big ? 15 : 14, fontWeight: 950 }}>
              {big && c.sev === "avoid" ? "Più rischioso: " : ""}
              {c.e.name}
            </div>
            <div style={{ fontSize: 12, opacity: 0.82, marginTop: 2 }}>{c.e.group}</div>
          </div>
        </div>
        <span
          style={{
            padding: big ? "7px 12px" : "6px 10px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 950,
            border: "1px solid rgba(255,255,255,0.18)",
            background: c.sev === "avoid" ? "rgba(255,80,80,0.26)" : "rgba(255,200,80,0.22)",
            whiteSpace: "nowrap",
          }}
        >
          {c.sev === "avoid" ? "DA EVITARE" : "CAUTELA"}
        </span>
      </div>

      <div style={{ fontSize: 12, opacity: 0.92, marginTop: big ? 10 : 8 }}>
        <span style={{ fontWeight: 950 }}>Perché:</span>{" "}
        {c.why.length > (big ? 140 : 110) ? c.why.slice(0, big ? 140 : 110) + "…" : c.why}
      </div>
    </button>
  );

  return (
    <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
      {hero ? <Card c={hero} big />
    ) : (
      <div
        style={{
          borderRadius: 22,
          padding: 16,
          border: "1px solid rgba(255,255,255,0.14)",
          background: "linear-gradient(180deg, rgba(120,200,255,0.10), rgba(255,255,255,0.04))",
          boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 900 }}>Farmaco 1 selezionato</div>
            <div style={{ fontSize: 16, fontWeight: 950, marginTop: 4 }}>{a.name}</div>
            <div style={{ fontSize: 12, opacity: 0.78, marginTop: 4 }}>{a.group}</div>
          </div>
          <button
            type="button"
            onClick={() => {
              setA(null);
              setB(null);
              setQ1("");
              setQ2("");
              setStep(1);
              setFocusTag(null);
            }}
            style={{
              borderRadius: 999,
              padding: "10px 12px",
              border: "1px solid rgba(255,255,255,0.16)",
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.92)",
              fontWeight: 950,
              cursor: "pointer",
            }}
            className="nd-press"
          >
            Cambia
          </button>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          <button type="button" onClick={() => setStep(2)} style={primaryBtn(false)} className="nd-press">
            Ricerca manuale 2° farmaco →
          </button>
          <button
            type="button"
            onClick={() => {
              // keep guided in step 1, just scroll to suggestions
              const el = isBrowser() ? document.getElementById("nd-suggest-anchor") : null;
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            style={{
              borderRadius: 999,
              padding: "10px 12px",
              border: "1px solid rgba(255,255,255,0.16)",
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.92)",
              fontWeight: 950,
              cursor: "pointer",
            }}
            className="nd-press"
          >
            Suggerimenti rapidi ↓
          </button>
        </div>
      </div>
    )}
 : null}

      {rest.length > 0 && (
        <div style={{ marginTop: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 950, opacity: 0.85, marginBottom: 8 }}>
            Alternative (tap per verificare)
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {rest.slice(0, 4).map((c) => (
              <Card key={c.e.id} c={c} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
})()}
          </>

        )}
      </div>
    )}
  </>
}
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

          {outcome.tags && outcome.tags.length > 0 && (
            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {outcome.tags.map((t: any) => (
                <button
                  key={t.id}
                  type="button"
                  className="nd-tile nd-press"
                  onClick={() => setFocusTag((p) => (p === t.id ? null : t.id))}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: focusTag === t.id ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.05)",
                    fontSize: 12,
                    fontWeight: 900,
                    opacity: 0.95,
                  }}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          )}

          <div style={{ marginTop: 12, fontSize: 13, opacity: 0.9, lineHeight: 1.35 }}>{outcome.why}</div>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 900, marginBottom: 6 }}>Monitoraggio consigliato</div>
            <ul style={{ margin: 0, paddingLeft: 18, opacity: 0.85, fontSize: 13 }}>
              {outcome.monitor.map((m, i) => {
                const nm = normalize(String(m));
                const match = !focusTag || (focusTag === "qt" ? nm.includes("ecg") || nm.includes("qt") : focusTag === "rene" ? nm.includes("creatin") || nm.includes("diures") : focusTag === "bleed" ? nm.includes("sangu") || nm.includes("inr") : focusTag === "snc" ? nm.includes("fr") || nm.includes("sp") || nm.includes("sedaz") : true);
                return (
                  <li key={i} style={{ marginBottom: 4, opacity: match ? 1 : 0.35 }}>{m}</li>
                );
              })}
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
    <div style={{ borderRadius: 22, padding: 18, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.05)", boxShadow: "0 18px 40px rgba(0,0,0,0.35)" }}>
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

      <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontSize: 12, opacity: 0.75 }}>Risultati: {Math.min(80, results.length)} / {results.length}</div>
        {results.length > 80 && <div style={{ fontSize: 12, opacity: 0.75 }}>Affina la ricerca per vedere gli altri</div>}
      </div>

      <div style={{ marginTop: 10, display: "grid", gap: 8, maxHeight: 320, overflow: "auto" }}>
        {results.slice(0, 80).map((r, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onPick(r.e)}
            onMouseEnter={(ev) => ((ev.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)")}
            onMouseLeave={(ev) => ((ev.currentTarget as HTMLButtonElement).style.transform = "translateY(0px)")}
            style={{
              textAlign: "left",
              borderRadius: 18,
              padding: 14,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.04)",
              cursor: "pointer",
              transition: "transform 120ms ease, background 120ms ease, border 120ms ease",
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


function trigramSet(s: string) {
  const out = new Set<string>();
  const x = `  ${s}  `;
  for (let i = 0; i < x.length - 2; i++) out.add(x.slice(i, i + 3));
  return out;
}
function trigramSimilarity(a: string, b: string) {
  if (!a || !b) return 0;
  const A = trigramSet(a);
  const B = trigramSet(b);
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  const union = A.size + B.size - inter;
  return union ? inter / union : 0;
}

const DRUG_SYNONYMS: Record<string, string[]> = {
  "coumadin": ["warfarin"],
  "cardioaspirin": ["acido acetilsalicilico", "aspirina"],
  "asa": ["acido acetilsalicilico", "aspirina"],
  "plavix": ["clopidogrel"],
  "seloken": ["metoprololo"],
  "lasix": ["furosemide"],
  "augmentin": ["amoxicillina", "amoxicillina acido clavulanico"],
};

function expandQuerySynonyms(nq: string) {
  const out = new Set<string>([nq]);
  for (const t of nq.split(" ")) {
    const syn = DRUG_SYNONYMS[t];
    if (syn) syn.forEach((s) => out.add(normalize(s)));
  }
  return Array.from(out).filter(Boolean);
}

function searchDrugs(list: { id: string; name: string; group: string; also?: string[] }[], q: string) {
  const nq = normalize(q);
  const nqAll = expandQuerySynonyms(nq);
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
    for (const qq of nqAll) {
      if (!qq) continue;
      if (hay.startsWith(qq)) score += 100;
      if (hay.includes(qq)) score += 60;
    }

    // token matches
    for (const t of Array.from(new Set(nqAll.join(' ').split(' ')))) {
      if (!t) continue;
      if (hay.includes(t)) score += 15;
    }

    // typo tolerance (lightweight trigram similarity)
    if (score === 0) {
      const cand = normalize(e.name);
      const sim = trigramSimilarity(nq, cand);
      if (sim > 0.35) score += Math.round(sim * 40);
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

function copyTextToClipboard(text: string): boolean {
  if (!isBrowser()) return false;
  try {
    const nav: any = navigator as any;
    if (nav?.clipboard?.writeText) {
      nav.clipboard.writeText(text);
      return true;
    }
  } catch {}
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
  } catch {}
  return false;
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
  onToast: (msg: string, type?: "info" | "ok" | "warn" | "err") => void;
}) {
  // NOTE: Keep the router minimal and robust.
  // Interactions is the primary premium tool; other tools can be wired in later.
  if (id === "interactions") return <ToolInteractions last={last} onSave={onSave} onToast={onToast} />;

  return (
    <div style={{ padding: 14, borderRadius: 18, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)" }}>
      <div style={{ fontWeight: 950 }}>Strumento in aggiornamento</div>
      <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>
        Questo calcolatore verrà ripristinato a breve.
      </div>
    </div>
  );
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
    <div style={{ borderRadius: 22, padding: 18, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.05)", boxShadow: "0 18px 40px rgba(0,0,0,0.35)" }}>
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
      </>
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
const riskLabel = (why: string) => {
  const w = normalize(why);
  if (w.includes("qt") || w.includes("torsad") || w.includes("aritm")) return "QT";
  if (w.includes("emor") || w.includes("sang") || w.includes("anticoag") || w.includes("antiagg")) return "Sanguinamento";
  if (w.includes("rene") || w.includes("nefro") || w.includes("creatin") || w.includes("k+")) return "Rene";
  if (w.includes("snc") || w.includes("sedaz") || w.includes("depress") || w.includes("confus")) return "SNC";
  return "Rischio";
};

const riskIcon = (why: string) => {
  const w = normalize(why);
  if (w.includes("qt") || w.includes("torsad") || w.includes("aritm")) return "❤️‍🩹";
  if (w.includes("emor") || w.includes("sang") || w.includes("anticoag") || w.includes("antiagg")) return "🩸";
  if (w.includes("rene") || w.includes("nefro") || w.includes("creatin") || w.includes("k+")) return "🧪";
  if (w.includes("snc") || w.includes("sedaz") || w.includes("depress") || w.includes("confus")) return "🧠";
  return "⚠️";
};


