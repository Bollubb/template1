import type { QuizQuestion } from "@/features/cards/quiz/quizBank";
// Extra university bank: domande generate (non placeholder). 64 temi x 9 varianti -> 576 (slice 500)
const FACTS: Array<{ topic: string; correct: string; wrong: [string,string,string] }> = [
  { topic: "Paracetamolo", correct: "È analgesico e antipiretico con scarsa attività antinfiammatoria periferica", wrong: ["È un FANS con forte attività antiaggregante", "È un anticoagulante diretto (DOAC)", "È un corticosteroide sistemico"] },
  { topic: "Ibuprofene", correct: "È un FANS che inibisce COX-1/COX-2 in modo reversibile", wrong: ["È un antibiotico beta-lattamico", "È un broncodilatatore beta2 selettivo", "È un inibitore della pompa protonica"] },
  { topic: "Aspirina (ASA)", correct: "Inibisce in modo irreversibile COX-1 nelle piastrine (effetto antiaggregante)", wrong: ["Blocca i recettori P2Y12", "Attiva l’antitrombina III", "Inibisce direttamente la trombina"] },
  { topic: "Warfarin", correct: "Antagonista della vitamina K (riduce fattori II, VII, IX, X)", wrong: ["Inibitore diretto del fattore Xa", "Attivatore del plasminogeno tissutale", "Inibitore dell’aggregazione piastrinica P2Y12"] },
  { topic: "Eparina non frazionata", correct: "Potenzia l’antitrombina III (inibisce trombina e Xa)", wrong: ["Inibisce la sintesi di vitamina K", "È un DOAC anti-Xa orale", "È un antiaggregante COX-inibitore"] },
  { topic: "Enoxaparina", correct: "È una eparina a basso peso con prevalente attività anti-Xa", wrong: ["È un trombolitico", "È un antagonista della vitamina K", "È un antiaggregante P2Y12"] },
  { topic: "Clopidogrel", correct: "È un antiaggregante che blocca il recettore piastrinico P2Y12", wrong: ["Inibisce COX irreversibilmente", "È un anticoagulante anti-Xa", "È un fibrinolitico"] },
  { topic: "Metformina", correct: "Riduce la gluconeogenesi epatica e migliora la sensibilità insulinica", wrong: ["Stimola la secrezione di insulina come sulfanilurea", "È un agonista GLP-1 iniettivo", "È un inibitore SGLT2 renale"] },
  { topic: "Insulina", correct: "Favorisce l’ingresso di glucosio nelle cellule e riduce la glicemia", wrong: ["Aumenta la glicemia stimolando gluconeogenesi", "Inibisce il rilascio di insulina pancreatica", "Riduce l’assorbimento intestinale di carboidrati come acarbosio"] },
  { topic: "Sulfaniluree", correct: "Stimolano la secrezione di insulina chiudendo canali KATP", wrong: ["Inibiscono SGLT2 renale", "Aumentano l’escrezione biliare di colesterolo", "Bloccano i recettori beta adrenergici"] },
  { topic: "ACE-inibitori", correct: "Possono causare tosse secca per aumento di bradichinina", wrong: ["Causano broncospasmo per blocco beta2", "Aumentano la frequenza cardiaca per riflesso", "Provocano ipokaliemia marcata"] },
  { topic: "Sartani (ARB)", correct: "Bloccano il recettore AT1 dell’angiotensina II", wrong: ["Inibiscono l’enzima di conversione ACE", "Aumentano la renina riducendola", "Bloccano i canali del calcio L-type"] },
  { topic: "Beta-bloccanti", correct: "Riduzione di frequenza e contrattilità cardiaca (effetto cronotropo/inotropo -)", wrong: ["Vasodilatazione diretta nitrica", "Aumento del rilascio di renina", "Stimolazione beta2 bronchiale"] },
  { topic: "Calcio-antagonisti diidropiridinici", correct: "Prevalente vasodilatazione arteriosa (es. amlodipina)", wrong: ["Prevalente effetto inotropo positivo", "Inibizione irreversibile COX", "Blocco recettori muscarinici"] },
  { topic: "Verapamil/Diltiazem", correct: "Effetto su cuore: riducono conduzione AV e frequenza", wrong: ["Aumentano la frequenza cardiaca", "Sono agonisti beta2", "Sono diuretici dell’ansa"] },
  { topic: "Furosemide", correct: "Diuretico dell’ansa: inibisce NKCC2 nel tratto ascendente spesso", wrong: ["Diuretico tiazidico sul tubulo distale", "Diuretico osmotico (mannitolo)", "Risparmiatore di potassio antagonista aldosterone"] },
  { topic: "Tiazidici", correct: "Inibiscono il cotrasportatore NaCl nel tubulo distale", wrong: ["Inibiscono NKCC2", "Bloccano SGLT2", "Stimolano recettori beta1"] },
  { topic: "Spironolattone", correct: "Antagonista dell’aldosterone: risparmia potassio", wrong: ["Aumenta l’escrezione di potassio", "È un diuretico dell’ansa", "È un inibitore ACE"] },
  { topic: "Nitroglicerina", correct: "Vasodilatazione (soprattutto venosa) con riduzione del precarico", wrong: ["Aumento del precarico", "Aumento delle resistenze periferiche", "Blocco recettori AT1"] },
  { topic: "Morfina", correct: "Oppioide agonista µ: analgesia e possibile depressione respiratoria", wrong: ["Antagonista oppioide", "Anticonvulsivante bloccante Na+", "Antibiotico macrolide"] },
  { topic: "Naloxone", correct: "Antagonista oppioide usato per overdose da oppioidi", wrong: ["Agonista oppioide", "Benzodiazepina antidoto", "Antidoto per intossicazione da paracetamolo"] },
  { topic: "Benzodiazepine", correct: "Potenziano GABA-A aumentando la frequenza di apertura del canale Cl−", wrong: ["Bloccano i recettori NMDA", "Inibiscono COX", "Aumentano la durata apertura GABA-A (barbiturici)"] },
  { topic: "Antibiotici beta-lattamici", correct: "Inibiscono la sintesi della parete batterica (legano PBP)", wrong: ["Inibiscono la sintesi proteica 30S", "Inibiscono la DNA-girasi", "Inibiscono la RNA-polimerasi"] },
  { topic: "Macrolidi", correct: "Inibiscono la sintesi proteica legando la subunità 50S", wrong: ["Inibiscono 30S", "Inibiscono folato (DHFR)", "Inibiscono la parete (PBP)"] },
  { topic: "Aminoglicosidi", correct: "Inibiscono 30S e possono essere nefro/ototossici", wrong: ["Inibiscono 50S e causano trombocitopenia", "Inibiscono COX e causano ulcera", "Antagonizzano vitamina K"] },
  { topic: "Fluorochinoloni", correct: "Inibiscono DNA-girasi/topoisomerasi", wrong: ["Inibiscono PBP", "Inibiscono 50S", "Inibiscono DHFR"] },
  { topic: "Vancomicina", correct: "Glicopeptide: inibisce sintesi parete legando D-Ala-D-Ala", wrong: ["Inibisce DNA-girasi", "Inibisce 30S", "Blocca recettori P2Y12"] },
  { topic: "IPPs (omeprazolo)", correct: "Inibiscono la pompa protonica H+/K+ ATPasi", wrong: ["Bloccano recettori H1", "Neutralizzano CO2", "Inibiscono COX"] },
  { topic: "Antistaminici H1", correct: "Riduzione sintomi allergici mediati da istamina (prurito, rinorrea)", wrong: ["Inibizione pompa protonica", "Antagonismo vitamina K", "Stimolo beta1"] },
  { topic: "Salbutamolo", correct: "Agonista beta2: broncodilatazione", wrong: ["Antagonista beta2", "Agonista muscarinico", "Inibitore ACE"] },
  { topic: "Ipratropio", correct: "Antagonista muscarinico: broncodilatazione", wrong: ["Agonista beta2", "Corticosteroide sistemico", "Anticoagulante diretto"] },
  { topic: "Corticosteroidi", correct: "Effetto antiinfiammatorio/immunosoppressivo (es. prednisone)", wrong: ["Effetto trombolitico", "Effetto antiaggregante P2Y12", "Effetto diuretico dell’ansa"] },
  { topic: "Adrenalina", correct: "Agonista alfa/beta: aumenta FC e vasocostrizione (uso anafilassi)", wrong: ["Antagonista beta selettivo", "Inibitore ACE", "Anticoagulante orale"] },
  { topic: "Atropina", correct: "Antagonista muscarinico: aumenta frequenza cardiaca", wrong: ["Agonista muscarinico", "Blocco beta1 selettivo", "Inibitore recettore AT1"] },
  { topic: "Amiodarone", correct: "Anti-aritmico: prolunga il potenziale d’azione (classe III) con più effetti", wrong: ["Diuretico tiazidico", "Agonista beta2", "Antibiotico beta-lattamico"] },
  { topic: "Digossina", correct: "Aumenta inotropismo inibendo Na+/K+ ATPasi", wrong: ["Inibisce COX", "Blocca canali del calcio", "Antagonizza vitamina K"] },
  { topic: "Statine", correct: "Inibiscono HMG-CoA reduttasi: riducono LDL", wrong: ["Aumentano sintesi di colesterolo", "Inibiscono DNA-girasi", "Antagonizzano recettori H1"] },
  { topic: "Ezetimibe", correct: "Riduce assorbimento intestinale di colesterolo (NPC1L1)", wrong: ["Inibisce HMG-CoA reduttasi", "Aumenta secrezione biliare di acidi", "Inibisce la trombina"] },
  { topic: "Nitrofurantoina", correct: "Antibiotico usato spesso per IVU non complicate", wrong: ["Antimicotico azolico", "Antivirale anti-HIV integrasi", "Anticoagulante"] },
  { topic: "Rifampicina", correct: "Inibisce RNA-polimerasi batterica", wrong: ["Inibisce DNA-girasi", "Inibisce sintesi folati DHFR", "Inibisce PBP"] },
  { topic: "Isoniazide", correct: "Antitubercolare: inibisce sintesi acidi micolici", wrong: ["Inibisce 50S", "Inibisce COX", "Blocca AT1"] },
  { topic: "Anticoagulanti DOAC anti-Xa", correct: "Esempio: rivaroxaban/apixaban (inibizione fattore Xa)", wrong: ["Antagonisti vitamina K", "Antiaggreganti COX", "Trombolitici"] },
  { topic: "Trombolitici (alteplase)", correct: "Attivano plasminogeno → plasmina (lisi del trombo)", wrong: ["Inibiscono P2Y12", "Potenziano antitrombina III", "Inibiscono vitamina K"] },
  { topic: "N-acetilcisteina", correct: "Antidoto nell’intossicazione da paracetamolo", wrong: ["Antidoto per oppioidi", "Antidoto per benzodiazepine", "Antidoto per eparina"] },
  { topic: "Flumazenil", correct: "Antagonista benzodiazepine (GABA-A)", wrong: ["Antagonista oppioide", "Chelante metalli", "Antidoto per paracetamolo"] },
  { topic: "Protamina", correct: "Antidoto per eparina", wrong: ["Antidoto per warfarin", "Antidoto per ASA", "Antidoto per DOAC"] },
  { topic: "Vitamina K", correct: "Antidoto per warfarin (in parte)", wrong: ["Antidoto per eparina", "Antidoto per oppioidi", "Antidoto per paracetamolo"] },
  { topic: "Levotiroxina", correct: "Ormonoterapia sostitutiva T4 nell’ipotiroidismo", wrong: ["Antitiroideo (metimazolo)", "Corticosteroide", "Beta2 agonista"] },
  { topic: "Metimazolo", correct: "Antitiroideo: inibisce perossidasi tiroidea", wrong: ["Aumenta la sintesi di T3/T4", "Agonista GLP-1", "Inibitore SGLT2"] },
  { topic: "Allopurinolo", correct: "Inibisce xantina ossidasi (iperuricemia/gotta)", wrong: ["Stimola xantina ossidasi", "Inibisce COX", "Antagonizza vitamina K"] },
  { topic: "Colchicina", correct: "Usata nella gotta: inibisce microtubuli e chemiotassi neutrofili", wrong: ["Inibisce HMG-CoA reduttasi", "Agonista beta2", "Inibisce ACE"] },
  { topic: "FANS", correct: "Possono aumentare rischio di gastrolesività/ulcera", wrong: ["Riduzione secrezione gastrica acida come IPP", "Azione trombolitica", "Riduzione LDL come statine"] },
  { topic: "Antipsicotici tipici", correct: "Antagonismo D2 con rischio di effetti extrapiramidali", wrong: ["Agonismo D2", "Antagonismo HMG-CoA reduttasi", "Inibizione PBP"] },
  { topic: "SSRI", correct: "Inibiscono la ricaptazione della serotonina", wrong: ["Inibiscono la ricaptazione di dopamina esclusiva", "Bloccano recettori NMDA", "Inibiscono COX"] },
  { topic: "Furosemide - elettroliti", correct: "Può causare ipokaliemia", wrong: ["Iperkaliemia", "Ipercalcemia", "Acidosi metabolica severa sempre"] },
  { topic: "Spironolattone - elettroliti", correct: "Può causare iperkaliemia", wrong: ["Ipokaliemia", "Ipernatriemia marcata", "Ipercalciuria"] },
  { topic: "Tetracicline", correct: "Possono dare fotosensibilità e chelano con Ca2+", wrong: ["Sono beta-lattamici", "Inibiscono RNA polimerasi", "Sono antagonisti vitamina K"] },
  { topic: "Antidolorifici oppioidi", correct: "Possono causare stipsi", wrong: ["Causano diarrea sempre", "Aumentano motilità intestinale", "Inibiscono COX"] },
  { topic: "Inibitori MAO", correct: "Rischio crisi ipertensiva con tiramina", wrong: ["Riduzione pressione con tiramina", "Nessuna interazione alimentare", "Antagonismo P2Y12"] },
  { topic: "Calcio-antagonisti", correct: "Possibile edema periferico (soprattutto diidropiridinici)", wrong: ["Iperventilazione", "Aumento della diuresi osmotica", "Urticaria sempre"] },
  { topic: "Aminoglicosidi - tossicità", correct: "Rischio nefro- e ototossicità", wrong: ["Rischio epatotossicità esclusiva", "Rischio ipoglicemia severa", "Rischio pancreatite tipica"] },
  { topic: "Beta-agonisti", correct: "Possono causare tremore e tachicardia", wrong: ["Bradicardia marcata", "Sedazione profonda tipica", "Ulcera gastrica diretta"] },
  { topic: "Anticolinergici", correct: "Possono causare secchezza delle mucose", wrong: ["Iper-salivazione", "Bradicardia sempre", "Miosi marcata"] },
  { topic: "Glucocorticoidi", correct: "Uso prolungato: rischio iperglicemia e osteoporosi", wrong: ["Riduzione glicemia sempre", "Aumento massa ossea", "Effetto trombolitico"] },
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

export const QUIZ_BANK_PHARMACOLOGY_EXTRA: QuizQuestion[] = buildQuestions("Farmacologia", "uni_ph_");
