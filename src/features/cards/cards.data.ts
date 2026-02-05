export type CardRarity = "comune" | "rara" | "epica" | "leggendaria";

export type NurseCard = {
  id: string;
  name: string;
  rarity: CardRarity;
  image: string; // public path
};

// Dataset iniziale (antibiotici) – usa le immagini già presenti in /public/cards
export const NURSE_CARDS: NurseCard[] = [
  { id: "antibiotici-penicilline", name: "Penicilline", rarity: "comune", image: "/cards/antibiotici-penicilline.png" },
  { id: "antibiotici-cefalosporine", name: "Cefalosporine", rarity: "comune", image: "/cards/antibiotici-cefalosporine.png" },
  { id: "antibiotici-macrolidi", name: "Macrolidi", rarity: "comune", image: "/cards/antibiotici-macrolidi.png" },
  { id: "antibiotici-fluorochinoloni", name: "Fluorochinoloni", rarity: "rara", image: "/cards/antibiotici-fluorochinoloni.png" },
  { id: "antibiotici-aminoglicosidi", name: "Aminoglicosidi", rarity: "rara", image: "/cards/antibiotici-aminoglicosidi.png" },
  { id: "antibiotici-glicopeptidi", name: "Glicopeptidi", rarity: "rara", image: "/cards/antibiotici-glicopeptidi.png" },
  { id: "antibiotici-lincosamidi", name: "Lincosamidi", rarity: "epica", image: "/cards/antibiotici-lincosamidi.png" },
  { id: "antibiotici-sulfonamidi", name: "Sulfonamidi", rarity: "epica", image: "/cards/antibiotici-sulfonamidi.png" },
  { id: "antibiotici-tetracicline", name: "Tetracicline", rarity: "epica", image: "/cards/antibiotici-tetracicline.png" },
  { id: "antibiotici-carbapenemi", name: "Carbapenemi", rarity: "epica", image: "/cards/antibiotici-carbapenemi.png" },
  { id: "antibiotici-nitroimidazoli", name: "Nitroimidazoli", rarity: "leggendaria", image: "/cards/antibiotici-nitroimidazoli.png" },
  { id: "antibiotici-oxazolidinoni", name: "Oxazolidinoni", rarity: "leggendaria", image: "/cards/antibiotici-oxazolidinoni.png" },
];

export const RARITY_PILL_VALUES: Record<CardRarity, number> = {
  comune: 10,
  rara: 20,
  epica: 50,
  leggendaria: 120,
};
