import type { QuizQuestion } from "@/features/cards/quiz/quizBank";
import { QUIZ_BANK_PHARMACOLOGY } from "@/features/cards/quiz/quizBankPharmacology";
import { QUIZ_BANK_ANATOMY } from "@/features/cards/quiz/quizBankAnatomy";
import { QUIZ_BANK_PHYSIOLOGY } from "@/features/cards/quiz/quizBankPhysiology";
import { QUIZ_BANK_PHARMACOLOGY_EXTRA } from "@/features/cards/quiz/quizBankPharmacologyExtra";
import { QUIZ_BANK_ANATOMY_EXTRA } from "@/features/cards/quiz/quizBankAnatomyExtra";
import { QUIZ_BANK_PHYSIOLOGY_EXTRA } from "@/features/cards/quiz/quizBankPhysiologyExtra";

// University-focused question bank (theory-heavy, less clinical).
// Total: 1950 (Farmacologia 650 • Anatomia 650 • Fisiologia 650)
//
// NOTE: split into 3 modules to avoid TypeScript "union type too complex" on a single huge literal.
export const QUIZ_BANK_UNIVERSITY: QuizQuestion[] = [
  ...QUIZ_BANK_PHARMACOLOGY,
  ...QUIZ_BANK_ANATOMY,
  ...QUIZ_BANK_PHYSIOLOGY,
  ...QUIZ_BANK_PHARMACOLOGY_EXTRA,
  ...QUIZ_BANK_ANATOMY_EXTRA,
  ...QUIZ_BANK_PHYSIOLOGY_EXTRA,
];
