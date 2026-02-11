import React from "react";
import { computeLevel } from "@/features/progress/xp";
import type { PlayerCard } from "./Leaderboard";

export default function ProfileCardModal({
  open,
  player,
  onClose,
}: {
  open: boolean;
  player: PlayerCard | null;
  onClose: () => void;
}) {
  if (!open || !player) return null;

  const lvl = computeLevel(player.xp);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(0,0,0,0.55)",
        display: "grid",
        placeItems: "center",
        padding: 14,
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "#0b1220",
          padding: 14,
          boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
          display: "grid",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <div style={{ fontWeight: 950 }}>Scheda profilo</div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 10px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.92)",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Chiudi
          </button>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 22,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.06)",
              display: "grid",
              placeItems: "center",
              flex: "0 0 auto",
            }}
          >
            {player.avatar ? (
              <img src={player.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: 28 }}>👤</span>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 980, fontSize: 16, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {player.name}
            </div>
            <div style={{ opacity: 0.82, fontWeight: 850, fontSize: 13, marginTop: 2 }}>
              {player.profession}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              <Badge>Lv {lvl.level}</Badge>
              <Badge>{player.xp} XP</Badge>
              <Badge>
                {Math.round(lvl.pct * 100)}% al livello {lvl.level + 1}
              </Badge>
            </div>
          </div>
        </div>

        <div
          style={{
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.04)",
            borderRadius: 16,
            padding: 12,
            color: "rgba(255,255,255,0.86)",
            fontWeight: 850,
            lineHeight: 1.35,
            whiteSpace: "pre-wrap",
          }}
        >
          {player.bio?.trim() ? player.bio.trim() : "Nessuna descrizione impostata."}
        </div>
      </div>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        padding: "4px 10px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.06)",
        color: "rgba(255,255,255,0.92)",
        fontWeight: 900,
        fontSize: 12,
      }}
    >
      {children}
    </span>
  );
}
