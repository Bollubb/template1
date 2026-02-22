import React, { useEffect, useMemo, useState } from "react";
import { computeLevel, getXp } from "@/features/progress/xp";
import ShiftPlanner from "./ShiftPlanner";
import { useToast } from "./Toast";

type HomeDashboardProps = {
  onGoToCards: () => void;
  onGoToDidattica: () => void;
  onGoToProfile: () => void;
};

const LS = {
  pills: "nd_pills",
  profile: "nd_profile",
  premium: "nd_premium",
  milestones: "nd_milestones_claimed_v1", // Record<level,1>
} as const;

function safeJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function card(): React.CSSProperties {
  return {
    padding: 14,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    boxShadow: "0 12px 28px rgba(0,0,0,0.35)",
  };
}

function pill(code: string): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 22,
    padding: "2px 8px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 950,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.92)",
    lineHeight: 1.1,
  };
}

function tipCard(): React.CSSProperties {
  return {
    marginTop: 8,
    padding: 10,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(15,23,42,0.60)",
  };
}

function nextMilestone(level: number) {
  return Math.ceil(Math.max(1, level) / 5) * 5;
}

function milestoneReward(level: number) {
  // Progressive reward every 5 levels (only pills)
  // Lv 5: +15 • Lv 10: +20 • Lv 15: +25 ...
  const tier = Math.max(1, Math.floor(level / 5));
  const pills = 10 + tier * 5;
  return { pills };
}

function readNum(key: string) {
  const n = Number(isBrowser() ? localStorage.getItem(key) || "0" : "0");
  return Number.isFinite(n) ? n : 0;
}

export default function HomeDashboard({ onGoToCards, onGoToDidattica, onGoToProfile }: HomeDashboardProps) {
  // onGoTo* kept for API compatibility (used elsewhere in the app)
  void onGoToCards;
  void onGoToDidattica;
  void onGoToProfile;

  const toast = useToast();

  const [name, setName] = useState("Nurse");
  const [role, setRole] = useState("Study Hub");
  const [pillsCount, setPillsCount] = useState(0);
  const [premium, setPremium] = useState(false);
  const [xp, setXp] = useState(0);

  useEffect(() => {
    if (!isBrowser()) return;
    try {
      const p = safeJson<{ name?: string; role?: string }>(localStorage.getItem(LS.profile), {});
      if (p.name) setName(p.name);
      if (p.role) setRole(p.role);

      setPillsCount(readNum(LS.pills));
      setPremium(localStorage.getItem(LS.premium) === "1");
      setXp(getXp());
    } catch {}
  }, []);

  // Keep xp in sync if it changes elsewhere
  useEffect(() => {
    if (!isBrowser()) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === "nd_xp") setXp(getXp());
      if (e.key === LS.pills) setPillsCount(readNum(LS.pills));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);


const tips = useMemo(
  () => [
    "Prima di un prelievo: lascia asciugare l'antiseptico (riduce contaminazioni).",
    "SpO₂ non distingue COHb: in sospetto CO usa co-ossimetria e clinica.",
    "In shock: rivaluta sempre perfusione periferica (CRT) e diuresi oltre alla PA.",
    "Prima di un bolo EV: controlla concentrazione, compatibilità e velocità.",
    "In dispnea: pensa a cause non respiratorie (acidosi, anemia, dolore, ansia).",
    "Con farmaci ad alto rischio: doppio controllo indipendente quando previsto.",
    "Nel dolore toracico: ECG precoce e monitor, ma valuta anche segni di instabilità.",
    "Se febbre in CVC: emocolture da CVC e periferica prima dell'antibiotico, se possibile.",
    "Nel delirium: correggi prima trigger (ipossia, ipoglicemia, ritenzione urinaria).",
    "In ipoglicemia: ricontrolla glicemia dopo trattamento e valuta causa.",
    "In ventilazione: osserva sempre sincronismo paziente-ventilatore e allarmi.",
    "Prima di ossigeno: imposta un target SpO₂ (es. BPCO spesso 88–92%).",
    "Emogas: guarda il pH, poi PaCO₂/HCO₃⁻ per capire la componente primaria.",
    "Potassio alto: verifica ECG e causa; attenzione a emolisi del campione.",
    "In sepsi: tempo = organo. Rivaluta lattato e perfusione dopo fluidi/terapia.",
    "Prima di eparina: controlla indicazione, controindicazioni e piastrine (HIT).",
    "Con antibiotici: la tempistica conta, ma anche dose e via nel paziente critico.",
    "Dopo una caduta: valuta trauma cranico e anticoagulanti prima di banalizzare.",
    "Nausea/vomito: attenzione a rischio aspirazione e bilancio idrico-elettrolitico.",
    "In terapia infusionale: etichetta linee e pompe (riduce errori).",
  ],
  []
);

const tipOfDay = useMemo(() => {
  const now = new Date();
  const seed = Math.floor(now.getTime() / (1000 * 60 * 60 * 24));
  return tips[seed % tips.length];
}, [tips]);

  const lvlInfo = useMemo(() => computeLevel(xp), [xp]);
  const lvl = lvlInfo.level;
  const need = lvlInfo.need;
  const remaining = lvlInfo.remaining;
  const pct = Math.max(0, Math.min(100, Math.round(lvlInfo.pct * 100)));


// Milestone rewards are claimed manually by tapping the 🎁 on the path.
const [claimedMilestones, setClaimedMilestones] = useState<Record<string, 1>>({});

useEffect(() => {
  if (!isBrowser()) return;
  setClaimedMilestones(safeJson<Record<string, 1>>(localStorage.getItem(LS.milestones), {}));
}, []);

const claimMilestone = (milestoneLevel: number) => {
  if (!isBrowser()) return;
  if (milestoneLevel % 5 !== 0) return;
  if (lvl < milestoneLevel) {
    toast.push(`Completa il Lv ${milestoneLevel} per sbloccare il premio`, "info", { duration: 2400 });
    return;
  }

  const key = String(milestoneLevel);
  const currentClaimed = safeJson<Record<string, 1>>(localStorage.getItem(LS.milestones), {});
  if (currentClaimed[key]) {
    toast.push("Premio già riscattato ✅", "info", { duration: 1800 });
    return;
  }

  const r = milestoneReward(milestoneLevel);

  // persist claim
  currentClaimed[key] = 1;
  try {
    localStorage.setItem(LS.milestones, JSON.stringify(currentClaimed));
  } catch {}
  setClaimedMilestones(currentClaimed);

  // apply pills
  const curP = readNum(LS.pills);
  const nextP = curP + r.pills;
  try {
    localStorage.setItem(LS.pills, String(nextP));
  } catch {}
  setPillsCount(nextP);

  toast.push(`🎁 Premio riscattato! +${r.pills}💊`, "success", { duration: 2600 });
};

  const nextM = nextMilestone(lvl);

  const pathItems = useMemo(() => {
  // Small strip: current -> next milestone (max 8 nodes)
  const start = Math.max(1, lvl);
  const end = Math.max(start + 6, nextM); // ensure we include the chest
  const items: Array<{
    n: number;
    kind: "node" | "chest";
    done: boolean;
    current: boolean;
    claimed: boolean;
    claimable: boolean;
  }> = [];

  for (let n = start; n <= end; n++) {
    const isChest = n % 5 === 0;
    const claimed = !!claimedMilestones[String(n)];
    const claimable = isChest && !claimed && lvl >= n;
    items.push({ n, kind: isChest ? "chest" : "node", done: n < lvl, current: n === lvl, claimed, claimable });
    if (items.length >= 8) break;
  }

  // If milestone not included, force it as last item
  if (!items.some((x) => x.n === nextM)) {
    const claimed = !!claimedMilestones[String(nextM)];
    const claimable = !claimed && lvl >= nextM;
    items[items.length - 1] = { n: nextM, kind: "chest", done: nextM < lvl, current: nextM === lvl, claimed, claimable };
  }
  return items;
}, [lvl, nextM, claimedMilestones]);

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 720,
        margin: "0 auto",
        padding: "0 12px",
        display: "grid",
        gap: 12,
        boxSizing: "border-box",
      }}
    >
      {/* Header + Study Hub */}
      <div style={card()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div>
            <div style={{ fontWeight: 950, fontSize: 18 }}>Ciao, {name} 👋</div>
            <div style={{ opacity: 0.72, fontWeight: 750, fontSize: 13 }}>{role}</div>
          </div>
          <div
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.12)",
              background: premium ? "rgba(34,197,94,0.14)" : "rgba(255,255,255,0.05)",
              fontWeight: 900,
              fontSize: 12,
              whiteSpace: "nowrap",
            }}
          >
            {premium ? "Premium" : "Free"}
          </div>
        </div>

        <div
          style={{
            marginTop: 12,
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 10,
            alignItems: "stretch",
          }}
        >
          <div style={{ ...card(), padding: 12 }}>
            <div style={{ opacity: 0.75, fontSize: 12, fontWeight: 800 }}>Pillole</div>
            <div style={{ fontWeight: 950, fontSize: 18, marginTop: 2 }}>{pillsCount} 💊</div>

            {/* Tip del giorno (ruota automaticamente) */}
            <div style={tipCard()}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontWeight: 950, fontSize: 12, opacity: 0.92 }}>Tip del giorno</div>
                <span className="nd-pill nd-pill--sm">
                  📌
                </span>
              </div>
              <div style={{ marginTop: 6, opacity: 0.78, fontSize: 12, lineHeight: 1.25 }}>{tipOfDay}</div>
            </div>
          </div>

          <div style={{ ...card(), padding: 12 }}>
            <div style={{ opacity: 0.75, fontSize: 12, fontWeight: 800 }}>Livello</div>
            <div style={{ fontWeight: 950, fontSize: 18, marginTop: 2 }}>Lv {lvl}</div>

            <div style={{ marginTop: 8, height: 8, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: "rgba(56,189,248,0.55)" }} />
            </div>
            <div style={{ marginTop: 6, opacity: 0.7, fontSize: 12 }}>
              XP: {remaining}/{need} • Totale: {xp}
            </div>

            {/* Duolingo-like mini strip */}
            <div style={{ marginTop: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontWeight: 900, fontSize: 12, opacity: 0.85 }}>Percorso</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Prossima milestone: Lv {nextM} 🎁</div>
              </div>

              <div style={{ marginTop: 8, display: "flex", gap: 10, alignItems: "center", overflowX: "auto", paddingBottom: 2 }}>
                {pathItems.map((it, idx) => (
                  <React.Fragment key={it.n}>
                    <button
  type="button"
  onClick={() => {
    if (it.kind === "chest") claimMilestone(it.n);
  }}
  style={{
    width: 34,
    height: 34,
    borderRadius: 999,
    border: it.current ? "1px solid rgba(56,189,248,0.70)" : "1px solid rgba(255,255,255,0.14)",
    background: it.claimed
      ? "rgba(34,197,94,0.18)"
      : it.claimable
      ? "rgba(250,204,21,0.18)"
      : it.kind === "chest"
      ? "rgba(255,255,255,0.06)"
      : "rgba(255,255,255,0.06)",
    display: "grid",
    placeItems: "center",
    flex: "0 0 auto",
    boxShadow: it.claimable ? "0 0 0 3px rgba(250,204,21,0.10)" : it.current ? "0 0 0 3px rgba(56,189,248,0.10)" : "none",
    cursor: it.kind === "chest" ? "pointer" : "default",
    padding: 0,
    color: "rgba(255,255,255,0.92)",
  }}
  className={it.claimable ? "nd-press nd-pop" : "nd-press"}
  title={it.kind === "chest" ? `Premio Lv ${it.n}` : `Lv ${it.n}`}
  aria-label={it.kind === "chest" ? `Riscatta premio livello ${it.n}` : `Livello ${it.n}`}
>
  {it.kind === "chest" ? (it.claimed ? "✓" : "🎁") : it.current ? "⭐" : it.done ? "✓" : it.n}
</button>
                    {idx < pathItems.length - 1 && <div style={{ width: 18, height: 3, borderRadius: 999, background: "rgba(255,255,255,0.10)", flex: "0 0 auto" }} />}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Shift planner (monthly calendar) */}
      <ShiftPlanner />
    </div>
  );
}
