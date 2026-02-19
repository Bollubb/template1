import React, { useMemo, useState } from "react";
import { incDailyCounter } from "@/features/progress/dailyCounters";
import { useToast } from "./Toast";
import { isPremium } from "@/features/profile/premium";
import PremiumUpsellModal from "./PremiumUpsellModal";

const LS = {
  favs: "nd_utility_favs",
  history: "nd_utility_history_v1",
} as const;

function ghostBtn() {
  return {
    borderRadius: 12,
    padding: "10px 12px",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.03)",
    color: "inherit",
    fontWeight: 900,
    cursor: "pointer",
    transition: "transform 120ms ease, background 160ms ease, border-color 160ms ease",
    willChange: "transform",
  } as React.CSSProperties;
}

function primaryBtn(disabled: boolean) {
  return {
    borderRadius: 12,
    padding: "10px 12px",
    border: "1px solid rgba(59,130,246,0.35)",
    background: disabled ? "rgba(59,130,246,0.10)" : "rgba(59,130,246,0.22)",
    color: "inherit",
    fontWeight: 950,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
    transition: "transform 120ms ease, background 160ms ease, border-color 160ms ease, opacity 160ms ease",
    willChange: "transform",
  } as React.CSSProperties;
}

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
        <div style={{ padding: 12, borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 950 }}>Preset clinici</div>
              <div style={{ opacity: 0.78, fontSize: 12.5, marginTop: 2 }}>Sepsi • Shock • Post-op (poi personalizza)</div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" style={ghostBtn()} onClick={() => { setRf(24); setHr(118); setSys(92); setTemp(38.6); setAvpu("A"); setSpo2(93); setO2(true); }}>Sepsi</button>
              <button type="button" style={ghostBtn()} onClick={() => { setRf(28); setHr(130); setSys(80); setTemp(36.4); setAvpu("V"); setSpo2(92); setO2(true); }}>Shock</button>
              <button type="button" style={ghostBtn()} onClick={() => { setRf(16); setHr(78); setSys(120); setTemp(36.8); setAvpu("A"); setSpo2(96); setO2(false); }}>Post-op</button>
            </div>
          </div>
        </div>
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
}/**
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
      { with: "propofol", sev: "avoid", note: "Elevato rischio incompatibilità fisico-chimica (emulsione lipidica). Linea dedicata.", flush: true, advanced: ["Preferire linea dedicata per vasopressori", "Evita Y-site con emulsioni lipidiche"] },
      { with: "midazolam", sev: "caution", note: "Compatibilità variabile: se possibile linea dedicata o flush prima/dopo.", flush: true, advanced: ["Valuta precipitazione/torbidità", "Riduci numero di farmaci sulla stessa linea"] },
      { with: "fentanil", sev: "ok", note: "Generalmente compatibile in Y-site a concentrazioni comuni.", advanced: ["Sorveglia comunque integrità linea/filtri"] },
      { with: "amiodarone", sev: "avoid", note: "Amiodarone spesso richiede linee dedicate. Evitare co-infusione.", flush: true, advanced: ["Preferire linea dedicata"] },
    ]},
    { id: "adrenalina", name: "Adrenalina", class: "Vasopressori", also: ["Epinefrina"], compat: [
      { with: "propofol", sev: "avoid", note: "Emulsione lipidica: evitare Y-site.", flush: true },
      { with: "midazolam", sev: "caution", note: "Compatibilità non sempre garantita: preferire linea dedicata/flush.", flush: true },
      { with: "fentanil", sev: "ok", note: "Spesso compatibile." },
    ]},
    { id: "vasopressina", name: "Vasopressina", class: "Vasopressori", compat: [
      { with: "propofol", sev: "avoid", note: "Evitare Y-site con emulsioni lipidiche.", flush: true },
      { with: "fentanil", sev: "ok", note: "Spesso compatibile." },
      { with: "midazolam", sev: "caution", note: "Preferire linea dedicata/flush.", flush: true },
    ]},
    { id: "amiodarone", name: "Amiodarone", class: "Anti-aritmici", compat: [
      { with: "noradrenalina", sev: "avoid", note: "Preferire linea dedicata.", flush: true },
      { with: "midazolam", sev: "caution", note: "Compatibilità variabile: flush consigliato.", flush: true },
      { with: "propofol", sev: "avoid", note: "Evitare Y-site (emulsione lipidica).", flush: true },
    ]},
    { id: "midazolam", name: "Midazolam", class: "Sedativi", compat: [
      { with: "propofol", sev: "avoid", note: "Propofol: emulsione lipidica, evitare co-infusione.", flush: true },
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
    { id: "insulina", name: "Insulina EV", class: "Ormoni", compat: [
      { with: "noradrenalina", sev: "caution", note: "Preferire linee separate per ridurre errori/adsorbimento.", flush: true, advanced: ["Linea dedicata consigliata in molte ICU"] },
      { with: "propofol", sev: "avoid", note: "Evitare co-infusione con emulsioni lipidiche.", flush: true },
    ]},
    { id: "bicarbonato", name: "Bicarbonato di sodio", class: "Elettroliti", compat: [
      { with: "noradrenalina", sev: "avoid", note: "Rischio incompatibilità con molte soluzioni. Linea dedicata.", flush: true },
      { with: "calcio", sev: "avoid", note: "Rischio precipitazione. Evitare.", flush: true },
    ]},
    { id: "calcio", name: "Calcio gluconato/cloruro", class: "Elettroliti", compat: [
      { with: "bicarbonato", sev: "avoid", note: "Precipitazione: evitare.", flush: true },
      { with: "fosfato", sev: "avoid", note: "Precipitazione: evitare.", flush: true },
    ]},
    { id: "fosfato", name: "Fosfati EV", class: "Elettroliti", compat: [
      { with: "calcio", sev: "avoid", note: "Precipitazione: evitare.", flush: true },
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
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 999,
        border: sev === "avoid" ? "1px solid rgba(239,68,68,0.30)" : sev === "caution" ? "1px solid rgba(245,158,11,0.32)" : "1px solid rgba(34,197,94,0.30)",
        background: sev === "avoid" ? "rgba(239,68,68,0.12)" : sev === "caution" ? "rgba(245,158,11,0.14)" : "rgba(34,197,94,0.12)",
        color: sev === "avoid" ? "rgb(220,38,38)" : sev === "caution" ? "rgb(217,119,6)" : "rgb(22,163,74)",
        fontSize: 12,
        fontWeight: 850,
        lineHeight: 1,
      }}
    >
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
        <button
          type="button"
          onClick={() => onUpsell("Compatibilità infusioni EV — ICU", "Con Premium sblocchi dettagli avanzati e database ampliato.", ["Dettagli avanzati", "Database più ampio"])}
          style={ghostBtn()}
        >
          ICU Boost
        </button>
      </div>

      {step === 1 && (
        <StepPick
          title="Step 1 — Seleziona infusione A"
          query={q1}
          setQuery={setQ1}
          results={results1.map((d) => ({ id: d.id, name: d.name, group: d.class }))}
          onPick={(e) => {
            setA(DB.find((x) => x.id === e.id) || null);
            setStep(2);
            setQ2("");
            setB(null);
          }}
        />
      )}

      {step === 2 && (
        <StepPick
          title="Step 2 — Seleziona infusione B"
          query={q2}
          setQuery={setQ2}
          results={results2.map((d) => ({ id: d.id, name: d.name, group: d.class }))}
          onPick={(e) => setB(DB.find((x) => x.id === e.id) || null)}
          footer={
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
              <button type="button" onClick={() => { setStep(1); setQ2(""); setB(null); }} style={ghostBtn()}>
                ← Cambia infusione A
              </button>
              <button type="button" onClick={confirm} disabled={!a || !b} style={primaryBtn(!a || !b)}>
                Verifica compatibilità
              </button>
            </div>
          }
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
            <button
              type="button"
              onClick={() => {
                onSave({ tool: "INFUSION", ts: Date.now(), inputs: { a: a.id, b: b.id }, output: `${a.name} + ${b.name}: ${outcome.title}${outcome.flush ? " (flush)" : ""}` });
                onToast("Salvato in storico", "success");
              }}
              style={primaryBtn(false)}
            >
              Salva
            </button>
          </div>
        </div>
      )}
    </div>
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
    <span style={{ opacity: 0.85, fontSize: 12.5, fontWeight: 850, padding: "4px 8px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)" }}>
      Δ NEWS2: {label}
    </span>
  );
}


