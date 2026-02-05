import type { CardRarity, NurseCard } from "./cards.data";

export type CardCollection = Record<string, number>;

// Drop-rate iniziali (facili da cambiare): somma = 1
export const PACK_DROP: Record<CardRarity, number> = {
  comune: 0.82,
  rara: 0.16,
  epica: 0.019,
  leggendaria: 0.001,
};

export function pickRarity(rng: () => number = Math.random): CardRarity {
  const r = rng();
  let acc = 0;
  for (const [rarity, p] of Object.entries(PACK_DROP) as [CardRarity, number][]) {
    acc += p;
    if (r <= acc) return rarity;
  }
  return "comune";
}

export function pickCard(cards: NurseCard[], rarity: CardRarity, rng: () => number = Math.random): NurseCard {
  const pool = cards.filter((c) => c.rarity === rarity);
  const base = pool.length > 0 ? pool : cards;
  return base[Math.floor(rng() * base.length)]!;
}

export function openPack(cards: NurseCard[], rng: () => number = Math.random): NurseCard[] {
  // 1 o 2 carte (come avevi pensato): 70% una carta, 30% due carte
  const count = rng() < 0.3 ? 2 : 1;
  const opened: NurseCard[] = [];
  for (let i = 0; i < count; i += 1) {
    const rarity = pickRarity(rng);
    opened.push(pickCard(cards, rarity, rng));
  }
  return opened;
}

export function addToCollection(col: CardCollection, cardId: string, qty = 1): CardCollection {
  return { ...col, [cardId]: (col[cardId] ?? 0) + qty };
}

export function getDuplicates(col: CardCollection): CardCollection {
  const dup: CardCollection = {};
  for (const [id, n] of Object.entries(col)) {
    if (n > 1) dup[id] = n - 1; // conserva sempre 1 copia
  }
  return dup;
}
