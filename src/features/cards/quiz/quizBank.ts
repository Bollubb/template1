export type QuizQuestion = {
  id: string;
  q: string;
  options: string[];
  answer: number;
};

export const QUIZ_BANK: QuizQuestion[] = [
  {
    id: "q1",
    q: "Qual è il principale effetto dei beta-lattamici?",
    options: ["Inibizione sintesi proteica", "Inibizione parete cellulare", "Inibizione DNA", "Effetto antivirale"],
    answer: 1,
  },
  {
    id: "q2",
    q: "Quale antibiotico è tipicamente nefrotossico?",
    options: ["Macrolidi", "Aminoglicosidi", "Penicilline", "Tetracicline"],
    answer: 1,
  },
  {
    id: "q3",
    q: "I glicopeptidi agiscono principalmente contro:",
    options: ["Gram negativi", "Virus", "Gram positivi", "Funghi"],
    answer: 2,
  },
];
