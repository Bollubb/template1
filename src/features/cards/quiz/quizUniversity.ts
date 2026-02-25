import type { QuizQuestion } from "./quizBank";

export type UniPresetId = "farmacologia" | "anatomia" | "fisiologia";

export const UNI_PRESETS: Array<{
  id: UniPresetId;
  label: string;
  n: number;
  min: number;
  // categories expected in QuizQuestion.category
  categories: string[];
}> = [
  { id: "farmacologia", label: "Farmacologia", n: 30, min: 25, categories: ["farmaci"] },
  // These become active when the real university bank is imported.
  { id: "anatomia", label: "Anatomia", n: 30, min: 25, categories: ["anatomia"] },
  { id: "fisiologia", label: "Fisiologia", n: 30, min: 25, categories: ["fisiologia"] },
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
