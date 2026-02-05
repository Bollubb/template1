export type QuizQuestion = {
  id: string;
  q: string;
  options: string[];
  answer: number;
  tag?: string;
};

export const QUIZ_BANK: QuizQuestion[] = [
  {
    id: "abx_1",
    q: "Qual è il principale meccanismo dei beta‑lattamici?",
    options: ["Inibizione sintesi proteica", "Inibizione parete cellulare", "Inibizione DNA/RNA", "Effetto antivirale"],
    answer: 1,
    tag: "antibiotici",
  },
  {
    id: "abx_2",
    q: "Quale classe è tipicamente associata a nefrotossicità e ototossicità?",
    options: ["Macrolidi", "Aminoglicosidi", "Penicilline", "Tetracicline"],
    answer: 1,
    tag: "farmaci",
  },
  {
    id: "abx_3",
    q: "I glicopeptidi (es. vancomicina) coprono soprattutto:",
    options: ["Gram negativi", "Gram positivi", "Virus", "Funghi"],
    answer: 1,
    tag: "antibiotici",
  },
  {
    id: "abx_4",
    q: "Le tetracicline possono dare come effetto avverso:",
    options: ["Fotosensibilità", "Torsione di punta", "Iperpotassiemia", "Crisi ipertensiva"],
    answer: 0,
    tag: "farmaci",
  },
  {
    id: "abx_5",
    q: "Il metronidazolo è particolarmente utile contro:",
    options: ["Anaerobi", "Virus", "Micobatteri", "Parassiti ematici"],
    answer: 0,
    tag: "antibiotici",
  },
  {
    id: "abx_6",
    q: "Linezolid appartiene alla classe:",
    options: ["Glicopeptidi", "Oxazolidinoni", "Carbapenemi", "Sulfonamidi"],
    answer: 1,
    tag: "antibiotici",
  },
];
