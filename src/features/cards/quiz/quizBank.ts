export type QuizCategory = "antibiotici" | "farmaci" | "procedure" | "emergenza";

export type QuizQuestion = {
  id: string;
  q: string;
  options: string[];
  answer: number;
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
    q: "Le tetracicline possono dare come effetto avverso tipico:",
    options: ["Fotosensibilità", "Torsione di punta", "Iperpotassiemia", "Crisi ipertensiva"],
    answer: 0,
    category: "farmaci",
  },
  {
    id: "prc_1",
    q: "Prima di un prelievo arterioso, la cosa più importante da verificare è:",
    options: ["Gruppo sanguigno", "Allergia a iodio", "Adeguata perfusione collaterale (Allen test se indicato)", "Temperatura corporea"],
    answer: 2,
    category: "procedure",
  },
  {
    id: "emg_1",
    q: "In caso di PEA (attività elettrica senza polso), la priorità è:",
    options: ["Defibrillare", "RCP + cause reversibili (Hs & Ts)", "Somministrare solo ossigeno", "Attendere il medico"],
    answer: 1,
    category: "emergenza",
  },
];
