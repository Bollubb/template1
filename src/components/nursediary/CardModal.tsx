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
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#020617",
          borderRadius: 24,
          padding: 20,
          boxShadow: aura[card.rarity],
          maxWidth: 320,
          width: "90%",
        }}
      >
        <img
          src={card.image}
          alt={card.name}
          style={{ width: "100%", objectFit: "contain" }}
        />
        <h3 style={{ marginTop: 10 }}>{card.name}</h3>
        {card.description && <p style={{ opacity: 0.8 }}>{card.description}</p>}
      </div>
    </div>
  );
}
