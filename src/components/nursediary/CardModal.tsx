import React from "react";

type CardRarity = "comune" | "rara" | "epica" | "leggendaria";

export type CardModalItem = {
  id: string;
  name: string;
  image: string;
  description?: string;
  rarity: CardRarity;
};

const aura: Record<CardRarity, string> = {
  comune: "0 0 20px rgba(255,255,255,0.15)",
  rara: "0 0 30px rgba(96,165,250,0.6)",
  epica: "0 0 40px rgba(168,85,247,0.7)",
  leggendaria: "0 0 50px rgba(250,204,21,0.8)",
};

// ✅ aura helper (NO background to avoid duplicate keys)
function rarityAura(r: CardRarity): React.CSSProperties {
  return {
    boxShadow: aura[r],
    border: "1px solid rgba(255,255,255,0.12)",
  };
}

export function CardModal({
  card,
  onClose,
}: {
  card: CardModalItem;
  onClose: () => void;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 14,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          // ✅ spread first, then solid background once
          ...rarityAura(card.rarity),
          background: "#020617",
          borderRadius: 24,
          padding: 18,
          maxWidth: 360,
          width: "100%",
        }}
      >
        <div
          style={{
            borderRadius: 18,
            padding: 10,
            background: "rgba(2,6,23,0.35)",
            border: "1px solid rgba(255,255,255,0.10)",
          }}
        >
          <img
            src={card.image}
            alt={card.name}
            style={{
              width: "100%",
              objectFit: "contain",
              display: "block",
            }}
          />
        </div>

        <h3 style={{ marginTop: 12, color: "rgba(255,255,255,0.95)" }}>{card.name}</h3>
        {card.description && <p style={{ opacity: 0.82, color: "rgba(255,255,255,0.85)" }}>{card.description}</p>}

        <button
          type="button"
          onClick={onClose}
          style={{
            marginTop: 12,
            width: "100%",
            padding: "10px 12px",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "#0b1220",
            color: "rgba(255,255,255,0.92)",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Chiudi
        </button>
      </div>
    </div>
  );
}
