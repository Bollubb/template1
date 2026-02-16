import React, { useMemo } from "react";
import { computeLevel } from "@/features/progress/xp";

export type PlayerCard = {
  id: string;
  name: string;
  profession: string;
  bio: string;
  avatar: string | null;
  /**
   * In "weekly" mode this is XP gained this week.
   * In "global" mode this is total XP.
   */
  xp: number;
  /** Optional: total XP (used to display level in weekly mode). */
  totalXp?: number;
  /** Optional: career tag for filtering (e.g., 'general', 'emergency'). */
  career?: string | null;
};

function rowCard(): React.CSSProperties {
  return {
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 16,
    padding: 12,
    background: "#0f172a",
    display: "flex",
    gap: 10,
    alignItems: "center",
    cursor: "pointer",
  };
}

function miniBadge(): React.CSSProperties {
  return {
    padding: "3px 8px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    fontWeight: 900,
    fontSize: 12,
    color: "rgba(255,255,255,0.90)",
    whiteSpace: "nowrap",
  };
}

export default function Leaderboard({
  players,
  currentUserId,
  onSelect,
  mode,
  filterCareer,
}: {
  players: PlayerCard[];
  currentUserId: string;
  onSelect: (p: PlayerCard) => void;
  mode: "weekly" | "global";
  /** Optional: filter to a specific career tag. */
  filterCareer?: string | null;
}) {
  const rows = useMemo(() => {
    const basePlayers = filterCareer ? players.filter((p) => p.career === filterCareer) : players;

    if (mode === "weekly") {
      const scored = basePlayers.map((p) => {
        const base = typeof p.totalXp === "number" ? p.totalXp : p.xp;
        return { p, lvl: computeLevel(base).level };
      });
      scored.sort((a, b) => {
        if (b.p.xp !== a.p.xp) return b.p.xp - a.p.xp;
        return a.p.name.localeCompare(b.p.name);
      });
      return scored.map((x, idx) => ({ ...x, rank: idx + 1 }));
    }

    const scored = basePlayers.map((p) => ({ p, lvl: computeLevel(p.xp).level }));
    scored.sort((a, b) => {
      if (b.lvl !== a.lvl) return b.lvl - a.lvl;
      return b.p.xp - a.p.xp;
    });
    return scored.map((x, idx) => ({ ...x, rank: idx + 1 }));
  }, [players, mode, filterCareer]);

  const medal = (rank: number) => {
    if (rank === 1) return { emoji: "🥇", glow: "rgba(245,158,11,0.25)" };
    if (rank === 2) return { emoji: "🥈", glow: "rgba(148,163,184,0.22)" };
    if (rank === 3) return { emoji: "🥉", glow: "rgba(234,88,12,0.22)" };
    return null;
  };

  const weeklyReward = (rank: number) => {
    if (rank === 1) return 300;
    if (rank === 2) return 175;
    if (rank === 3) return 100;
    return 0;
  };

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {rows.map(({ p, lvl, rank }) => {
        const me = p.id === currentUserId;
        const m = medal(rank);
        const reward = mode === "weekly" ? weeklyReward(rank) : 0;
        return (
          <div
            key={p.id}
            onClick={() => onSelect(p)}
            style={{
              ...rowCard(),
              outline: me ? "2px solid rgba(59,130,246,0.55)" : "none",
              background: me ? "rgba(59,130,246,0.10)" : "#0f172a",
              boxShadow: m ? `0 0 0 1px rgba(255,255,255,0.06), 0 0 0 6px ${m.glow}` : "none",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 16,
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
                display: "grid",
                placeItems: "center",
                flex: "0 0 auto",
              }}
            >
              {p.avatar ? (
                <img src={p.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: 18 }}>👤</span>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                <div style={{ fontWeight: 950, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {m ? `${m.emoji} ` : ""}{rank}. {p.name}
                </div>
                <div style={miniBadge()}>Lv {lvl}</div>
              </div>
              <div style={{ opacity: 0.78, fontWeight: 850, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {p.profession}
              </div>
            </div>

            <div style={{ textAlign: "right", display: "grid", gap: 4 }}>
              <div style={{ fontWeight: 950 }}>
                {mode === "weekly" ? `${p.xp} XP sett.` : `${p.xp} XP`}
              </div>
              {mode === "weekly" && reward > 0 ? (
                <div style={{ ...miniBadge(), justifySelf: "end" }}>+{reward} 💊</div>
              ) : null}
              {me ? <div style={{ ...miniBadge(), justifySelf: "end" }}>Tu</div> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
