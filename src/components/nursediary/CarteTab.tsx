import React, { useEffect, useMemo, useState } from "react";

import { NURSE_CARDS, type CardRarity, type NurseCard } from "../../features/cards/cards.data";
import { PACK_DROP, getDuplicates } from "../../features/cards/cards.logic";
import { incDailyCounter } from "@/features/progress/dailyCounters";
import { useToast } from "./Toast";
import { isPremium } from "@/features/profile/premium";
import { PACK_COST_BASE, PACK_COST_PREMIUM, PREMIUM_EXTRA_ROLLS } from "@/features/cards/economy";

import { CardCollection, type CardCollectionItem } from "./CardCollection";
import { CardModal, type CardModalItem } from "./CardModal";

const LS = {
  collection: "nd_card_collection",
  freePacks: "nd_free_packs",
  pity: "nd_pity_v1",
} as const;

type PityState = { sinceEpic: number; sinceLegend: number };

const RECYCLE: Record<CardRarity, number> = {
  comune: 2,
  rara: 6,
  epica: 16,
  leggendaria: 40,
};

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
  if (r === "leggendaria") {
    return {
      backgroundImage: "linear-gradient(90deg,#facc15,#f59e0b,#facc15)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      fontWeight: 950,
    };
  }
  if (r === "rara") return { color: "#60a5fa", fontWeight: 900 };
  return { color: "#9ca3af", fontWeight: 900 };
}

function pickRarity(rng: () => number): CardRarity {
  const x = rng();
  let acc = 0;
  const order: CardRarity[] = ["comune", "rara", "epica", "leggendaria"];
  for (const r of order) {
    acc += PACK_DROP[r];
    if (x <= acc) return r;
  }
  return "comune";
}

function pickCardByRarity(cards: NurseCard[], rarity: CardRarity, rng: () => number): NurseCard {
  const pool = cards.filter((c) => c.rarity === rarity);
  if (!pool.length) return cards[Math.floor(rng() * cards.length)];
  return pool[Math.floor(rng() * pool.length)];
}

function openPackWithPity(cards: NurseCard[], pity: PityState, rng: () => number = Math.random): { pulls: NurseCard[]; next: PityState } {
  const count = rng() < 0.3 ? 2 : 1;
  const pulls: NurseCard[] = [];
  let next = { ...pity };

  for (let i = 0; i < count; i += 1) {
    // pity priority: legend > epic
    let forced: CardRarity | null = null;
    if (next.sinceLegend >= 25) forced = "leggendaria";
    else if (next.sinceEpic >= 10) forced = "epica";

    const rarity = forced ?? pickRarity(rng);
    const card = pickCardByRarity(cards, rarity, rng);
    pulls.push(card);

    // update pity counters
    if (rarity === "leggendaria") {
      next.sinceLegend = 0;
      next.sinceEpic = 0;
    } else if (rarity === "epica") {
      next.sinceEpic = 0;
      next.sinceLegend += 1;
    } else {
      next.sinceEpic += 1;
      next.sinceLegend += 1;
    }
  }

  return { pulls, next };
}

export function CarteTab({
  pills,
  setPills,
}: {
  pills: number;
  setPills: React.Dispatch<React.SetStateAction<number>>;
}) {
  const toast = useToast();

  const [premium, setPremium] = useState(false);

  const [owned, setOwned] = useState<Record<string, number>>({});
  const [opening, setOpening] = useState(false);
  const [lastPull, setLastPull] = useState<NurseCard[] | null>(null);

  // ✅ FREE PACKS
  const [freePacks, setFreePacks] = useState<number>(0);

  const [rarityFilter, setRarityFilter] = useState<CardRarity | "tutte">("tutte");

  // ✅ pity
  const [pity, setPity] = useState<PityState>({ sinceEpic: 0, sinceLegend: 0 });

  // modal
  const [modalCard, setModalCard] = useState<CardModalItem | null>(null);

  // bootstrap
  useEffect(() => {
    if (typeof window === "undefined") return;

    setPremium(isPremium());

    const col = safeJson<Record<string, number>>(localStorage.getItem(LS.collection), {});
    setOwned(col);

    const fp = Number(localStorage.getItem(LS.freePacks) || "0");
    setFreePacks(Number.isFinite(fp) ? fp : 0);

    const ps = safeJson<PityState>(localStorage.getItem(LS.pity), { sinceEpic: 0, sinceLegend: 0 });
    setPity(ps);
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

  // persist pity
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(LS.pity, JSON.stringify(pity));
    } catch {}
  }, [pity]);

  const cards: CardCollectionItem[] = useMemo(() => {
    return NURSE_CARDS.map((c) => ({
      id: c.id,
      name: c.name,
      image: c.image,
      rarity: c.rarity,
    }));
  }, []);

  const visibleCards = useMemo(() => {
    if (rarityFilter === "tutte") return cards;
    return cards.filter((c) => c.rarity === rarityFilter);
  }, [cards, rarityFilter]);

  const ownedUnique = useMemo(() => {
    return Object.keys(owned).filter((id) => (owned[id] || 0) > 0).length;
  }, [owned]);


  const completion = useMemo(() => {
    const unique = Object.keys(owned).filter((k) => (owned[k] || 0) > 0).length;
    return { unique, total: NURSE_CARDS.length };
  }, [owned]);

  const duplicates = useMemo(() => getDuplicates(owned), [owned]);
  const recyclePreview = useMemo(() => {
    let pillsGain = 0;
    let cardsCount = 0;
    for (const [id, n] of Object.entries(duplicates)) {
      const card = NURSE_CARDS.find((c) => c.id === id);
      if (!card) continue;
      cardsCount += n;
      pillsGain += (RECYCLE[card.rarity] || 0) * n;
    }
    return { pillsGain, cardsCount };
  }, [duplicates]);

  function addToCollection(pulls: NurseCard[]) {
    setOwned((prev) => {
      const next = { ...prev };
      for (const p of pulls) next[p.id] = (next[p.id] || 0) + 1;
      return next;
    });
  }

  function startOpenPaid() {
    const cost = PACK_COST_BASE;
    if (opening || pills < cost) return;
    setOpening(true);

    window.setTimeout(() => {
      const res = openPackWithPity(NURSE_CARDS, pity);
      addToCollection(res.pulls);
      setLastPull(res.pulls);
      setPity(res.next);

      setPills((p) => p - cost);
      incDailyCounter("nd_daily_packs_opened", 1);
      toast.push(`Bustina aperta (-${cost} 💊)`, "info");

      setOpening(false);
    }, 850);
  }

  function startOpenPremium() {
    const cost = PACK_COST_PREMIUM;
    if (!premium) return;
    if (opening || pills < cost) return;
    setOpening(true);

    window.setTimeout(() => {
      // Premium pack = standard opening + a small extra roll (conservative)
      let allPulls: NurseCard[] = [];
      let nextPity = pity;

      const first = openPackWithPity(NURSE_CARDS, nextPity);
      allPulls = allPulls.concat(first.pulls);
      nextPity = first.next;

      for (let i = 0; i < PREMIUM_EXTRA_ROLLS; i += 1) {
        const extra = openPackWithPity(NURSE_CARDS, nextPity);
        allPulls = allPulls.concat(extra.pulls);
        nextPity = extra.next;
      }

      addToCollection(allPulls);
      setLastPull(allPulls);
      setPity(nextPity);

      setPills((p) => p - cost);
      incDailyCounter("nd_daily_packs_opened", 1);
      toast.push(`Bustina Premium aperta (-${cost} 💊)`, "info");

      setOpening(false);
    }, 850);
  }

  function startOpenFree() {
    if (opening || freePacks <= 0) return;
    setOpening(true);

    window.setTimeout(() => {
      const res = openPackWithPity(NURSE_CARDS, pity);
      addToCollection(res.pulls);
      setLastPull(res.pulls);
      setPity(res.next);

      setFreePacks((n) => Math.max(0, n - 1));
      incDailyCounter("nd_daily_packs_opened", 1);
      toast.push("Bustina GRATIS aperta 🎁", "success");

      setOpening(false);
    }, 850);
  }

  function recycleAllDuplicates() {
    if (recyclePreview.cardsCount <= 0) return;

    // remove duplicates (keep 1 copy)
    const nextOwned = { ...owned };
    let pillsGain = 0;
    let removed = 0;

    for (const [id, n] of Object.entries(duplicates)) {
      const card = NURSE_CARDS.find((c) => c.id === id);
      if (!card) continue;
      // subtract duplicates
      nextOwned[id] = (nextOwned[id] || 0) - n;
      removed += n;
      pillsGain += (RECYCLE[card.rarity] || 0) * n;
    }

    setOwned(nextOwned);
    setPills((p) => p + pillsGain);
    incDailyCounter("nd_daily_recycled", removed);
    toast.push(`Riciclo: +${pillsGain} 💊`, "success");
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
              Collezione: {completion.unique}/{completion.total}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
            <div style={pillBox()}>💊 {pills}</div>
            <div style={pillBox()}>🎁 {freePacks}</div>
          </div>
        </div>

        {/* Pack actions */}
        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" disabled={opening || pills < PACK_COST_BASE} onClick={startOpenPaid} style={btnPrimary(opening || pills < PACK_COST_BASE, "#0ea5e9", "#020617")}>
            Apri bustina ({PACK_COST_BASE} 💊)
          </button>

          {premium && (
            <button type="button" disabled={opening || pills < PACK_COST_PREMIUM} onClick={startOpenPremium} style={btnPrimary(opening || pills < PACK_COST_PREMIUM, "#f59e0b", "#020617")}>
              Apri Premium ({PACK_COST_PREMIUM} 💊)
            </button>
          )}

          <button type="button" disabled={opening || freePacks <= 0} onClick={startOpenFree} style={btnPrimary(opening || freePacks <= 0, "#22c55e", "#052e16")}>
            Apri GRATIS ({freePacks})
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
              width: "min(420px, 96%)",
              aspectRatio: "3/4",
              borderRadius: 22,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.03)",
              display: "grid",
              placeItems: "center",
              position: "relative",
              transform: opening ? "rotate(-1.5deg) scale(1.02)" : "none",
              boxShadow: opening ? "0 0 55px rgba(14,165,233,0.22)" : "none",
              transition: "transform 240ms ease, box-shadow 240ms ease",
              overflow: "hidden",
            }}
          >
            <img
              src="/packs/pack-antibiotici.png"
              alt="Bustina"
              style={{
                width: "92%",
                height: "92%",
                objectFit: "contain",
                opacity: opening ? 0.92 : 1,
                transform: opening ? "scale(1.03)" : "none",
                transition: "transform 240ms ease, opacity 240ms ease",
              }}
            />

            <div
              style={{
                position: "absolute",
                bottom: 10,
                left: 0,
                right: 0,
                display: "grid",
                placeItems: "center",
                fontSize: 12,
                fontWeight: 950,
                letterSpacing: 1,
                color: "rgba(255,255,255,0.78)",
                textShadow: "0 1px 10px rgba(0,0,0,0.65)",
              }}
            >
              {opening ? "APERTURA..." : "BUSTINA"}
            </div>
          </div>
        </div>

        {/* Recycle */}
        <div style={{ marginTop: 12, borderTop: "1px solid rgba(255,255,255,0.10)", paddingTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
            <div>
              <div style={{ fontWeight: 950 }}>Riciclo duplicati</div>
              <div style={{ opacity: 0.72, fontWeight: 700, fontSize: 12 }}>
                Lascia 1 copia per carta. Conversione: 2/6/16/40 💊
              </div>
            </div>
            <div style={{ opacity: 0.8, fontWeight: 900, fontSize: 12 }}>
              {recyclePreview.cardsCount} carte → +{recyclePreview.pillsGain} 💊
            </div>
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={recycleAllDuplicates}
              disabled={recyclePreview.cardsCount <= 0}
              style={btnPrimary(recyclePreview.cardsCount <= 0, "#f59e0b", "#1f2937")}
            >
              Ricicla duplicati
            </button>
          </div>
        </div>
      </div>

      {/* Last pull */}
      {lastPull && (
        <div style={cardWrap()}>
          <div style={{ color: "rgba(255,255,255,0.92)", fontWeight: 950, marginBottom: 10 }}>Hai trovato</div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(3, lastPull.length)}, 1fr)`, gap: 12 }}>
            {lastPull.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() =>
                  setModalCard({
                    id: c.id,
                    name: c.name,
                    image: c.image,
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
      <div style={cardWrap()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
          <div style={{ color: "rgba(255,255,255,0.92)", fontWeight: 950 }}>Collezione</div>
          <div style={{ color: "rgba(255,255,255,0.70)", fontWeight: 900, fontSize: 12 }}>
            Completamento: {ownedUnique}/{cards.length}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          {(["tutte", "comune", "rara", "epica", "leggendaria"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRarityFilter(r)}
              style={{
                padding: "10px 12px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.12)",
                background: rarityFilter === r ? "rgba(14,165,233,0.18)" : "rgba(255,255,255,0.04)",
                color: "rgba(255,255,255,0.92)",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              {r === "tutte" ? "Tutte" : r.toUpperCase()}
            </button>
          ))}
        </div>
        <CardCollection
          cards={visibleCards}
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

function pillBox(): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "#0f172a",
    color: "rgba(255,255,255,0.90)",
    fontWeight: 900,
  };
}

function btnPrimary(disabled: boolean, bg: string, fg: string): React.CSSProperties {
  return {
    padding: "12px 14px",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.12)",
    background: disabled ? "rgba(255,255,255,0.06)" : bg,
    color: disabled ? "rgba(255,255,255,0.55)" : fg,
    fontWeight: 950,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

function cardWrap(): React.CSSProperties {
  return {
    border: "1px solid rgba(255,255,255,0.10)",
    background: "#0b1220",
    borderRadius: 20,
    padding: 14,
  };
}
