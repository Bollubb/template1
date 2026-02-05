export type QuizDifficulty = "facile" | "medio";

export type QuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
  answerIndex: number;
  difficulty: QuizDifficulty;
  tag?: string;
};

/**
 * Mini banca quiz iniziale (facile da espandere).
 * Nota: niente contenuti clinici "sensibili" / prescrizioni; è didattica generale.
 */
export const QUIZ_BANK: QuizQuestion[] = [
  {
    id: "q_ecg_rate",
    prompt: "ECG: a cosa serve principalmente la derivazione II?",
    options: ["Valutare P e ritmo", "Valutare ischemia laterale", "Valutare QT lungo", "Valutare solo ventricoli"],
    answerIndex: 0,
    difficulty: "facile",
    tag: "ECG",
  },
  {
    id: "q_spo2",
    prompt: "SpO2 bassa improvvisa: qual è il controllo più rapido prima di allertare?",
    options: ["Sonda ben posizionata e perfusione", "Eseguire TC urgente", "Somministrare antibiotico", "Fare emocolture"],
    answerIndex: 0,
    difficulty: "facile",
    tag: "Monitoraggio",
  },
  {
    id: "q_cvc",
    prompt: "CVC: quale azione riduce il rischio di infezione del sito?",
    options: ["Igiene mani + antisepsi cutanea", "Cambiare solo il tappo", "Aumentare la pressione del lavaggio", "Tenere medicazione umida"],
    answerIndex: 0,
    difficulty: "facile",
    tag: "Accessi venosi",
  },
  {
    id: "q_ppe",
    prompt: "Qual è lo scopo principale dei DPI (PPE)?",
    options: ["Ridurre esposizione a rischi biologici", "Aumentare velocità di lavoro", "Sostituire l'igiene mani", "Evitare la documentazione"],
    answerIndex: 0,
    difficulty: "facile",
    tag: "Sicurezza",
  },
  {
    id: "q_iv",
    prompt: "Accesso venoso difficile: prima scelta ragionevole in reparto (se disponibile)?",
    options: ["Valutazione + device/ultrasuoni se indicato", "Pungere ripetutamente a caso", "Solo via centrale sempre", "Non fare nulla"],
    answerIndex: 0,
    difficulty: "facile",
    tag: "Accessi venosi",
  },
  {
    id: "q_ika",
    prompt: "Prevenzione ICA: qual è la misura più efficace tra queste?",
    options: ["Igiene delle mani", "Guanti sempre anche fuori procedure", "Pulire il telefono una volta al mese", "Aprire finestre spesso"],
    answerIndex: 0,
    difficulty: "facile",
    tag: "ICA",
  },
  {
    id: "q_insulin",
    prompt: "Ipoglicemia: quale segno è tipico?",
    options: ["Sudorazione e tremori", "Cute secca e calda", "Bradipnea", "Midriasi fissa"],
    answerIndex: 0,
    difficulty: "facile",
    tag: "Metabolismo",
  },
  {
    id: "q_pea",
    prompt: "PEA: cosa significa?",
    options: ["Attività elettrica senza polso", "Solo asistolia", "Solo fibrillazione ventricolare", "Tachicardia sopraventricolare"],
    answerIndex: 0,
    difficulty: "facile",
    tag: "Emergenze",
  },
  {
    id: "q_abg",
    prompt: "Emogas: il parametro che riflette l'acidità del sangue è…",
    options: ["pH", "PaO2", "SaO2", "Lattato"],
    answerIndex: 0,
    difficulty: "facile",
    tag: "Emogas",
  },
  {
    id: "q_electrolytes",
    prompt: "Elettroliti critici: quale può causare aritmie gravi se molto basso?",
    options: ["Potassio", "Calcio", "Sodio", "Cloro"],
    answerIndex: 0,
    difficulty: "facile",
    tag: "Elettroliti",
  },
  // Medio
  {
    id: "q_cvp",
    prompt: "PVC/CVP: un valore isolato va interpretato soprattutto in base a…",
    options: ["Trend e quadro clinico", "Ora del giorno", "Colore del rubinetto", "Età del catetere"],
    answerIndex: 0,
    difficulty: "medio",
    tag: "Emodinamica",
  },
  {
    id: "q_abx",
    prompt: "Antibiotici: perché completare il ciclo prescritto è importante?",
    options: ["Riduce rischio recidiva e resistenze", "Perché è obbligatorio per legge", "Per aumentare la febbre", "Non è importante"],
    answerIndex: 0,
    difficulty: "medio",
    tag: "Farmaci",
  },
];