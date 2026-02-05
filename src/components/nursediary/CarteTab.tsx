import React, { useEffect, useMemo, useState } from "react";

import { ALL_CARDS } from "../../features/cards/cards.data";
import { openPack, type CardRarity } from "../../features/cards/cards.logic";

import { CardCollection, type CardCollectionItem } from "./CardCollection";
import { CardModal, type CardModalItem } from "./CardModal";

const LS = {
  collection: "nd_card_collection",
  freePacks: "nd_free_packs",
} as const;

function safeJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function rarityLabel(r: CardRarity) {
  if (r === "comune") return "COMUNE";
  if (r === "rara") return "RARA";
  if (r === "epica") return "EPICA";
  return "LEGGENDARIA";
}

function rarityTextStyle(r: CardRarity): React.CSSProperties {
  if (r === "epica") return { color: "#a855f7", fontWeight: 900 };
  if (r === "leggendaria")
    return {
      backgroundImage: "linear-gradient(90deg,#facc15,#f59e0b,#facc15)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      fontWeight: 950,
    };
  if (r === "rara") return { color: "#60a5fa", fontWeight: 900 };
  return { color: "#9ca3af", fontWeight: 900 };
}

export function CarteTab({
  pills,
  setPills,
  packCost,
}: {
  pills: number;
  setPills: React.Dispatch<React.SetStateAction<number>>;
  packCost: number;
}) {
  const [owned, setOwned] = useState<Record<string, number>>({});
  const [opening, setOpening] = useState(false);
  const [lastPull, setLastPull] = useState<any[] | null>(null);

  // ✅ FREE PACKS
  const [freePacks, setFreePacks] = useState<number>(0);

  // modal
  const [modalCard, setModalCard] = useState<CardModalItem | null>(null);

  // bootstrap collection + free packs
  useEffect(() => {
    if (typeof window === "undefined") return;

    const col = safeJson<Record<string, number>>(localStorage.getItem(LS.collection), {});
    setOwned(col);

    const fp = Number(localStorage.getItem(LS.freePacks) || "0");
    setFreePacks(Number.isFinite(fp) ? fp : 0);
  }, []);

  // persist collection
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(LS.collection, JSON.stringify(owned));
    } catch {}
  }, [owned]);

  // persist free packs
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(LS.freePacks, String(freePacks));
    } catch {}
  }, [freePacks]);

  const cards: CardCollectionItem[] = useMemo(() => {
    return ALL_CARDS.map((c: any) => ({
      id: c.id,
      name: c.name,
      image: c.image,
      rarity: c.rarity,
    }));
  }, []);

  function addToCollection(pulls: any[]) {
    setOwned((prev) => {
      const next = { ...prev };
      for (const p of pulls) {
        next[p.id] = (next[p.id] || 0) + 1;
      }
      return next;
    });
  }

  function startOpen(pullsCount: number, costPills: number, isFree: boolean) {
    if (opening) return;

    setOpening(true);

    // anim opening
    window.setTimeout(() => {
      const pulls = openPack(pullsCount);
      addToCollection(pulls);
      setLastPull(pulls);

      if (!isFree) setPills((p) => p - costPills);
      else setFreePacks((n) => Math.max(0, n - 1));

      setOpening(false);
    }, 850);
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* Top bar */}
      <div
        style={{
          border: "1px solid rgba(255,255,255,0.10)",
          background: "#0b1220",
          borderRadius: 20,
          padding: 14,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
          <div>
            <div style={{ color: "rgba(255,255,255,0.92)", fontWeight: 950, fontSize: 18 }}>Carte</div>
            <div style={{ color: "rgba(255,255,255,0.70)", fontWeight: 700, fontSize: 13 }}>
              Apri bustine, colleziona e completa la serie
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "#0f172a",
                color: "rgba(255,255,255,0.90)",
                fontWeight: 900,
              }}
            >
              Pillole: {pills}
            </div>
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "#0f172a",
                color: "rgba(255,255,255,0.90)",
                fontWeight: 900,
              }}
            >
              Free: {freePacks}
            </div>
          </div>
        </div>

        {/* Pack actions */}
        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            disabled={opening || pills < packCost}
            onClick={() => startOpen(1, packCost, false)}
            style={{
              padding: "12px 14px",
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.12)",
              background: opening || pills < packCost ? "rgba(255,255,255,0.06)" : "#0ea5e9",
              color: opening || pills < packCost ? "rgba(255,255,255,0.55)" : "#020617",
              fontWeight: 950,
              cursor: opening || pills < packCost ? "not-allowed" : "pointer",
            }}
          >
            Apri bustina ({packCost} pillole)
          </button>

          <button
            type="button"
            disabled={opening || freePacks <= 0}
            onClick={() => {
              if (freePacks <= 0) return;
              // 1–2 carte free
              startOpen(1 + Math.floor(Math.random() * 2), 0, true);
            }}
            style={{
              padding: "12px 14px",
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.12)",
              background: opening || freePacks <= 0 ? "rgba(255,255,255,0.06)" : "#22c55e",
              color: opening || freePacks <= 0 ? "rgba(255,255,255,0.55)" : "#052e16",
              fontWeight: 950,
              cursor: opening || freePacks <= 0 ? "not-allowed" : "pointer",
            }}
          >
            Apri bustina GRATIS ({freePacks})
          </button>
        </div>

        {/* Pack image */}
        <div
          style={{
            marginTop: 12,
            borderRadius: 20,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "#0f172a",
            padding: 14,
            display: "grid",
            placeItems: "center",
          }}
        >
          <div
            style={{
              width: "min(340px, 92%)",
              aspectRatio: "3/4",
              borderRadius: 22,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.04)",
              display: "grid",
              placeItems: "center",
              transform: opening ? "rotate(-1.5deg) scale(1.02)" : "none",
              boxShadow: opening ? "0 0 40px rgba(14,165,233,0.25)" : "none",
              transition: "transform 240ms ease, box-shadow 240ms ease",
            }}
          >
            {/* If you have a pack image, put it here; otherwise placeholder */}
            <div style={{ color: "rgba(255,255,255,0.75)", fontWeight: 950, letterSpacing: 1 }}>
              {opening ? "APERTURA..." : "BUSTINA"}
            </div>
          </div>
        </div>
      </div>

      {/* Last pull */}
      {lastPull && (
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.10)",
            background: "#0b1220",
            borderRadius: 20,
            padding: 14,
          }}
        >
          <div style={{ color: "rgba(255,255,255,0.92)", fontWeight: 950, marginBottom: 10 }}>Hai trovato</div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(3, lastPull.length)}, 1fr)`, gap: 12 }}>
            {lastPull.map((c: any) => (
              <button
                key={c.id}
                type="button"
                onClick={() =>
                  setModalCard({
                    id: c.id,
                    name: c.name,
                    image: c.image,
                    description: c.description,
                    rarity: c.rarity,
                  })
                }
                style={{
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "#0f172a",
                  padding: 10,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <img src={c.image} alt={c.name} style={{ width: "100%", height: 120, objectFit: "contain" }} />
                <div style={{ marginTop: 8, fontWeight: 900, color: "rgba(255,255,255,0.92)" }}>{c.name}</div>
                <div style={{ marginTop: 2, fontSize: 12, ...rarityTextStyle(c.rarity) }}>{rarityLabel(c.rarity)}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Collection */}
      <div
        style={{
          border: "1px solid rgba(255,255,255,0.10)",
          background: "#0b1220",
          borderRadius: 20,
          padding: 14,
        }}
      >
        <div style={{ color: "rgba(255,255,255,0.92)", fontWeight: 950, marginBottom: 10 }}>Collezione</div>
        <CardCollection
          cards={cards}
          owned={owned}
          onOpen={(c) =>
            setModalCard({
              id: c.id,
              name: c.name,
              image: c.image,
              rarity: c.rarity,
            })
          }
        />
      </div>

      {modalCard && <CardModal card={modalCard} onClose={() => setModalCard(null)} />}
    </div>
  );
}
