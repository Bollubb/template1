import React, { useMemo } from "react";
import { computeLevel } from "@/features/progress/xp";

export type PlayerCard = {
  id: string;
  name: string;
  profession: string;
  bio: string;
  avatar: string | null;
  xp: number;
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
}: {
  players: PlayerCard[];
  currentUserId: string;
  onSelect: (p: PlayerCard) => void;
}) {
  const rows = useMemo(() => {
    const scored = players.map((p) => ({ p, lvl: computeLevel(p.xp).level }));
    scored.sort((a, b) => {
      if (b.lvl !== a.lvl) return b.lvl - a.lvl;
      return b.p.xp - a.p.xp;
    });
    return scored.map((x, idx) => ({ ...x, rank: idx + 1 }));
  }, [players]);

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {rows.map(({ p, lvl, rank }) => {
        const me = p.id === currentUserId;
        return (
          <div
            key={p.id}
            onClick={() => onSelect(p)}
            style={{
              ...rowCard(),
              outline: me ? "2px solid rgba(59,130,246,0.55)" : "none",
              background: me ? "rgba(59,130,246,0.10)" : "#0f172a",
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
                  {rank}. {p.name}
                </div>
                <div style={miniBadge()}>Lv {lvl}</div>
              </div>
              <div style={{ opacity: 0.78, fontWeight: 850, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {p.profession}
              </div>
            </div>

            <div style={{ textAlign: "right", display: "grid", gap: 4 }}>
              <div style={{ fontWeight: 950 }}>{p.xp} XP</div>
              {me ? <div style={{ ...miniBadge(), justifySelf: "end" }}>Tu</div> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
