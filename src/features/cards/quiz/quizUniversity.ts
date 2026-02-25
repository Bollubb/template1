import type { QuizQuestion } from "./quizBank";

export type UniPresetId = "farmacologia" | "anatomia" | "fisiologia";
export type UniSizeId = "mini" | "medio" | "esame";

export const UNI_SIZES: Array<{ id: UniSizeId; label: string; n: number; min: number }> = [
  { id: "mini", label: "Mini test", n: 10, min: 8 },
  { id: "medio", label: "Medio", n: 30, min: 25 },
  { id: "esame", label: "Esame", n: 60, min: 50 },
];

export const UNI_PRESETS: Array<{
  id: UniPresetId;
  label: string;
  // categories expected in QuizQuestion.category
  categories: string[];
}> = [
  { id: "farmacologia", label: "Farmacologia", categories: ["farmacologia"] },
  { id: "anatomia", label: "Anatomia", categories: ["anatomia"] },
  { id: "fisiologia", label: "Fisiologia", categories: ["fisiologia"] },
];

export function getUniPool(bank: QuizQuestion[], presetId: UniPresetId): QuizQuestion[] {
  const p = UNI_PRESETS.find((x) => x.id === presetId);
  if (!p) return [];
  const cats = new Set(p.categories);
  return bank.filter((q) => cats.has(String((q as any).category ?? "")));
}

export function getUniAvailableCount(bank: QuizQuestion[], presetId: UniPresetId): number {
  return getUniPool(bank, presetId).length;
}

export function getUniSize(sizeId: UniSizeId) {
  return UNI_SIZES.find((s) => s.id === sizeId) ?? UNI_SIZES[1];
}
