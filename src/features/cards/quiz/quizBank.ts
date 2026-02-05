export type QuizCategory =
  | "antibiotici"
  | "farmaci"
  | "procedure"
  | "emergenza"
  | "accessi"
  | "generale";

export type QuizQuestion = {
  id: string;
  q: string;
  options: string[];
  answer: number; // index
  category: QuizCategory;
};

export const QUIZ_BANK: QuizQuestion[] = [
  {
    id: "abx_1",
    q: "Qual è il principale meccanismo dei beta‑lattamici?",
    options: ["Inibizione sintesi proteica", "Inibizione parete cellulare", "Inibizione DNA/RNA", "Effetto antivirale"],
    answer: 1,
    category: "antibiotici",
  },
  {
    id: "abx_2",
    q: "Quale classe è tipicamente associata a nefrotossicità e ototossicità?",
    options: ["Macrolidi", "Aminoglicosidi", "Penicilline", "Tetracicline"],
    answer: 1,
    category: "farmaci",
  },
  {
    id: "abx_3",
    q: "I glicopeptidi (es. vancomicina) coprono soprattutto:",
    options: ["Gram negativi", "Gram positivi", "Virus", "Funghi"],
    answer: 1,
    category: "antibiotici",
  },
  {
    id: "abx_4",
    q: "Le tetracicline possono dare come effetto avverso più tipico:",
    options: ["Fotosensibilità", "Torsioni di punta", "Iperpotassiemia", "Crisi ipertensiva"],
    answer: 0,
    category: "farmaci",
  },
  {
    id: "abx_5",
    q: "Metronidazolo è particolarmente utile contro:",
    options: ["Anaerobi", "Virus", "Micobatteri", "Candida"],
    answer: 0,
    category: "antibiotici",
  },
  {
    id: "abx_6",
    q: "Linezolid appartiene alla classe:",
    options: ["Glicopeptidi", "Oxazolidinoni", "Carbapenemi", "Sulfonamidi"],
    answer: 1,
    category: "antibiotici",
  },
  {
    id: "gen_1",
    q: "Una SpO₂ bassa su paziente stabile: primo controllo rapido consigliato?",
    options: ["Somministrare subito O₂ massimo", "Ricontrollare sensore/posizionamento", "Eseguire subito emogas", "Chiamare rianimatore"],
    answer: 1,
    category: "generale",
  },
];
