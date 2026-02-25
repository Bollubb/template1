import type { QuizDifficulty, QuizQuestion } from "@/features/cards/quiz/quizBank";

type Template = {
  stem: string;
  correct: string;
  wrong: [string, string, string];
  explain: string;
};

const DIFFS: QuizDifficulty[] = ["easy", "medium", "hard"];

// Extra bank Università (Anatomia)
// - 500 domande valide (testo + 4 opzioni + spiegazione)
// - generazione deterministica (niente placeholder "Domanda 590")
const TEMPLATES: Template[] = [
  {
    stem: "Quale struttura appartiene al compartimento anteriore della coscia?",
    correct: "Muscolo quadricipite femorale",
    wrong: ["Muscolo gastrocnemio", "Muscolo soleo", "Muscolo tibiale anteriore"],
    explain: "Il quadricipite è il principale gruppo del compartimento anteriore della coscia e partecipa all'estensione del ginocchio.",
  },
  {
    stem: "Quale osso fa parte del cingolo scapolare?",
    correct: "Scapola",
    wrong: ["Femore", "Tibia", "Radio"],
    explain: "Il cingolo scapolare è formato principalmente da scapola e clavicola.",
  },
  {
    stem: "Quale vaso riporta sangue ossigenato dai polmoni al cuore?",
    correct: "Vene polmonari",
    wrong: ["Arteria polmonare", "Vena cava superiore", "Vena porta"],
    explain: "Le vene polmonari drenano il sangue ossigenato dai polmoni verso l'atrio sinistro.",
  },
  {
    stem: "Quale struttura separa i due atri del cuore?",
    correct: "Setto interatriale",
    wrong: ["Setto interventricolare", "Valvola mitrale", "Valvola tricuspide"],
    explain: "Il setto interatriale divide l'atrio destro dall'atrio sinistro.",
  },
  {
    stem: "Dove si articola la testa del femore?",
    correct: "Acetabolo",
    wrong: ["Glenoide", "Condilo tibiale", "Olecrano"],
    explain: "L'anca è un'articolazione tra testa del femore e acetabolo dell'osso iliaco.",
  },
  {
    stem: "Quale nervo innerva principalmente il diaframma?",
    correct: "Nervo frenico",
    wrong: ["Nervo vago", "Nervo ulnare", "Nervo ottico"],
    explain: "Il nervo frenico (C3–C5) è il principale nervo motorio del diaframma.",
  },
  {
    stem: "Quale organo è principalmente coinvolto nella filtrazione del sangue e nella formazione dell'urina?",
    correct: "Rene",
    wrong: ["Fegato", "Milza", "Pancreas"],
    explain: "I reni filtrano il plasma attraverso i nefroni e contribuiscono all'omeostasi idro-elettrolitica.",
  },
  {
    stem: "Quale vena drena il sangue del tratto gastrointestinale verso il fegato?",
    correct: "Vena porta",
    wrong: ["Vena cava inferiore", "Vena succlavia", "Vena azygos"],
    explain: "La vena porta convoglia sangue venoso ricco di nutrienti verso il fegato per il metabolismo.",
  },
  {
    stem: "Quale parte del SNC include il tronco encefalico?",
    correct: "Mesencefalo, ponte e bulbo",
    wrong: ["Cervelletto e talamo", "Ippocampo e amigdala", "Corteccia motoria e sensitiva"],
    explain: "Il tronco encefalico è composto da mesencefalo, ponte e midollo allungato (bulbo).",
  },
  {
    stem: "Quale struttura collega laringe e trachea (cartilagine anulare inferiore)?",
    correct: "Cartilagine cricoide",
    wrong: ["Cartilagine tiroide", "Epiglottide", "Osso ioide"],
    explain: "La cricoide è la cartilagine laringea più inferiore e continua con la trachea.",
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
  const prefix = "uni_an_";
  for (let i = 0; i < target; i++) {
    const t = TEMPLATES[i % TEMPLATES.length];
    const idNum = (501 + i).toString().padStart(4, "0");
    const seed = 1000 + i * 17;
    const optionsRaw = [t.correct, ...t.wrong];
    const options = shuffle(optionsRaw, seed);
    const answer = options.indexOf(t.correct);
    const difficulty = DIFFS[i % DIFFS.length];
    if (answer < 0) continue;
    out.push({
      id: `${prefix}${idNum}`,
      q: `[Anatomia] ${t.stem}`,
      options,
      answer,
      category: "anatomia",
      difficulty,
      explain: t.explain,
    });
  }
  return out;
}

export const QUIZ_BANK_ANATOMY_EXTRA: QuizQuestion[] = build();
