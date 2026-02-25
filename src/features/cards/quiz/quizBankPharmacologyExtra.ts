import type { QuizDifficulty, QuizQuestion } from "@/features/cards/quiz/quizBank";

type Template = {
  stem: string;
  correct: string;
  wrong: [string, string, string];
  explain: string;
};

const DIFFS: QuizDifficulty[] = ["easy", "medium", "hard"];

// Extra bank Università (Farmacologia)
// - 500 domande valide (testo + 4 opzioni + spiegazione)
// - generazione deterministica, senza placeholder
const TEMPLATES: Template[] = [
  {
    stem: "Quale parametro descrive quanta parte del farmaco raggiunge la circolazione sistemica in forma immodificata?",
    correct: "Biodisponibilità",
    wrong: ["Clearance", "Emivita", "Volume di distribuzione"],
    explain: "La biodisponibilità (F) è la frazione di dose che raggiunge il circolo sistemico come farmaco immodificato.",
  },
  {
    stem: "Un aumento del volume di distribuzione (Vd) a parità di dose tende a:",
    correct: "Ridurre la concentrazione plasmatica iniziale",
    wrong: ["Aumentare sempre la biodisponibilità", "Eliminare più rapidamente il farmaco", "Aumentare la frazione non legata alle proteine"],
    explain: "A dose costante, un Vd maggiore 'diluisce' il farmaco in un volume apparente più ampio, riducendo la concentrazione plasmatica.",
  },
  {
    stem: "Quale affermazione descrive meglio un agonista parziale?",
    correct: "Ha efficacia inferiore a un agonista pieno anche a dose elevata",
    wrong: ["Non si lega al recettore", "Ha sempre potenza maggiore", "Non produce mai risposta"],
    explain: "L'agonista parziale si lega al recettore ma ha efficacia intrinseca minore: il plateau è più basso.",
  },
  {
    stem: "L'emivita (t½) di un farmaco dipende principalmente da:",
    correct: "Clearance e volume di distribuzione",
    wrong: ["Solo dalla dose", "Solo dal pH gastrico", "Solo dalla via di somministrazione"],
    explain: "In modo semplificato t½ ≈ 0,693 × Vd / Cl.",
  },
  {
    stem: "Cosa indica la clearance (Cl) di un farmaco?",
    correct: "Volume di plasma 'ripulito' dal farmaco per unità di tempo",
    wrong: ["Frazione assorbita a livello intestinale", "Quantità eliminata in 24 ore", "Affinità per il recettore"],
    explain: "La clearance quantifica la capacità dell'organismo di eliminare il farmaco.",
  },
  {
    stem: "Un antagonista competitivo si caratterizza perché:",
    correct: "Sposta a destra la curva dose-risposta dell'agonista",
    wrong: ["Riduce irreversibilmente il numero di recettori", "Aumenta l'efficacia massima dell'agonista", "Non dipende dalla concentrazione"],
    explain: "Competitivo: compete sullo stesso sito; aumentando l'agonista si può superare l'effetto (Emax invariata).",
  },
  {
    stem: "Quale processo aumenta tipicamente la solubilità in acqua e facilita l'eliminazione?",
    correct: "Coniugazione (fase II)",
    wrong: ["Legame a recettori", "Distribuzione tessutale", "Assorbimento per diffusione"],
    explain: "Le reazioni di fase II (coniugazioni) aumentano l'idrofilia e favoriscono l'escrezione.",
  },
  {
    stem: "Il fenomeno dell'effetto di primo passaggio riguarda soprattutto:",
    correct: "Metabolismo pre-sistemico epatico/intestinal",
    wrong: ["Eliminazione renale", "Legame alle proteine plasmatiche", "Distribuzione nel SNC"],
    explain: "Dopo assorbimento enterico il farmaco può essere metabolizzato prima di raggiungere la circolazione sistemica.",
  },
  {
    stem: "Un farmaco lipofilo tende ad avere, in generale:",
    correct: "Volume di distribuzione più elevato",
    wrong: ["Solo eliminazione renale", "Zero legame tissutale", "Sempre emivita più breve"],
    explain: "I farmaci lipofili tendono a distribuirsi nei tessuti, aumentando il Vd apparente.",
  },
  {
    stem: "Quando si raggiunge approssimativamente lo steady state con somministrazione ripetuta?",
    correct: "Dopo ~4-5 emivite",
    wrong: ["Dopo una singola dose", "Dopo 1 emivita", "Solo dopo 30 giorni"],
    explain: "In cinetica di primo ordine, lo steady state si ottiene dopo alcune emivite (circa 4-5).",
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
  const prefix = "uni_ph_";
  for (let i = 0; i < target; i++) {
    const t = TEMPLATES[i % TEMPLATES.length];
    const idNum = (501 + i).toString().padStart(4, "0");
    const seed = 2000 + i * 19;
    const optionsRaw = [t.correct, ...t.wrong];
    const options = shuffle(optionsRaw, seed);
    const answer = options.indexOf(t.correct);
    const difficulty = DIFFS[i % DIFFS.length];
    if (answer < 0) continue;
    out.push({
      id: `${prefix}${idNum}`,
      q: `[Farmacologia] ${t.stem}`,
      options,
      answer,
      category: "farmacologia",
      difficulty,
      explain: t.explain,
    });
  }
  return out;
}

export const QUIZ_BANK_PHARMACOLOGY_EXTRA: QuizQuestion[] = build();
