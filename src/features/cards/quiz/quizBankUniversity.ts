import type { QuizQuestion } from "@/features/cards/quiz/quizBank";
import { QUIZ_BANK_PHARMACOLOGY } from "@/features/cards/quiz/quizBankPharmacology";
import { QUIZ_BANK_ANATOMY } from "@/features/cards/quiz/quizBankAnatomy";
import { QUIZ_BANK_PHYSIOLOGY } from "@/features/cards/quiz/quizBankPhysiology";

// University-focused question bank (theory-heavy, less clinical).
// Total: 1500 (Farmacologia 500 • Anatomia 500 • Fisiologia 500)
//
// NOTE: split into 3 modules to avoid TypeScript "union type too complex" on a single huge literal.
export const QUIZ_BANK_UNIVERSITY: QuizQuestion[] = [
  ...QUIZ_BANK_PHARMACOLOGY,
  ...QUIZ_BANK_ANATOMY,
  ...QUIZ_BANK_PHYSIOLOGY,
];
