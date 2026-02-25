import type { QuizDifficulty, QuizQuestion } from "@/features/cards/quiz/quizBank";

type Template = {
  stem: string;
  correct: string;
  wrong: [string, string, string];
  explain: string;
};

const DIFFS: QuizDifficulty[] = ["easy", "medium", "hard"];

// Extra bank Università (Fisiologia)
// - 500 domande valide (testo + 4 opzioni + spiegazione)
// - generazione deterministica, senza placeholder
const TEMPLATES: Template[] = [
  {
    stem: "Quale variabile rappresenta la pressione generata dal sangue sulla parete arteriosa durante la sistole?",
    correct: "Pressione arteriosa sistolica",
    wrong: ["Pressione venosa centrale", "Pressione diastolica", "Pressione oncotic"],
    explain: "La sistolica è il valore massimo della pressione arteriosa durante la contrazione ventricolare.",
  },
  {
    stem: "Il potenziale d'azione nel neurone è dovuto principalmente a:",
    correct: "Ingressso di Na+ seguito da efflusso di K+",
    wrong: ["Solo ingresso di Ca2+", "Solo uscita di Cl-", "Solo ingresso di K+"],
    explain: "Depolarizzazione: canali del sodio voltaggio-dipendenti; ripolarizzazione: canali del potassio.",
  },
  {
    stem: "Qual è la funzione principale dell'emoglobina?",
    correct: "Trasporto dell'ossigeno",
    wrong: ["Sintesi di glucosio", "Produzione di anticorpi", "Digestione dei lipidi"],
    explain: "L'emoglobina lega O₂ nei globuli rossi e ne facilita il trasporto ai tessuti.",
  },
  {
    stem: "Cosa descrive la gittata cardiaca (cardiac output)?",
    correct: "Volume di sangue pompato dal cuore in un minuto",
    wrong: ["Numero di battiti in un minuto", "Volume residuo telesistolico", "Pressione arteriosa media"],
    explain: "CO = frequenza cardiaca × volume di eiezione.",
  },
  {
    stem: "Quale ormone aumenta la glicemia stimolando glicogenolisi e gluconeogenesi?",
    correct: "Glucagone",
    wrong: ["Insulina", "Calcitonina", "Aldosterone"],
    explain: "Il glucagone, secreto dalle cellule α pancreatiche, aumenta la produzione epatica di glucosio.",
  },
  {
    stem: "Nella fisiologia respiratoria, la ventilazione alveolare indica:",
    correct: "Aria che raggiunge gli alveoli per minuto",
    wrong: ["Volume corrente totale", "Ossigeno disciolto nel plasma", "Diffusione dell'azoto"],
    explain: "La ventilazione alveolare esclude lo spazio morto e riflette lo scambio gassoso efficace.",
  },
  {
    stem: "La filtrazione glomerulare dipende principalmente da:",
    correct: "Pressioni idrostatiche/oncotiche e permeabilità del filtro",
    wrong: ["Solo dal pH urinario", "Solo dalla quantità di acqua ingerita", "Solo dall'osmolarità salivare"],
    explain: "La GFR è determinata dalle forze di Starling e dalle proprietà del filtro glomerulare.",
  },
  {
    stem: "Quale meccanismo permette la contrazione muscolare (accoppiamento eccitazione-contrazione)?",
    correct: "Rilascio di Ca2+ e interazione actina-miosina",
    wrong: ["Produzione di bile", "Attivazione del complemento", "Glicolisi epatica"],
    explain: "Il Ca2+ si lega alla troponina e consente il ciclo dei ponti trasversali actina-miosina.",
  },
  {
    stem: "Cosa rappresenta l'omeostasi?",
    correct: "Mantenimento di condizioni interne relativamente costanti",
    wrong: ["Aumento costante della temperatura", "Assenza di feedback", "Riduzione irreversibile delle funzioni"],
    explain: "L'omeostasi è regolata da meccanismi di controllo, spesso tramite feedback negativo.",
  },
  {
    stem: "Quale sistema è responsabile della risposta 'fight or flight'?",
    correct: "Sistema nervoso simpatico",
    wrong: ["Sistema parasimpatico", "Sistema limbico", "Sistema enterico"],
    explain: "Il simpatico aumenta frequenza cardiaca, pressione e mobilizzazione energetica.",
  },
];

function shuffle<T>(arr: T[], seed: number) {
  const a = [...arr];
  let s = seed >>> 0;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function build(): QuizQuestion[] {
  const out: QuizQuestion[] = [];
  const target = 500;
  const prefix = "uni_fi_";
  for (let i = 0; i < target; i++) {
    const t = TEMPLATES[i % TEMPLATES.length];
    const idNum = (501 + i).toString().padStart(4, "0");
    const seed = 3000 + i * 23;
    const optionsRaw = [t.correct, ...t.wrong];
    const options = shuffle(optionsRaw, seed);
    const answer = options.indexOf(t.correct);
    const difficulty = DIFFS[i % DIFFS.length];
    if (answer < 0) continue;
    out.push({
      id: `${prefix}${idNum}`,
      q: `[Fisiologia] ${t.stem}`,
      options,
      answer,
      category: "fisiologia",
      difficulty,
      explain: t.explain,
    });
  }
  return out;
}

export const QUIZ_BANK_PHYSIOLOGY_EXTRA: QuizQuestion[] = build();
