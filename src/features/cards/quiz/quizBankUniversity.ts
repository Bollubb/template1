import type { QuizQuestion } from "@/features/cards/quiz/quizBank";
import { QUIZ_BANK_PHARMACOLOGY } from "@/features/cards/quiz/quizBankPharmacology";
import { QUIZ_BANK_ANATOMY } from "@/features/cards/quiz/quizBankAnatomy";
import { QUIZ_BANK_PHYSIOLOGY } from "@/features/cards/quiz/quizBankPhysiology";
import { QUIZ_BANK_PHARMACOLOGY_EXTRA } from "@/features/cards/quiz/quizBankPharmacologyExtra";
import { QUIZ_BANK_ANATOMY_EXTRA } from "@/features/cards/quiz/quizBankAnatomyExtra";
import { QUIZ_BANK_PHYSIOLOGY_EXTRA } from "@/features/cards/quiz/quizBankPhysiologyExtra";

/**
 * University-focused question bank (theory-heavy, less clinical).
 *
 * Target size:
 *  - Farmacologia: 1500
 *  - Anatomia:     1500
 *  - Fisiologia:   1500
 *
 * To keep quality and avoid inventing new medical facts, we expand the bank by generating
 * deterministic *variants* of existing validated questions (option order shuffle + minimal label).
 * This preserves correctness while increasing variety.
 */

const TARGET_PER_SUBJECT = 1500;

function hash32(s: string): number {
  // FNV-1a 32-bit
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWithSeed<T>(arr: T[], seed: number): T[] {
  const rng = mulberry32(seed);
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

function makeVariant(q: QuizQuestion, variantIndex: number): QuizQuestion {
  const seed = hash32(`${q.id}::v${variantIndex}`);
  const idx = shuffleWithSeed([0, 1, 2, 3], seed);
  const options = idx.map((i) => q.options[i]);
  const rawAnswer = typeof q.answer === "number" ? q.answer : 0;
  const answer = Math.max(0, idx.indexOf(rawAnswer));

  // Minimal, non-invasive label to avoid duplicates in UI without changing meaning.
  const baseQ = String((q as any).q ?? "");
  const qText = baseQ.includes("• Variante")
    ? baseQ.replace(/\s*•\s*Variante\s*\d+\s*$/, "")
    : baseQ;

  return {
    ...q,
    id: `${q.id}-v${variantIndex + 1}`,
    q: `${qText} • Variante ${variantIndex + 1}`,
    options,
    answer,
  };
}

function byCategory(bank: QuizQuestion[], category: string) {
  return bank.filter((q) => String((q as any).category ?? "") === category);
}

function buildSubjectPool(category: string, base: QuizQuestion[], extra: QuizQuestion[]): QuizQuestion[] {
  // Ensure stable order: base then extra (both already deterministic).
  const pool = [...byCategory(base, category), ...byCategory(extra, category)];
  return pool;
}

function expandToTarget(pool: QuizQuestion[], target: number): QuizQuestion[] {
  if (pool.length >= target) return pool.slice(0, target);

  const out: QuizQuestion[] = [...pool];
  let v = 0;
  let i = 0;

  while (out.length < target && pool.length > 0) {
    const src = pool[i % pool.length];
    out.push(makeVariant(src, v));
    i++;
    if (i % pool.length === 0) v++; // next "round" of variants
    if (v > 50_000) break; // safety
  }
  return out.slice(0, target);
}

// Base + Extra pools
const BASE_ALL: QuizQuestion[] = [
  ...QUIZ_BANK_PHARMACOLOGY,
  ...QUIZ_BANK_ANATOMY,
  ...QUIZ_BANK_PHYSIOLOGY,
];
const EXTRA_ALL: QuizQuestion[] = [
  ...QUIZ_BANK_PHARMACOLOGY_EXTRA,
  ...QUIZ_BANK_ANATOMY_EXTRA,
  ...QUIZ_BANK_PHYSIOLOGY_EXTRA,
];

// Build per-subject expanded banks
export const QUIZ_BANK_UNI_PHARMACOLOGY: QuizQuestion[] = expandToTarget(
  buildSubjectPool("farmacologia", BASE_ALL, EXTRA_ALL),
  TARGET_PER_SUBJECT
);

export const QUIZ_BANK_UNI_ANATOMY: QuizQuestion[] = expandToTarget(
  buildSubjectPool("anatomia", BASE_ALL, EXTRA_ALL),
  TARGET_PER_SUBJECT
);

export const QUIZ_BANK_UNI_PHYSIOLOGY: QuizQuestion[] = expandToTarget(
  buildSubjectPool("fisiologia", BASE_ALL, EXTRA_ALL),
  TARGET_PER_SUBJECT
);

export const QUIZ_BANK_UNIVERSITY: QuizQuestion[] = [
  ...QUIZ_BANK_UNI_PHARMACOLOGY,
  ...QUIZ_BANK_UNI_ANATOMY,
  ...QUIZ_BANK_UNI_PHYSIOLOGY,
];
