import React, { useMemo, useState } from "react";
import { incDailyCounter } from "@/features/progress/dailyCounters";
import { useToast } from "./Toast";
import { isPremium } from "@/features/profile/premium";
import PremiumUpsellModal from "./PremiumUpsellModal";

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
  | "diuresi"
  | "interactions";

type ToolDef = { id: ToolId; title: string; subtitle: string };

type UtilityHistoryItem = {
  tool: ToolId;
  ts: number;
  inputs: Record<string, string | number | boolean>;
  output: string;
};

const TOOLS: ToolDef[] = [
  { id: "interactions", title: "Interazioni farmacologiche", subtitle: "seleziona un farmaco e controlla compatibilità"},
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
  const [upsellOpen, setUpsellOpen] = useState(false);
  const [pendingTool, setPendingTool] = useState<ToolId | null>(null);
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
                onClick={() => {
                  // Premium-style upsell (no duplicate menus): Interactions has a much bigger DB in Boost.
                  if (t.id === "interactions" && !isPremium()) {
                    setPendingTool("interactions");
                    setUpsellOpen(true);
                    return;
                  }
                  setActive(t.id);
                }}
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

      <PremiumUpsellModal
        open={upsellOpen}
        title="Interazioni farmacologiche — versione completa"
        subtitle="Questa utility è offline e didattica. Con Boost sblocchi più farmaci, spiegazioni migliori e riferimenti rapidi."
        bullets={["Database ampliato", "Motivo dell'interazione (chiaro e pratico)", "Salvataggi/cronologia più utile"]}
        cta="Attiva Boost (demo)"
        secondaryCta="Continua anteprima"
        onSecondary={() => {
          // open a limited preview
          if (pendingTool) setActive(pendingTool);
          setPendingTool(null);
          setUpsellOpen(false);
        }}
        onClose={() => {
          // If user activated Boost via CTA, open the pending tool automatically.
          const canOpen = pendingTool && isPremium();
          setUpsellOpen(false);
          if (canOpen) setActive(pendingTool);
          setPendingTool(null);
        }}
      />
    </div>
  );
}

function ToolRenderer({ id, last, onSave, onUsed }: { id: ToolId; last: UtilityHistoryItem | null; onSave: (item: UtilityHistoryItem) => void; onUsed: () => void }) {
  switch (id) {
    case "interactions":
      return <ToolInteractions onUsed={onUsed} premium={isPremium()} />;
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

/**
 * Educational-only mini interaction checker (offline).
 * It does NOT replace a drug database / SmPC.
 */
function ToolInteractions({ onUsed, premium }: { onUsed: () => void; premium: boolean }) {
  type Severity = "ok" | "caution" | "avoid";
  type Entry = {
    id: string;
    name: string;
    group: string;
    also?: string[];
    // map of other IDs or groups -> severity + reason
    rules: { key: string; sev: Severity; why: string }[];
    tips?: string[];
  };

  const DB: Entry[] = [
    {
      id: "warfarin",
      name: "Warfarin",
      group: "Anticoagulanti",
      also: ["Coumadin"],
      rules: [
        { key: "fans", sev: "avoid", why: "aumenta rischio emorragico (doppio effetto su coagulazione + mucosa gastrica)." },
        { key: "macrolidi", sev: "avoid", why: "possono aumentare INR (inibizione metabolismo)." },
        { key: "fluorochinoloni", sev: "caution", why: "possibile aumento INR (variabile)." },
        { key: "amiodarone", sev: "avoid", why: "aumenta INR: spesso serve riduzione dose e monitoraggio stretto." },
        { key: "doac", sev: "avoid", why: "non associare anticoagulanti: rischio sanguinamento." },
        { key: "ssri", sev: "caution", why: "aumenta rischio sanguinamento (piastrine)." },
      ],
      tips: ["Se combinazioni inevitabili: monitor INR e segni di sanguinamento."],
    },
    {
      id: "doac",
      name: "DOAC (Apixaban/Rivaroxaban ecc.)",
      group: "Anticoagulanti",
      rules: [
        { key: "warfarin", sev: "avoid", why: "doppia anticoagulazione." },
        { key: "fans", sev: "caution", why: "rischio sanguinamento ↑." },
        { key: "amiodarone", sev: "caution", why: "possibili interazioni PK (P-gp/CYP) in base al DOAC." },
        { key: "antipiastrinici", sev: "caution", why: "rischio emorragico ↑ (valutare indicazione)." },
      ],
    },
    {
      id: "amiodarone",
      name: "Amiodarone",
      group: "Anti-aritmici",
      rules: [
        { key: "warfarin", sev: "avoid", why: "aumenta INR." },
        { key: "digossina", sev: "avoid", why: "aumenta livelli di digossina → tossicità." },
        { key: "qt", sev: "avoid", why: "prolunga QT: sommare con altri farmaci QT aumenta rischio torsioni." },
        { key: "statine", sev: "caution", why: "alcune statine ↑ rischio miopatia (dipende dalla molecola)." },
      ],
      tips: ["Attenzione QT e bradicardia: monitor ECG quando associ."],
    },
    {
      id: "macrolidi",
      name: "Macrolidi (es. claritromicina)",
      group: "Antibiotici",
      rules: [
        { key: "warfarin", sev: "avoid", why: "INR può aumentare." },
        { key: "qt", sev: "avoid", why: "prolungamento QT (rischio torsioni)." },
        { key: "statine", sev: "avoid", why: "inibizione CYP3A4: ↑ rischio rabdomiolisi (specie simvastatina)." },
      ],
    },
    {
      id: "fluorochinoloni",
      name: "Fluorochinoloni (es. levofloxacina)",
      group: "Antibiotici",
      rules: [
        { key: "warfarin", sev: "caution", why: "possibile aumento INR." },
        { key: "qt", sev: "caution", why: "può prolungare QT (dipende dal farmaco)." },
      ],
    },
    {
      id: "linezolid",
      name: "Linezolid",
      group: "Antibiotici",
      rules: [
        { key: "ssri", sev: "avoid", why: "rischio sindrome serotoninergica (azione IMAO)." },
        { key: "tramadolo", sev: "caution", why: "aumenta rischio serotoninergico." },
      ],
    },
    {
      id: "ssri",
      name: "SSRI (es. sertralina)",
      group: "Psichiatria",
      rules: [
        { key: "linezolid", sev: "avoid", why: "rischio sindrome serotoninergica." },
        { key: "tramadolo", sev: "caution", why: "serotonina ↑ + rischio convulsioni." },
        { key: "warfarin", sev: "caution", why: "rischio sanguinamento ↑." },
      ],
    },
    {
      id: "tramadolo",
      name: "Tramadolo",
      group: "Analgesici",
      rules: [
        { key: "ssri", sev: "caution", why: "serotonina ↑ + rischio convulsioni." },
        { key: "linezolid", sev: "caution", why: "rischio serotoninergico." },
      ],
    },
    {
      id: "fans",
      name: "FANS (es. ibuprofene/ketorolac)",
      group: "Analgesici",
      rules: [
        { key: "warfarin", sev: "avoid", why: "rischio emorragico ↑." },
        { key: "doac", sev: "caution", why: "rischio sanguinamento ↑." },
        { key: "acei", sev: "caution", why: "rischio danno renale ↑ e riduzione effetto antiipertensivo." },
        { key: "diuretici", sev: "caution", why: "rischio danno renale ↑ (" + "triple whammy" + ")." },
      ],
    },
    {
      id: "acei",
      name: "ACE-inibitori (es. enalapril)",
      group: "Cardiologia",
      rules: [
        { key: "spironolattone", sev: "avoid", why: "iperK: rischio elevato se funzione renale ridotta." },
        { key: "fans", sev: "caution", why: "rischio danno renale ↑." },
      ],
    },
    {
      id: "spironolattone",
      name: "Spironolattone",
      group: "Diuretici",
      rules: [
        { key: "acei", sev: "avoid", why: "iperK." },
      ],
    },
    {
      id: "digossina",
      name: "Digossina",
      group: "Cardiologia",
      rules: [
        { key: "amiodarone", sev: "avoid", why: "tossicità da aumento livelli." },
        { key: "diuretici", sev: "caution", why: "ipoK/ipoMg aumentano rischio aritmie/tossicità." },
      ],
    },
    {
      id: "statine",
      name: "Statine (es. simvastatina/atorvastatina)",
      group: "Metabolismo",
      rules: [
        { key: "macrolidi", sev: "avoid", why: "inibizione metabolismo: miopatia/rabdomiolisi." },
        { key: "amiodarone", sev: "caution", why: "alcune combinazioni aumentano rischio miopatia." },
      ],
    },
    { id: "antipiastrinici", name: "Antiaggreganti (ASA/Clopidogrel)", group: "Antitrombotici", rules: [{ key: "doac", sev: "caution", why: "rischio emorragico ↑ (valutare indicazione)." }] },
    { id: "diuretici", name: "Diuretici (furosemide ecc.)", group: "Diuretici", rules: [{ key: "fans", sev: "caution", why: "rischio danno renale ↑." }, { key: "digossina", sev: "caution", why: "ipoK aumenta rischio tossicità digossina." }] },
    { id: "qt", name: "Farmaci che allungano QT", group: "Sicurezza", rules: [{ key: "amiodarone", sev: "avoid", why: "somma effetti sul QT." }, { key: "macrolidi", sev: "avoid", why: "somma effetti sul QT." }] },
  ];

  // Keep the free version as an educational preview.
  const effectiveDB = premium ? DB : DB.slice(0, 8);

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Entry | null>(null);

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = effectiveDB.filter((e) => {
      if (!q) return true;
      const hay = `${e.name} ${e.group} ${(e.also || []).join(" ")}`.toLowerCase();
      return hay.includes(q) || e.id.includes(q);
    });
    // group by relevance: startswith then includes
    return list.slice(0, 30);
  }, [query]);

  const result = useMemo(() => {
    if (!selected) return null;
    const rel = effectiveDB
      .filter((x) => x.id !== selected.id)
      .map((other) => {
        // find rule by exact id or by group keyword
        const direct = selected.rules.find((r) => r.key === other.id);
        const byGroup = selected.rules.find((r) => r.key === other.group.toLowerCase());
        const rule = direct || byGroup || null;
        return { other, rule };
      });

    const ok: { name: string; group: string }[] = [];
    const caution: { name: string; why: string }[] = [];
    const avoid: { name: string; why: string }[] = [];

    for (const x of rel) {
      if (!x.rule) {
        ok.push({ name: x.other.name, group: x.other.group });
      } else if (x.rule.sev === "avoid") {
        avoid.push({ name: x.other.name, why: x.rule.why });
      } else if (x.rule.sev === "caution") {
        caution.push({ name: x.other.name, why: x.rule.why });
      } else {
        ok.push({ name: x.other.name, group: x.other.group });
      }
    }
    return { ok, caution, avoid };
  }, [selected]);

  function pick(e: Entry) {
    setSelected(e);
    onUsed();
  }

  const pill = (bg: string) => ({
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.14)",
    background: bg,
    fontWeight: 900,
    fontSize: 12,
    color: "rgba(255,255,255,0.92)",
    whiteSpace: "nowrap" as const,
  });

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div
        style={{
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.04)",
          borderRadius: 18,
          padding: 12,
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={pill("rgba(56,189,248,0.14)")}>🧪 Educational</div>
          <div style={pill("rgba(245,158,11,0.12)")}>⚠️ Non sostituisce banche dati/SmPC</div>
          <div style={pill("rgba(255,255,255,0.06)")}>Offline</div>
        </div>
        <div style={{ marginTop: 10, opacity: 0.78, fontWeight: 800, fontSize: 12 }}>
          Seleziona un farmaco (o una classe) e visualizza: <b>compatibili</b>, <b>attenzione</b>, <b>da evitare</b>.
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca (es. warfarin, macrolidi, FANS...)"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.92)",
              fontWeight: 900,
              outline: "none",
            }}
          />
          <div
            style={{
              display: "grid",
              gap: 8,
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            }}
          >
            {options.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => pick(e)}
                style={{
                  textAlign: "left",
                  padding: 10,
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: selected?.id === e.id ? "rgba(34,197,94,0.16)" : "rgba(0,0,0,0.18)",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 950 }}>{e.name}</div>
                <div style={{ opacity: 0.72, fontWeight: 800, fontSize: 12 }}>{e.group}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {selected && result && (
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.04)",
            borderRadius: 18,
            padding: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 950, fontSize: 16 }}>{selected.name}</div>
              <div style={{ opacity: 0.7, fontWeight: 800, fontSize: 12 }}>{selected.group}</div>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              style={{
                padding: "8px 10px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.92)",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Cambia
            </button>
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 10, gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
            <div style={{ borderRadius: 16, border: "1px solid rgba(34,197,94,0.28)", background: "rgba(34,197,94,0.10)", padding: 10, minWidth: 0 }}>
              <div style={{ fontWeight: 950 }}>Compatibili ✅</div>
              <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                {result.ok.slice(0, 8).map((x) => (
                  <div key={x.name} style={{ fontWeight: 850, opacity: 0.92, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {x.name}
                  </div>
                ))}
                {result.ok.length > 8 && <div style={{ opacity: 0.7, fontWeight: 800, fontSize: 12 }}>+{result.ok.length - 8} altri…</div>}
              </div>
            </div>

            <div style={{ borderRadius: 16, border: "1px solid rgba(245,158,11,0.28)", background: "rgba(245,158,11,0.10)", padding: 10, minWidth: 0 }}>
              <div style={{ fontWeight: 950 }}>Attenzione ⚠️</div>
              <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
                {result.caution.length ? (
                  result.caution.slice(0, 5).map((x) => (
                    <div key={x.name} style={{ display: "grid", gap: 2 }}>
                      <div style={{ fontWeight: 900, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.name}</div>
                      <div style={{ opacity: 0.78, fontWeight: 800, fontSize: 12, lineHeight: 1.2 }}>{x.why}</div>
                    </div>
                  ))
                ) : (
                  <div style={{ opacity: 0.7, fontWeight: 800, fontSize: 12 }}>Nessuna nota principale nel mini-database.</div>
                )}
              </div>
            </div>

            <div style={{ borderRadius: 16, border: "1px solid rgba(239,68,68,0.28)", background: "rgba(239,68,68,0.10)", padding: 10, minWidth: 0 }}>
              <div style={{ fontWeight: 950 }}>Da evitare ⛔</div>
              <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
                {result.avoid.length ? (
                  result.avoid.slice(0, 5).map((x) => (
                    <div key={x.name} style={{ display: "grid", gap: 2 }}>
                      <div style={{ fontWeight: 900, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.name}</div>
                      <div style={{ opacity: 0.78, fontWeight: 800, fontSize: 12, lineHeight: 1.2 }}>{x.why}</div>
                    </div>
                  ))
                ) : (
                  <div style={{ opacity: 0.7, fontWeight: 800, fontSize: 12 }}>Nessuna controindicazione principale nel mini-database.</div>
                )}
              </div>
            </div>
          </div>

          {selected.tips?.length ? (
            <div style={{ marginTop: 12, padding: 10, borderRadius: 16, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.18)" }}>
              <div style={{ fontWeight: 950 }}>Suggerimenti</div>
              <ul style={{ margin: "8px 0 0", paddingLeft: 18, opacity: 0.85, fontWeight: 800, fontSize: 12, lineHeight: 1.35 }}>
                {selected.tips.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
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
