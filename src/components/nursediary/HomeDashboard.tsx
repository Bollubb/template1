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
  freePacks: "nd_free_packs",
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

function nextMilestone(level: number) {
  return Math.ceil(Math.max(1, level) / 5) * 5;
}

function milestoneReward(level: number) {
  // Simple, deterministic rewards (can be tuned later without breaking save data)
  // Lv 5: +20 pills +1 pack
  // Lv 10: +25 pills +2 pack
  // Lv 15: +30 pills +2 pack
  const tier = Math.max(1, Math.floor(level / 5));
  const pills = 15 + tier * 5;
  const packs = 1 + Math.floor(level / 10);
  return { pills, packs };
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

  const lvlInfo = useMemo(() => computeLevel(xp), [xp]);
  const lvl = lvlInfo.level;
  const need = lvlInfo.need;
  const remaining = lvlInfo.remaining;
  const pct = Math.max(0, Math.min(100, Math.round(lvlInfo.pct * 100)));

  // Auto milestone rewards at Lv 5/10/15...
  useEffect(() => {
    if (!isBrowser()) return;
    if (!lvl || lvl < 5) return;

    const claimed = safeJson<Record<string, 1>>(localStorage.getItem(LS.milestones), {});
    const newly: number[] = [];

    for (let m = 5; m <= lvl; m += 5) {
      if (!claimed[String(m)]) newly.push(m);
    }
    if (!newly.length) return;

    // Apply all unclaimed milestones up to current level
    let addPills = 0;
    let addPacks = 0;
    newly.forEach((m) => {
      const r = milestoneReward(m);
      addPills += r.pills;
      addPacks += r.packs;
      claimed[String(m)] = 1;
    });

    try {
      localStorage.setItem(LS.milestones, JSON.stringify(claimed));
    } catch {}

    // pills
    const curP = readNum(LS.pills);
    const nextP = curP + addPills;
    try {
      localStorage.setItem(LS.pills, String(nextP));
    } catch {}
    setPillsCount(nextP);

    // free packs
    const curFree = readNum(LS.freePacks);
    const nextFree = curFree + addPacks;
    try {
      localStorage.setItem(LS.freePacks, String(nextFree));
    } catch {}

    // One toast only (no spam)
    toast.push(`🎁 Milestone raggiunta! +${addPills}💊 e +${addPacks} bustine`, "success", { duration: 3500 });
  }, [lvl]); // eslint-disable-line react-hooks/exhaustive-deps

  const nextM = nextMilestone(lvl);

  const pathItems = useMemo(() => {
    // Show a small "Duolingo-like" strip: current -> next milestone (max 8 nodes)
    const start = Math.max(1, lvl);
    const end = Math.max(start + 6, nextM); // ensure we include the chest
    const items: Array<{ n: number; kind: "node" | "chest"; done: boolean; current: boolean }> = [];
    for (let n = start; n <= end; n++) {
      const isChest = n % 5 === 0;
      items.push({ n, kind: isChest ? "chest" : "node", done: n < lvl, current: n === lvl });
      if (items.length >= 8) break;
    }
    // If milestone not included, force it as last item
    if (!items.some((x) => x.n === nextM)) {
      items[items.length - 1] = { n: nextM, kind: "chest", done: nextM < lvl, current: nextM === lvl };
    }
    return items;
  }, [lvl, nextM]);

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
            <div style={{ marginTop: 8, opacity: 0.7, fontSize: 12 }}>Usale per aprire bustine e avanzare.</div>
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
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 999,
                        border: it.current ? "1px solid rgba(56,189,248,0.70)" : "1px solid rgba(255,255,255,0.14)",
                        background: it.done
                          ? "rgba(34,197,94,0.18)"
                          : it.kind === "chest"
                          ? "rgba(250,204,21,0.18)"
                          : "rgba(255,255,255,0.06)",
                        display: "grid",
                        placeItems: "center",
                        flex: "0 0 auto",
                        boxShadow: it.current ? "0 0 0 3px rgba(56,189,248,0.10)" : "none",
                      }}
                      title={it.kind === "chest" ? `Milestone Lv ${it.n}` : `Lv ${it.n}`}
                    >
                      {it.kind === "chest" ? "🎁" : it.current ? "⭐" : it.done ? "✓" : it.n}
                    </div>
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
