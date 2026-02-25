import type { QuizQuestion } from "@/features/cards/quiz/quizBank";
// Extra university bank: domande generate (non placeholder). 60 temi x 9 varianti -> 540 (slice 500)
const FACTS: Array<{ topic: string; correct: string; wrong: [string,string,string] }> = [
  { topic: "Polmone destro", correct: "Ha 3 lobi", wrong: ["Ha 2 lobi", "È privo di lobi", "Ha 4 lobi"] },
  { topic: "Polmone sinistro", correct: "Ha 2 lobi", wrong: ["Ha 3 lobi", "Ha 4 lobi", "Non ha scissure"] },
  { topic: "Cuore", correct: "È situato nel mediastino", wrong: ["È nel retroperitoneo", "È nella cavità addominale", "È nel canale vertebrale"] },
  { topic: "Valvola mitrale", correct: "È tra atrio sinistro e ventricolo sinistro", wrong: ["Tra atrio destro e ventricolo destro", "Tra ventricolo sinistro e aorta", "Tra ventricolo destro e arteria polmonare"] },
  { topic: "Valvola tricuspide", correct: "È tra atrio destro e ventricolo destro", wrong: ["Tra atrio sinistro e ventricolo sinistro", "Tra ventricolo sinistro e aorta", "Tra ventricolo destro e aorta"] },
  { topic: "Aorta", correct: "Origina dal ventricolo sinistro", wrong: ["Origina dal ventricolo destro", "Origina dall’atrio sinistro", "Origina dall’atrio destro"] },
  { topic: "Arteria polmonare", correct: "Origina dal ventricolo destro", wrong: ["Origina dal ventricolo sinistro", "Origina dall’atrio destro", "Origina dall’aorta discendente"] },
  { topic: "Vena cava superiore", correct: "Sbocca nell’atrio destro", wrong: ["Sbocca nell’atrio sinistro", "Sbocca nel ventricolo destro", "Sbocca nel ventricolo sinistro"] },
  { topic: "Rene", correct: "È un organo retroperitoneale", wrong: ["È intraperitoneale", "È nel mediastino", "È nel cavo cranico"] },
  { topic: "Nefrone", correct: "È l’unità funzionale del rene", wrong: ["È l’unità funzionale del fegato", "È una struttura del miocardio", "È una parte del polmone"] },
  { topic: "Fegato", correct: "È localizzato prevalentemente nell’ipocondrio destro", wrong: ["Nell’ipocondrio sinistro", "Nel bacino", "Nel mediastino"] },
  { topic: "Pancreas", correct: "Ha una porzione endocrina (isole) e una esocrina", wrong: ["È solo endocrino", "È solo esocrino", "È un osso"] },
  { topic: "Stomaco", correct: "È connesso al duodeno tramite il piloro", wrong: ["Tramite la valvola ileocecale", "Tramite il cardias", "Tramite il colon discendente"] },
  { topic: "Esofago", correct: "Attraversa il diaframma tramite lo iato esofageo", wrong: ["Tramite lo iato aortico", "Tramite il forame ovale", "Tramite il canale inguinale"] },
  { topic: "Diaframma", correct: "È il principale muscolo della respirazione", wrong: ["È un legamento", "È un osso", "È un vaso"] },
  { topic: "Trachea", correct: "Si biforca nei bronchi principali", wrong: ["Si biforca nei ureteri", "Si biforca nelle tube di Falloppio", "Si biforca nel colon"] },
  { topic: "Laringe", correct: "Contiene le corde vocali", wrong: ["Contiene i glomeruli", "Contiene gli alveoli", "Contiene i villi intestinali"] },
  { topic: "Cervello", correct: "È parte del sistema nervoso centrale", wrong: ["È parte del sistema nervoso periferico", "È un organo del sistema linfatico", "È un muscolo"] },
  { topic: "Midollo spinale", correct: "È protetto dalle vertebre", wrong: ["È protetto dalle costole", "È protetto dalla scapola", "È protetto dalla mandibola"] },
  { topic: "Nervo vago", correct: "È il X nervo cranico", wrong: ["È il V nervo cranico", "È il I nervo cranico", "È il XII nervo cranico"] },
  { topic: "Nervo ottico", correct: "È il II nervo cranico", wrong: ["È il III nervo cranico", "È il VII nervo cranico", "È il X nervo cranico"] },
  { topic: "Nervo trigemino", correct: "È il V nervo cranico", wrong: ["È il II nervo cranico", "È il IX nervo cranico", "È il XII nervo cranico"] },
  { topic: "Nervo facciale", correct: "È il VII nervo cranico", wrong: ["È il VI nervo cranico", "È il V nervo cranico", "È il XI nervo cranico"] },
  { topic: "Ossa del carpo", correct: "Sono 8", wrong: ["Sono 6", "Sono 10", "Sono 12"] },
  { topic: "Omero", correct: "È l’osso del braccio", wrong: ["È l’osso della coscia", "È un osso del cranio", "È l’osso del polpaccio"] },
  { topic: "Femore", correct: "È l’osso della coscia", wrong: ["È l’osso del braccio", "È una vertebra", "È un osso del cranio"] },
  { topic: "Tibia", correct: "È l’osso mediale della gamba", wrong: ["È l’osso laterale della gamba", "È un osso del braccio", "È un osso del torace"] },
  { topic: "Perone (fibula)", correct: "È l’osso laterale della gamba", wrong: ["È l’osso mediale della gamba", "È un osso del cranio", "È una vertebra"] },
  { topic: "Scapola", correct: "Fa parte della cintura scapolare", wrong: ["Fa parte del bacino", "Fa parte del carpo", "Fa parte del tarso"] },
  { topic: "Clavicola", correct: "Connette sterno e scapola", wrong: ["Connette femore e tibia", "Connette cranio e mandibola", "Connette radio e ulna"] },
  { topic: "Colonna cervicale", correct: "Comprende 7 vertebre", wrong: ["Comprende 5 vertebre", "Comprende 12 vertebre", "Comprende 10 vertebre"] },
  { topic: "Colonna toracica", correct: "Comprende 12 vertebre", wrong: ["Comprende 7 vertebre", "Comprende 5 vertebre", "Comprende 9 vertebre"] },
  { topic: "Colonna lombare", correct: "Comprende 5 vertebre", wrong: ["Comprende 7 vertebre", "Comprende 12 vertebre", "Comprende 3 vertebre"] },
  { topic: "Muscolo bicipite brachiale", correct: "Flette il gomito e supina l’avambraccio", wrong: ["Estende il gomito", "Abduce l’anca", "Estende il ginocchio"] },
  { topic: "Muscolo tricipite brachiale", correct: "Estende il gomito", wrong: ["Flette il gomito", "Flette il ginocchio", "Planta-flette il piede"] },
  { topic: "Quadricipite", correct: "Estende il ginocchio", wrong: ["Flette il gomito", "Estende il polso", "Abduce la spalla"] },
  { topic: "Gastrocnemio", correct: "Contribuisce alla flessione plantare", wrong: ["Dorsiflette il piede", "Estende il gomito", "Flette il polso"] },
  { topic: "Deltoide", correct: "Abduce il braccio", wrong: ["Flette il ginocchio", "Estende il gomito", "Planta-flette il piede"] },
  { topic: "Gluteo massimo", correct: "Estende l’anca", wrong: ["Flette l’anca", "Estende il gomito", "Abduce il pollice"] },
  { topic: "Nervo femorale", correct: "Innerva principalmente il quadricipite", wrong: ["Innerva i muscoli mimici", "Innerva il diaframma", "Innerva i muscoli della mano"] },
  { topic: "Nervo ischiatico", correct: "È il più grande nervo del corpo", wrong: ["È un nervo cranico", "Innerva solo la faccia", "Innerva solo la lingua"] },
  { topic: "Diaframma - innervazione", correct: "È innervato dal nervo frenico", wrong: ["Dal nervo vago", "Dal nervo ottico", "Dal nervo radiale"] },
  { topic: "Arteria coronaria", correct: "Irrora il miocardio", wrong: ["Irrora il parenchima renale", "Irrora l’intestino tenue", "Irrora la cute del cranio esclusivamente"] },
  { topic: "Arteria carotide", correct: "Apporta sangue al capo e collo", wrong: ["Apporta sangue al fegato", "Apporta sangue ai reni", "Apporta sangue ai polmoni"] },
  { topic: "Vene polmonari", correct: "Trasportano sangue ossigenato all’atrio sinistro", wrong: ["Trasportano sangue venoso all’atrio destro", "Trasportano linfa", "Trasportano bile"] },
  { topic: "Arteria renale", correct: "Origina dall’aorta addominale", wrong: ["Origina dall’arteria polmonare", "Origina dalla vena cava", "Origina dall’atrio sinistro"] },
  { topic: "Uretere", correct: "Connette rene e vescica", wrong: ["Connette vescica e uretra", "Connette fegato e colecisti", "Connette stomaco e duodeno"] },
  { topic: "Vescica", correct: "È un organo cavo che accumula urina", wrong: ["Produce bile", "Produce insulina", "È un osso"] },
  { topic: "Utero", correct: "È un organo del sistema riproduttivo femminile", wrong: ["È un organo del sistema urinario maschile", "È un osso", "È un nervo cranico"] },
  { topic: "Ovaio", correct: "Produce ovociti e ormoni sessuali", wrong: ["Produce bile", "Filtra il sangue", "Produce globuli rossi"] },
  { topic: "Testicolo", correct: "Produce spermatozoi e testosterone", wrong: ["Produce bile", "Filtra urina", "Produce insulina"] },
  { topic: "Milza", correct: "È coinvolta nella risposta immunitaria e filtrazione del sangue", wrong: ["Produce urina", "Produce bile", "È una ghiandola endocrina tiroidea"] },
  { topic: "Linfonodi", correct: "Filtrano la linfa", wrong: ["Filtrano la bile", "Filtrano l’aria negli alveoli", "Filtrano l’urina nel glomerulo"] },
  { topic: "Cute", correct: "È l’organo più esteso del corpo", wrong: ["È un osso", "È un nervo", "È una valvola cardiaca"] },
  { topic: "Retina", correct: "È lo strato sensoriale dell’occhio", wrong: ["È una valvola cardiaca", "È un osso", "È una parte del rene"] },
  { topic: "Coclea", correct: "È parte dell’orecchio interno", wrong: ["È parte del fegato", "È parte del cuore", "È parte del rene"] },
  { topic: "Ipofisi", correct: "È una ghiandola endocrina alla base del cervello", wrong: ["È un osso del bacino", "È un muscolo del braccio", "È un lobo del polmone"] },
  { topic: "Tiroide", correct: "Produce ormoni tiroidei T3/T4", wrong: ["Produce adrenalina", "Produce insulina", "Produce bile"] },
  { topic: "Paratiroidi", correct: "Regolano il calcio tramite PTH", wrong: ["Regolano il sodio tramite aldosterone", "Regolano il glucosio tramite insulina", "Regolano la coagulazione tramite fibrina"] },
  { topic: "Apofisi xifoide", correct: "È la porzione inferiore dello sterno", wrong: ["È un osso del cranio", "È un legamento del ginocchio", "È una parte dell’ulna"] },
];

function buildQuestions(subjectLabel: string, prefix: string): QuizQuestion[] {
  const out: QuizQuestion[] = [];
  const variants = [
    "Qual è l'affermazione corretta su {topic}?",
    "In ambito {subject}, {topic} è associato a:",
    "Quale delle seguenti descrive meglio {topic}?",
    "La caratteristica principale di {topic} è:",
    "Seleziona l'opzione corretta riguardo {topic}:",
    "{topic}: quale risposta è corretta?",
    "In {subject}, quale è vera su {topic}?",
    "Tra le seguenti, quale è corretta per {topic}?",
    "Domanda di {subject}: {topic} riguarda:",
  ] as const;
  for (let fi = 0; fi < FACTS.length; fi++) {
    const f = FACTS[fi];
    for (let vi = 0; vi < variants.length; vi++) {
      const qText = `[${subjectLabel}] ` + variants[vi].replaceAll("{topic}", f.topic).replaceAll("{subject}", subjectLabel);
      const pos = (fi + vi) % 4;
      const opts = [f.wrong[0], f.wrong[1], f.wrong[2], f.correct];
      // place correct at pos
      const options = [opts[0], opts[1], opts[2], opts[3]];
      const correctVal = f.correct;
      // rotate until correct at pos
      while (options[pos] !== correctVal) {
        const x = options.pop();
        if (x) options.unshift(x);
      }
      const answer = options.indexOf(correctVal);
      const idNum = (fi * variants.length + vi + 1).toString().padStart(4, "0");
      out.push({ id: `${prefix}${idNum}`, q: qText, options, answer });
    }
  }
  return out.slice(0, 500);
}

export const QUIZ_BANK_ANATOMY_EXTRA: QuizQuestion[] = buildQuestions("Anatomia", "uni_an_");
