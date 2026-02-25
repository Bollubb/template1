import type { QuizQuestion } from "@/features/cards/quiz/quizBank";
// Extra university bank: domande generate (non placeholder). 60 temi x 9 varianti -> 540 (slice 500)
const FACTS: Array<{ topic: string; correct: string; wrong: [string,string,string] }> = [
  { topic: "ADH (vasopressina)", correct: "Aumenta il riassorbimento di acqua nei dotti collettori", wrong: ["Aumenta l’escrezione di acqua", "Riduce il riassorbimento di sodio nel tubulo prossimale", "Inibisce la secrezione di insulina"] },
  { topic: "Aldosterone", correct: "Aumenta riassorbimento di sodio e secrezione di potassio nel tubulo distale", wrong: ["Riduce il riassorbimento di sodio", "Aumenta la diuresi osmotica", "Inibisce la secrezione di renina"] },
  { topic: "Insulina", correct: "Riduce la glicemia favorendo uptake e deposito di glucosio", wrong: ["Aumenta la glicemia", "Inibisce la glicogenosintesi", "Aumenta la lipolisi sempre"] },
  { topic: "Glucagone", correct: "Aumenta la glicemia stimolando glicogenolisi e gluconeogenesi", wrong: ["Riduce la glicemia", "Inibisce la glicogenolisi", "Aumenta l’uptake periferico di glucosio"] },
  { topic: "Ormoni tiroidei", correct: "Aumentano il metabolismo basale", wrong: ["Riduccono il metabolismo basale", "Aumentano solo la coagulazione", "Inibiscono la termogenesi"] },
  { topic: "PTH", correct: "Aumenta la calcemia (mobilizzazione ossea e riassorbimento renale)", wrong: ["Riduce la calcemia", "Aumenta la fosfatemia renale", "Inibisce vitamina D"] },
  { topic: "Vitamina D attiva", correct: "Aumenta l’assorbimento intestinale di calcio e fosfato", wrong: ["Riduce assorbimento di calcio", "Inibisce la mineralizzazione ossea", "Blocca la filtrazione glomerulare"] },
  { topic: "Cortisolo", correct: "È un glucocorticoide con effetti su stress e metabolismo", wrong: ["È un mineralcorticoide puro", "È un neurotrasmettitore", "È un enzima digestivo"] },
  { topic: "Renina", correct: "Avvia il sistema RAAS scindendo angiotensinogeno", wrong: ["Inibisce RAAS", "Riduce angiotensina II direttamente", "Aumenta ADH indipendentemente"] },
  { topic: "Angiotensina II", correct: "Causa vasocostrizione e stimola aldosterone", wrong: ["Causa vasodilatazione", "Inibisce aldosterone", "Riduce la pressione arteriosa"] },
  { topic: "GFR (filtrazione glomerulare)", correct: "Dipende dalla pressione di filtrazione e dalla permeabilità", wrong: ["È indipendente dalle pressioni", "È uguale alla diuresi", "È sempre zero a riposo"] },
  { topic: "Tubulo prossimale", correct: "Riassorbe la maggior parte di Na+ e acqua filtrati", wrong: ["Non riassorbe acqua", "È sede principale di secrezione di ADH", "Produce bile"] },
  { topic: "Ansa di Henle", correct: "Crea gradiente osmotico midollare", wrong: ["Elimina il gradiente osmotico", "È sede di filtrazione glomerulare", "È un dotto escretore biliare"] },
  { topic: "Dotto collettore", correct: "Modula riassorbimento di acqua in risposta ad ADH", wrong: ["È indipendente da ADH", "È sede principale di secrezione di renina", "Produce eritropoietina"] },
  { topic: "Eritropoietina", correct: "Stimola eritropoiesi nel midollo osseo", wrong: ["Inibisce eritropoiesi", "Stimola piastrinopoiesi esclusiva", "Stimola la digestione lipidica"] },
  { topic: "Emoglobina", correct: "Trasporta ossigeno legandolo in modo reversibile", wrong: ["Trasporta bile", "Trasporta glucosio", "Trasporta sodio nei tubuli"] },
  { topic: "Curva Hb - effetto Bohr", correct: "Aumento CO2/H+ sposta curva a destra (rilascio O2)", wrong: ["Sposta curva a sinistra sempre", "Riduce rilascio di O2 nei tessuti", "Blocca la ventilazione"] },
  { topic: "Ventilazione", correct: "È il movimento d’aria dentro/fuori dai polmoni", wrong: ["È perfusione tissutale", "È diffusione glomerulare", "È pressione arteriosa"] },
  { topic: "Diffusione alveolo-capillare", correct: "Dipende da gradiente di pressione parziale e superficie", wrong: ["È indipendente dal gradiente", "Avviene solo nel bronco", "Avviene solo nella trachea"] },
  { topic: "Surfactant", correct: "Riduce la tensione superficiale alveolare", wrong: ["Aumenta la tensione superficiale", "Riduce la compliance polmonare", "Blocca gli scambi gassosi"] },
  { topic: "pH ematico", correct: "È regolato da sistemi tampone, polmoni e reni", wrong: ["È regolato solo dai reni", "È regolato solo dai polmoni", "È regolato solo dal fegato"] },
  { topic: "Tampone bicarbonato", correct: "È il principale tampone extracellulare", wrong: ["È il principale tampone intracellulare", "Non esiste nell’uomo", "È un ormone"] },
  { topic: "Acidosi metabolica", correct: "Tipicamente riduce HCO3- e può aumentare ventilazione compensatoria", wrong: ["Aumenta HCO3- sempre", "Riduce ventilazione", "Non ha compensi"] },
  { topic: "Alcalosi respiratoria", correct: "Tipicamente da iperventilazione con riduzione PaCO2", wrong: ["Da ipoventilazione con aumento PaCO2", "Da insufficienza renale", "Da aumento lattato"] },
  { topic: "Pressione arteriosa", correct: "Dipende da gittata cardiaca e resistenze periferiche", wrong: ["Dipende solo dalla frequenza cardiaca", "Dipende solo dal volume polmonare", "Dipende solo dalla glicemia"] },
  { topic: "Gittata cardiaca", correct: "È frequenza cardiaca x gittata sistolica", wrong: ["È PaO2 x PaCO2", "È pH x bicarbonato", "È volume residuo x capacità vitale"] },
  { topic: "Precarico", correct: "È legato al riempimento ventricolare/volume telediastolico", wrong: ["È la pressione aortica sistolica", "È la resistenza periferica", "È la frequenza respiratoria"] },
  { topic: "Postcarico", correct: "È legato alla resistenza contro cui il cuore pompa", wrong: ["È uguale al precarico", "È il volume telediastolico", "È la saturazione di O2"] },
  { topic: "Nodo senoatriale", correct: "È il pacemaker fisiologico del cuore", wrong: ["È una valvola cardiaca", "È un muscolo scheletrico", "È un vaso linfatico"] },
  { topic: "Sistema di conduzione", correct: "Include nodo AV e fascio di His", wrong: ["Include solo polmoni", "Include solo reni", "Include solo fegato"] },
  { topic: "Sistema simpatico", correct: "Aumenta frequenza cardiaca e contrattilità", wrong: ["Riduce frequenza cardiaca sempre", "Inibisce il rilascio di adrenalina", "Aumenta solo la diuresi"] },
  { topic: "Sistema parasimpatico", correct: "Riduce la frequenza cardiaca (vago)", wrong: ["Aumenta sempre la frequenza cardiaca", "Aumenta la pressione sempre", "Blocca la digestione"] },
  { topic: "Potenziale d’azione neurale", correct: "Dipende da canali del Na+ voltaggio-dipendenti", wrong: ["Dipende da emoglobina", "Dipende da pompe protoniche gastriche", "Dipende da bile"] },
  { topic: "Sinapsi chimica", correct: "Usa neurotrasmettitori per trasmettere il segnale", wrong: ["Trasmette solo tramite elettroni liberi", "Trasmette solo tramite sangue", "Non usa recettori"] },
  { topic: "Acetilcolina", correct: "È un neurotrasmettitore del parasimpatico e della giunzione neuromuscolare", wrong: ["È un ormone tiroideo", "È un enzima digestivo", "È un anticoagulante"] },
  { topic: "Dopamina", correct: "È un neurotrasmettitore coinvolto in movimento e ricompensa", wrong: ["È un elettrolita", "È una vitamina", "È un anticorpo"] },
  { topic: "Serotonina", correct: "È coinvolta in umore e regolazione del sonno", wrong: ["È un enzima pancreatico", "È un minerale osseo", "È un gas respiratorio"] },
  { topic: "Osmolarità plasmatica", correct: "Influenza secrezione di ADH e sete", wrong: ["È indipendente da ADH", "Influenza solo la bile", "Regola solo la coagulazione"] },
  { topic: "Temperatura corporea", correct: "È regolata dall’ipotalamo", wrong: ["È regolata dal rene", "È regolata dall’uretere", "È regolata dalla retina"] },
  { topic: "Motilità intestinale", correct: "È modulata dal sistema nervoso enterico e autonomo", wrong: ["È indipendente dal sistema nervoso", "È regolata solo dai polmoni", "È regolata solo dai reni"] },
  { topic: "Assorbimento intestinale", correct: "Avviene principalmente nell’intestino tenue", wrong: ["Avviene principalmente nel colon", "Avviene nello stomaco esclusivamente", "Avviene nei bronchi"] },
  { topic: "Bile", correct: "Favorisce emulsione e assorbimento dei grassi", wrong: ["Favorisce assorbimento dell’ossigeno", "È un ormone tiroideo", "È un enzima della coagulazione"] },
  { topic: "Secrezione gastrica", correct: "Include acido cloridrico prodotto dalle cellule parietali", wrong: ["Prodotta dalle piastrine", "Prodotta dagli alveoli", "Prodotta dai glomeruli"] },
  { topic: "Pancreas endocrino", correct: "Secreta insulina e glucagone", wrong: ["Secreta solo bile", "Secreta solo pepsina", "Secreta solo renina"] },
  { topic: "Regolazione glicemica", correct: "Insulina abbassa e glucagone alza la glicemia", wrong: ["Entrambi abbassano la glicemia", "Entrambi alzano la glicemia", "Nessuno influenza la glicemia"] },
  { topic: "Contrazione muscolare", correct: "Dipende da interazione actina-miosina e Ca2+", wrong: ["Dipende da bile", "Dipende da urea", "Dipende da CO2 esclusivamente"] },
  { topic: "Potenziale di membrana a riposo", correct: "È mantenuto da gradienti ionici e pompa Na+/K+", wrong: ["È mantenuto solo da emoglobina", "È mantenuto solo da insulina", "È mantenuto solo da pressione arteriosa"] },
  { topic: "Emostasi primaria", correct: "Coinvolge piastrine e formazione del tappo piastrinico", wrong: ["Coinvolge solo eritrociti", "Coinvolge solo reni", "Coinvolge solo polmoni"] },
  { topic: "Coagulazione", correct: "Coinvolge cascata che porta a fibrina", wrong: ["Porta a glucosio", "Porta a bile", "Porta a ossigeno"] },
  { topic: "Fibrinolisi", correct: "È la degradazione della fibrina (plasmina)", wrong: ["È la formazione della fibrina", "È la filtrazione renale", "È la ventilazione alveolare"] },
  { topic: "Sistema linfatico", correct: "Drena liquidi interstiziali e partecipa all’immunità", wrong: ["Produce urina", "Produce bile", "Produce aria"] },
  { topic: "Risposta infiammatoria", correct: "Può causare vasodilatazione e aumento permeabilità", wrong: ["Causa sempre vasocostrizione", "Non coinvolge mediatori", "È uguale alla ventilazione"] },
  { topic: "Febbre", correct: "È mediata da pirogeni e set point ipotalamico", wrong: ["È causata solo da iperventilazione", "È causata solo da ipoglicemia", "È sempre assente in infezioni"] },
  { topic: "Saturazione O2", correct: "Dipende da PaO2 e curva Hb", wrong: ["Dipende solo da PaCO2", "Dipende solo da glicemia", "Dipende solo da pressione venosa"] },
  { topic: "Equilibrio acido-base", correct: "I reni regolano H+ e HCO3-", wrong: ["I reni regolano solo O2", "I reni regolano solo bile", "I reni regolano solo glucosio"] },
  { topic: "Omeostasi", correct: "È la capacità di mantenere condizioni interne stabili", wrong: ["È un tipo di tessuto", "È un osso", "È una valvola"] },
  { topic: "Feedback negativo", correct: "Riduce una variazione riportando il sistema al set point", wrong: ["Amplifica sempre la variazione", "Non esiste in fisiologia", "È un tipo di neurone"] },
  { topic: "Capacità vitale", correct: "È il volume massimo espirabile dopo inspirazione massimale", wrong: ["È il volume residuo dopo espirazione massimale", "È la gittata cardiaca", "È la pressione arteriosa media"] },
  { topic: "VO2", correct: "Rappresenta il consumo di ossigeno dell’organismo", wrong: ["Rappresenta la produzione di bile", "Rappresenta la filtrazione glomerulare", "Rappresenta la glicemia capillare"] },
  { topic: "Lattato", correct: "Può aumentare in ipoperfusione/anaerobiosi", wrong: ["Aumenta solo in iperventilazione", "È sempre basso in shock", "Non cambia mai con l’esercizio"] },
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

export const QUIZ_BANK_PHYSIOLOGY_EXTRA: QuizQuestion[] = buildQuestions("Fisiologia", "uni_fi_");
