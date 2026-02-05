import React from "react";

type CardRarity = "comune" | "rara" | "epica" | "leggendaria";

export type CardCollectionItem = {
  id: string;
  name: string;
  image: string;
  rarity: CardRarity;
};

const rarityColors: Record<CardRarity, string> = {
  comune: "#9ca3af",
  rara: "#60a5fa",
  epica: "#a855f7",
  leggendaria: "linear-gradient(90deg,#facc15,#f59e0b,#facc15)",
};

export function CardCollection({
  cards,
  owned,
  onOpen,
}: {
  cards: CardCollectionItem[];
  owned: Record<string, number>;
  onOpen: (card: CardCollectionItem) => void;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
      {cards.map((c) => {
        const count = owned[c.id] || 0;
        const locked = count === 0;

        return (
          <div
            key={c.id}
            onClick={() => !locked && onOpen(c)}
            style={{
              position: "relative",
              padding: 8,
              borderRadius: 14,
              background: "#0f172a",
              border: "1px solid rgba(255,255,255,0.12)",
              cursor: locked ? "default" : "pointer",
              opacity: locked ? 0.35 : 1,
            }}
          >
            <img
              src={c.image}
              alt={c.name}
              style={{
                width: "100%",
                height: 120,
                objectFit: "contain",
                filter: locked ? "grayscale(1)" : "none",
              }}
            />

            {locked && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                }}
              >
                🔒
              </div>
            )}

            <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700 }}>{c.name}</div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                background: rarityColors[c.rarity],
                WebkitBackgroundClip: c.rarity === "leggendaria" ? "text" : undefined,
                WebkitTextFillColor: c.rarity === "leggendaria" ? "transparent" : undefined,
                color: c.rarity !== "leggendaria" ? rarityColors[c.rarity] : undefined,
              }}
            >
              {c.rarity.toUpperCase()}
            </div>
          </div>
        );
      })}
    </div>
  );
}
